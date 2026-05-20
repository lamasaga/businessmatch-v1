"""交易游戏路由 - 回合决策、价格计算、游戏状态"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any

from app.db.database import get_db
from app.models.user import User
from app.domains.arena.enums import MatchKind, MatchStatus, ParticipantStatus
from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.games.trading import (
    TradingRound,
    TradingDecision,
    TradingPrice,
    RoundStatus,
    ActionType,
    PRODUCTS,
    CITIES,
)
from app.games.trading.engine import cities_meta_for, get_products_dict, load_world
from app.games.trading.market import get_pricing_config, strip_price_snapshot
from app.games.trading.practice_flow import try_advance_practice_round, settle_practice_if_finished
from app.games.trading.round_advance import advance_to_next_round
from app.games.trading.inventory import product_inventory_limit, inventory_capacity_hint

EventStatus = MatchStatus
CompetitionEvent = ArenaMatch
CompetitionParticipant = ArenaParticipant
from app.schemas.trading_competition import (
    DecisionRequest, DecisionOut, GameState, TradingRoundOut, TradingRoundResult,
    CityMarket, ProductPrice, PlayerInventoryItem, StandingsEntry,
    SubmitDecisionResult, MarketInsight, InventoryCapacity,
)
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.core.dependencies import get_current_active_user

router = APIRouter(prefix="/trading", tags=["交易游戏"])


@router.get("/events/{event_id}/state", response_model=ApiResponse[GameState])
def get_game_state(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取当前游戏状态"""
    event = db.query(CompetitionEvent).filter(CompetitionEvent.id == event_id).first()
    if not event:
        raise BusinessException(
            message="比赛不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    participant = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.event_id == event_id,
        CompetitionParticipant.user_id == current_user.id,
    ).first()

    if not participant:
        raise BusinessException(
            message="您未参加这场比赛",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    # 获取当前回合
    current_round = db.query(TradingRound).filter(
        TradingRound.event_id == event_id,
    ).order_by(TradingRound.round_number.desc()).first()

    # 练习局自愈：真人已提交但 AI 未齐时补全并推进
    if (
        event.match_kind == MatchKind.practice
        and current_round
        and current_round.status == RoundStatus.active
    ):
        human_decided = db.query(TradingDecision).filter(
            TradingDecision.round_id == current_round.id,
            TradingDecision.participant_id == participant.id,
        ).first()
        if human_decided:
            advanced, _ = try_advance_practice_round(db, event, current_round)
            if advanced:
                db.commit()
                current_round = db.query(TradingRound).filter(
                    TradingRound.event_id == event_id,
                ).order_by(TradingRound.round_number.desc()).first()
                db.refresh(participant)
                db.refresh(event)

    has_submitted = False
    can_submit = False
    if current_round:
        has_submitted = db.query(TradingDecision).filter(
            TradingDecision.round_id == current_round.id,
            TradingDecision.participant_id == participant.id,
        ).first() is not None
        can_submit = (
            event.status == MatchStatus.playing
            and current_round.status == RoundStatus.active
            and not has_submitted
        )

    inv_capacity = inventory_capacity_hint(participant.inventory, event.config)
    markets = _build_markets(event_id, current_round, db)

    # 构建库存
    inventory = _build_inventory(participant, current_round, db)

    # 排行榜
    standings = _get_standings(event_id, db)

    config_id = event.game_config_id or "trading-v1"
    pricing = get_pricing_config(config_id)
    market_insights = _build_market_insights(current_round, event, db)

    from app.api.competitions import _event_to_out, _participant_to_out

    return ApiResponse.ok(data=GameState(
        event=_event_to_out(event, db),
        participant=_participant_to_out(participant, db),
        current_round=_round_to_out(current_round) if current_round else None,
        markets=markets,
        inventory=inventory,
        standings=standings,
        time_remaining=None,
        is_practice=event.match_kind == MatchKind.practice,
        pricing_mode=pricing.get("mode", "market"),
        market_insights=market_insights,
        has_submitted_this_round=has_submitted,
        can_submit_decision=can_submit,
        inventory_capacity=InventoryCapacity(**inv_capacity),
    ))


@router.post("/rounds/{round_id}/decide", response_model=ApiResponse[SubmitDecisionResult])
def submit_decision(
    round_id: int,
    data: DecisionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """提交交易决策"""
    round_obj = db.query(TradingRound).filter(TradingRound.id == round_id).first()
    if not round_obj:
        raise BusinessException(
            message="回合不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    if round_obj.status != RoundStatus.active:
        raise BusinessException(
            message="回合不在进行中，无法提交决策",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    latest_round = (
        db.query(TradingRound)
        .filter(TradingRound.event_id == round_obj.event_id)
        .order_by(TradingRound.round_number.desc())
        .first()
    )
    if not latest_round or latest_round.id != round_id:
        raise BusinessException(
            message="本回合已结束，请刷新页面后继续",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    event = db.query(ArenaMatch).filter(ArenaMatch.id == round_obj.event_id).first()
    if not event or event.status != MatchStatus.playing:
        raise BusinessException(
            message="比赛未在进行中",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    participant = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.event_id == round_obj.event_id,
        CompetitionParticipant.user_id == current_user.id,
    ).first()

    if not participant:
        raise BusinessException(
            message="您未参加这场比赛",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    # 检查是否已经提交过
    existing = db.query(TradingDecision).filter(
        TradingDecision.round_id == round_id,
        TradingDecision.participant_id == participant.id,
    ).first()
    if existing:
        raise BusinessException(
            message="您已经提交了本回合的决策",
            code=ErrorCode.DUPLICATE_ENTRY,
            status_code=status.HTTP_409_CONFLICT,
        )

    # 获取当前价格
    prices = round_obj.price_snapshot or {}
    current_city = participant.current_city
    city_prices = prices.get(current_city, {})

    config = event.config or {}
    product_limit = product_inventory_limit(config)
    move_cost = config.get("move_cost", 1000)

    action_type = data.action_type.lower()
    action_data = data.action_data or {}
    cash_after = participant.cash
    inventory_after = dict(participant.inventory or {})

    # 验证并执行决策
    if action_type == "buy":
        product_id = action_data.get("product_id")
        quantity = action_data.get("quantity", 0)

        if product_id not in city_prices:
            raise BusinessException(
                message="该商品在当前城市不可用",
                code=ErrorCode.BAD_REQUEST,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        price = city_prices[product_id]
        total_cost = price * quantity

        if total_cost > participant.cash:
            raise BusinessException(
                message="现金不足",
                code=ErrorCode.BAD_REQUEST,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        current_product_qty = int(inventory_after.get(product_id, 0))
        if current_product_qty + quantity > product_limit:
            prod_name = PRODUCTS.get(product_id, {}).get("name", product_id)
            raise BusinessException(
                message=f"「{prod_name}」单品种上限为{product_limit}件，当前持有{current_product_qty}件",
                code=ErrorCode.BAD_REQUEST,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        cash_after -= total_cost
        inventory_after[product_id] = inventory_after.get(product_id, 0) + quantity
        action_data["price"] = price
        action_data["total_cost"] = total_cost
        action_data["trade_city"] = current_city

    elif action_type == "sell":
        product_id = action_data.get("product_id")
        quantity = action_data.get("quantity", 0)

        if product_id not in city_prices:
            raise BusinessException(
                message="该商品在当前城市不可用",
                code=ErrorCode.BAD_REQUEST,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        current_qty = inventory_after.get(product_id, 0)
        if quantity > current_qty:
            raise BusinessException(
                message="库存不足",
                code=ErrorCode.BAD_REQUEST,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        price = city_prices[product_id]
        total_revenue = price * quantity

        cash_after += total_revenue
        inventory_after[product_id] = current_qty - quantity
        if inventory_after[product_id] == 0:
            del inventory_after[product_id]
        action_data["price"] = price
        action_data["total_revenue"] = total_revenue
        action_data["trade_city"] = current_city

    elif action_type == "move":
        to_city = action_data.get("to_city")
        valid_cities = config.get("cities", list(CITIES.keys()))

        if to_city not in valid_cities:
            raise BusinessException(
                message="目标城市无效",
                code=ErrorCode.BAD_REQUEST,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if to_city == participant.current_city:
            raise BusinessException(
                message="您已经在该城市",
                code=ErrorCode.BAD_REQUEST,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if move_cost > participant.cash:
            raise BusinessException(
                message="现金不足以支付路费",
                code=ErrorCode.BAD_REQUEST,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        from_city = participant.current_city
        cash_after -= move_cost
        participant.current_city = to_city
        action_data["from_city"] = from_city
        action_data["move_cost"] = move_cost

    elif action_type == "hold":
        pass  # 什么都不做

    else:
        raise BusinessException(
            message="无效的决策类型",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # 计算总资产
    inventory_value = _calc_inventory_value(inventory_after, round_obj.event_id, db)
    total_assets = cash_after + inventory_value

    # 保存决策
    decision = TradingDecision(
        round_id=round_id,
        participant_id=participant.id,
        action_type=ActionType(action_type),
        action_data=action_data,
        cash_after=cash_after,
        inventory_after=inventory_after,
    )
    db.add(decision)

    # 更新参与者状态
    participant.cash = cash_after
    participant.inventory = inventory_after
    participant.total_assets = total_assets

    practice_advanced = False
    event_finished = False

    if event.match_kind == MatchKind.practice and round_obj.status == RoundStatus.active:
        practice_advanced, event_finished = try_advance_practice_round(db, event, round_obj)
        if event_finished:
            settle_practice_if_finished(db, event)

    db.commit()
    db.refresh(decision)

    latest_round = (
        db.query(TradingRound)
        .filter(TradingRound.event_id == event.id)
        .order_by(TradingRound.round_number.desc())
        .first()
    )
    has_submitted_now = True
    can_submit_now = False
    if latest_round and event.status == MatchStatus.playing:
        has_submitted_now = db.query(TradingDecision).filter(
            TradingDecision.round_id == latest_round.id,
            TradingDecision.participant_id == participant.id,
        ).first() is not None
        can_submit_now = (
            latest_round.status == RoundStatus.active
            and not has_submitted_now
        )

    return ApiResponse.ok(data=SubmitDecisionResult(
        decision=DecisionOut.model_validate(decision),
        practice_advanced=practice_advanced,
        event_finished=event_finished,
        current_round=_round_to_out(latest_round) if latest_round else None,
        has_submitted_this_round=has_submitted_now,
        can_submit_decision=can_submit_now,
    ))


@router.get("/rounds/{round_id}/result", response_model=ApiResponse[TradingRoundResult])
def get_round_result(
    round_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取回合结果"""
    round_obj = db.query(TradingRound).filter(TradingRound.id == round_id).first()
    if not round_obj:
        raise BusinessException(
            message="回合不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    participant = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.event_id == round_obj.event_id,
        CompetitionParticipant.user_id == current_user.id,
    ).first()

    my_decision = None
    if participant:
        decision = db.query(TradingDecision).filter(
            TradingDecision.round_id == round_id,
            TradingDecision.participant_id == participant.id,
        ).first()
        if decision:
            my_decision = {
                "action_type": decision.action_type.value if decision.action_type else "hold",
                "action_data": decision.action_data,
                "cash_after": decision.cash_after,
                "inventory_after": decision.inventory_after,
            }

    standings = _get_standings(round_obj.event_id, db)

    return ApiResponse.ok(data=TradingRoundResult(
        round=_round_to_out(round_obj),
        standings=standings,
        my_decision=my_decision,
    ))


@router.post("/rounds/{round_id}/next", response_model=ApiResponse[TradingRoundOut])
def next_round(
    round_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """推进到下一回合（组织者）"""
    round_obj = db.query(TradingRound).filter(TradingRound.id == round_id).first()
    if not round_obj:
        raise BusinessException(
            message="回合不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    event = round_obj.event

    # 验证组织者身份
    from app.models.trading_competition import OrganizerProfile
    organizer = db.query(OrganizerProfile).filter(
        OrganizerProfile.user_id == current_user.id
    ).first()
    if not organizer or event.organizer_id != organizer.id:
        raise BusinessException(
            message="只有组织者可以推进回合",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    if round_obj.status != RoundStatus.active:
        raise BusinessException(
            message="当前回合不在进行中",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    new_round, finished = advance_to_next_round(db, event, round_obj)
    db.commit()
    db.refresh(new_round if not finished else round_obj)

    return ApiResponse.ok(data=_round_to_out(new_round if not finished else round_obj))


@router.get("/events/{event_id}/history", response_model=ApiResponse[List[Dict[str, Any]]])
def get_price_history(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取价格历史"""
    participant = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.event_id == event_id,
        CompetitionParticipant.user_id == current_user.id,
    ).first()

    if not participant:
        raise BusinessException(
            message="您未参加这场比赛",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    rounds = db.query(TradingRound).filter(
        TradingRound.event_id == event_id,
    ).order_by(TradingRound.round_number).all()

    history = []
    for r in rounds:
        history.append({
            "round_number": r.round_number,
            "status": r.status.value if r.status else "pending",
            "events": r.events,
            "prices": r.price_snapshot,
        })

    return ApiResponse.ok(data=history)


# ============== 辅助函数 ==============

def _round_to_out(round_obj: TradingRound) -> TradingRoundOut:
    snapshot = dict(round_obj.price_snapshot or {})
    snapshot.pop("_market_meta", None)
    return TradingRoundOut(
        id=round_obj.id,
        event_id=round_obj.event_id,
        round_number=round_obj.round_number,
        status=round_obj.status.value if round_obj.status else "pending",
        events=round_obj.events or [],
        price_snapshot=snapshot,
        started_at=round_obj.started_at,
        ended_at=round_obj.ended_at,
    )


def _product_catalog(event: ArenaMatch) -> tuple:
    config_id = event.game_config_id or "trading-v1"
    products_all, cities_all, _ = load_world(config_id)
    config = event.config or {}
    cities = config.get("cities", list(cities_all.keys()))
    product_keys = config.get("products", list(products_all.keys()))
    product_dict = get_products_dict(config_id, product_keys)
    city_meta = cities_meta_for(config_id, cities)
    return product_dict, cities, city_meta


def _build_market_insights(current_round: TradingRound, event: ArenaMatch, db: Session) -> List[MarketInsight]:
    if not current_round:
        return []
    product_dict, cities, city_meta = _product_catalog(event)
    raw = current_round.price_snapshot or {}
    meta = raw.get("_market_meta") or {}

    prev_round = db.query(TradingRound).filter(
        TradingRound.event_id == event.id,
        TradingRound.round_number < current_round.round_number,
    ).order_by(TradingRound.round_number.desc()).first()
    prev_meta = (prev_round.price_snapshot or {}).get("_market_meta", {}) if prev_round else {}

    insights: List[MarketInsight] = []
    for city_key in cities:
        city_name = city_meta.get(city_key, {}).get("name", CITIES.get(city_key, {}).get("name", city_key))
        for pid in product_dict:
            m = meta.get(city_key, {}).get(pid, {})
            if not m and not prev_meta:
                continue
            pm = prev_meta.get(city_key, {}).get(pid, m)
            insights.append(MarketInsight(
                city=city_key,
                city_name=city_name,
                product_id=pid,
                product_name=product_dict[pid].get("name", pid),
                buy_qty=int(pm.get("buy_qty", 0)),
                sell_qty=int(pm.get("sell_qty", 0)),
                net_demand=int(pm.get("net_demand", 0)),
                pressure=float(pm.get("pressure", 0)),
            ))
    insights.sort(key=lambda x: abs(x.pressure), reverse=True)
    return insights[:12]


def _build_markets(event_id: int, current_round: TradingRound, db: Session) -> List[CityMarket]:
    """构建市场行情"""
    if not current_round or not current_round.price_snapshot:
        return []

    event = db.query(ArenaMatch).filter(ArenaMatch.id == event_id).first()
    if not event:
        return []

    product_dict, cities, city_meta = _product_catalog(event)
    config_id = event.game_config_id or "trading-v1"
    pricing = get_pricing_config(config_id)
    sell_spread = pricing.get("sell_spread", 0.95)

    raw = current_round.price_snapshot or {}
    meta = raw.get("_market_meta") or {}

    prev_round = db.query(TradingRound).filter(
        TradingRound.event_id == event_id,
        TradingRound.round_number < current_round.round_number,
    ).order_by(TradingRound.round_number.desc()).first()

    markets = []
    for city_key in cities:
        if city_key not in raw:
            continue

        city_prices = raw[city_key]
        if not isinstance(city_prices, dict):
            continue

        city_name = city_meta.get(city_key, {}).get("name", CITIES.get(city_key, {}).get("name", city_key))
        product_list = []

        for pid, prod in product_dict.items():
            if pid not in city_prices:
                continue

            current_price = city_prices[pid]
            m = meta.get(city_key, {}).get(pid, {})

            trend = "stable"
            trend_pct = 0.0
            if prev_round and prev_round.price_snapshot:
                prev_prices = prev_round.price_snapshot.get(city_key, {})
                if pid in prev_prices:
                    prev_price = prev_prices[pid]
                    if prev_price > 0:
                        change = (current_price - prev_price) / prev_price
                        trend_pct = round(change * 100, 1)
                        if change > 0.05:
                            trend = "up"
                        elif change < -0.05:
                            trend = "down"

            product_list.append(ProductPrice(
                product_id=pid,
                name=prod.get("name", pid),
                category=prod.get("category", "low"),
                buy_price=current_price,
                sell_price=int(current_price * sell_spread),
                trend=trend,
                trend_percent=trend_pct,
                buy_qty=int(m.get("buy_qty", 0)),
                sell_qty=int(m.get("sell_qty", 0)),
                net_demand=int(m.get("net_demand", 0)),
                pressure=float(m.get("pressure", 0)),
            ))

        markets.append(CityMarket(
            city=city_key,
            city_name=city_name,
            products=product_list,
        ))

    return markets


def _build_inventory(participant: CompetitionParticipant, current_round: TradingRound, db: Session) -> List[PlayerInventoryItem]:
    """构建玩家库存"""
    inventory = participant.inventory or {}
    if not inventory:
        return []

    items = []
    for pid, qty in inventory.items():
        prod_info = PRODUCTS.get(pid, {})

        # 计算平均成本（从决策历史）
        avg_cost = 0.0
        decisions = db.query(TradingDecision).filter(
            TradingDecision.participant_id == participant.id,
            TradingDecision.action_type == ActionType.buy,
        ).all()
        total_cost = 0
        total_qty = 0
        for d in decisions:
            if d.action_data.get("product_id") == pid:
                total_cost += d.action_data.get("total_cost", 0)
                total_qty += d.action_data.get("quantity", 0)
        if total_qty > 0:
            avg_cost = round(total_cost / total_qty, 2)

        # 当前估值
        current_value = 0
        if current_round and current_round.price_snapshot:
            for city_prices in strip_price_snapshot(current_round.price_snapshot).values():
                if pid in city_prices:
                    current_value = city_prices[pid] * qty
                    break

        items.append(PlayerInventoryItem(
            product_id=pid,
            name=prod_info.get("name", pid),
            quantity=qty,
            avg_cost=avg_cost,
            current_value=current_value,
        ))

    return items


def _get_standings(event_id: int, db: Session) -> List[Dict[str, Any]]:
    """获取排行榜"""
    participants = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.event_id == event_id,
    ).order_by(CompetitionParticipant.total_assets.desc()).all()

    standings = []
    from app.games.trading.bot_users import bot_display_name

    for rank, p in enumerate(participants, 1):
        user = p.user
        name = bot_display_name(user.username) if getattr(p, "is_ai", 0) else user.username
        inventory_value = _calc_inventory_value(p.inventory or {}, event_id, db)
        standings.append({
            "rank": rank,
            "user_id": user.id,
            "username": name,
            "avatar": user.avatar,
            "cash": round(p.cash, 2),
            "inventory_value": round(inventory_value, 2),
            "total_assets": round(p.total_assets, 2),
            "current_city": p.current_city,
        })

    return standings


def _calc_inventory_value(inventory: dict, event_id: int, db: Session) -> float:
    """计算库存当前价值"""
    if not inventory:
        return 0.0

    latest_round = db.query(TradingRound).filter(
        TradingRound.event_id == event_id
    ).order_by(TradingRound.round_number.desc()).first()

    if not latest_round or not latest_round.price_snapshot:
        return 0.0

    prices = strip_price_snapshot(latest_round.price_snapshot)
    total = 0.0
    for pid, qty in inventory.items():
        for city_prices in prices.values():
            if pid in city_prices:
                total += city_prices[pid] * qty
                break

    return total
