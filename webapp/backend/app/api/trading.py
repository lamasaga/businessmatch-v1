"""交易游戏路由 - 回合决策、价格计算、游戏状态"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any

from app.db.database import get_db
from app.models.user import User
from app.models.trading_competition import (
    CompetitionEvent, CompetitionParticipant, TradingRound, TradingDecision, TradingPrice,
    EventStatus, ParticipantStatus, RoundStatus, ActionType,
    PRODUCTS, CITIES, generate_random_events, calculate_prices,
)
from app.schemas.trading_competition import (
    DecisionRequest, DecisionOut, GameState, TradingRoundOut, TradingRoundResult,
    CityMarket, ProductPrice, PlayerInventoryItem, StandingsEntry,
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

    # 构建市场行情
    markets = _build_markets(event_id, current_round, db)

    # 构建库存
    inventory = _build_inventory(participant, current_round, db)

    # 排行榜
    standings = _get_standings(event_id, db)

    from app.api.competitions import _event_to_out, _participant_to_out

    return ApiResponse.ok(data=GameState(
        event=_event_to_out(event, db),
        participant=_participant_to_out(participant, db),
        current_round=_round_to_out(current_round) if current_round else None,
        markets=markets,
        inventory=inventory,
        standings=standings,
        time_remaining=None,
    ))


@router.post("/rounds/{round_id}/decide", response_model=ApiResponse[DecisionOut])
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

    config = round_obj.event.config or {}
    inventory_limit = config.get("inventory_limit", 20)
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

        current_inventory_count = sum(inventory_after.values())
        if current_inventory_count + quantity > inventory_limit:
            raise BusinessException(
                message=f"库存上限为{inventory_limit}件",
                code=ErrorCode.BAD_REQUEST,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        cash_after -= total_cost
        inventory_after[product_id] = inventory_after.get(product_id, 0) + quantity
        action_data["price"] = price
        action_data["total_cost"] = total_cost

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

        cash_after -= move_cost
        participant.current_city = to_city
        action_data["from_city"] = participant.current_city
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

    db.commit()
    db.refresh(decision)

    return ApiResponse.ok(data=DecisionOut.model_validate(decision))


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

    # 完成当前回合
    round_obj.status = RoundStatus.completed
    round_obj.ended_at = func.now()

    config = event.config or {}
    max_rounds = config.get("rounds", 10)

    # 检查是否已达到最大回合数
    if round_obj.round_number >= max_rounds:
        # 比赛结束
        event.status = EventStatus.finished
        event.ends_at = func.now()
        db.commit()
        return ApiResponse.ok(data=_round_to_out(round_obj))

    # 创建新回合
    next_round_number = round_obj.round_number + 1
    cities = config.get("cities", list(CITIES.keys()))
    products = config.get("products", list(PRODUCTS.keys()))
    product_dict = {k: v for k, v in PRODUCTS.items() if k in products}

    # 获取本回合的所有决策
    decisions = db.query(TradingDecision).filter(
        TradingDecision.round_id == round_id
    ).all()

    # 计算新价格
    new_prices = calculate_prices(product_dict, cities, decisions, round_obj.events or [], next_round_number)

    # 生成新事件
    new_events = generate_random_events(next_round_number, cities, product_dict)

    new_round = TradingRound(
        event_id=event.id,
        round_number=next_round_number,
        status=RoundStatus.active,
        events=new_events,
        price_snapshot=new_prices,
    )
    db.add(new_round)

    # 保存价格记录
    for city_key, city_prices in new_prices.items():
        for pid, price in city_prices.items():
            db.add(TradingPrice(
                event_id=event.id,
                round_id=new_round.id,
                city=city_key,
                product_id=pid,
                base_price=PRODUCTS[pid]["base_price"],
                final_price=price,
            ))

    # 更新所有参与者的总资产（基于新价格）
    participants = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.event_id == event.id
    ).all()
    for p in participants:
        inventory_value = _calc_inventory_value(p.inventory or {}, event.id, db)
        # 使用新价格重新计算
        inventory_value_new = 0
        for pid, qty in (p.inventory or {}).items():
            for c_prices in new_prices.values():
                if pid in c_prices:
                    inventory_value_new += c_prices[pid] * qty
                    break
        p.total_assets = p.cash + inventory_value_new

    event.current_round = next_round_number
    db.commit()
    db.refresh(new_round)

    return ApiResponse.ok(data=_round_to_out(new_round))


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
    return TradingRoundOut(
        id=round_obj.id,
        event_id=round_obj.event_id,
        round_number=round_obj.round_number,
        status=round_obj.status.value if round_obj.status else "pending",
        events=round_obj.events or [],
        price_snapshot=round_obj.price_snapshot or {},
        started_at=round_obj.started_at,
        ended_at=round_obj.ended_at,
    )


def _build_markets(event_id: int, current_round: TradingRound, db: Session) -> List[CityMarket]:
    """构建市场行情"""
    if not current_round or not current_round.price_snapshot:
        return []

    event = current_round.event
    config = event.config or {}
    cities = config.get("cities", list(CITIES.keys()))
    products = config.get("products", list(PRODUCTS.keys()))

    # 获取上一回合价格用于计算趋势
    prev_round = db.query(TradingRound).filter(
        TradingRound.event_id == event_id,
        TradingRound.round_number < current_round.round_number,
    ).order_by(TradingRound.round_number.desc()).first()

    markets = []
    for city_key in cities:
        if city_key not in current_round.price_snapshot:
            continue

        city_prices = current_round.price_snapshot[city_key]
        product_list = []

        for pid in products:
            if pid not in city_prices:
                continue

            prod_info = PRODUCTS.get(pid, {})
            current_price = city_prices[pid]

            # 计算趋势
            trend = "stable"
            trend_pct = 0.0
            if prev_round and prev_round.price_snapshot:
                prev_city_prices = prev_round.price_snapshot.get(city_key, {})
                if pid in prev_city_prices:
                    prev_price = prev_city_prices[pid]
                    if prev_price > 0:
                        change = (current_price - prev_price) / prev_price
                        trend_pct = round(change * 100, 1)
                        if change > 0.05:
                            trend = "up"
                        elif change < -0.05:
                            trend = "down"

            product_list.append(ProductPrice(
                product_id=pid,
                name=prod_info.get("name", pid),
                category=prod_info.get("category", "low"),
                buy_price=current_price,
                sell_price=int(current_price * 0.95),  # 卖出价略低（模拟交易成本）
                trend=trend,
                trend_percent=trend_pct,
            ))

        markets.append(CityMarket(
            city=city_key,
            city_name=CITIES.get(city_key, {}).get("name", city_key),
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
            for city_prices in current_round.price_snapshot.values():
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
    for rank, p in enumerate(participants, 1):
        user = p.user
        inventory_value = _calc_inventory_value(p.inventory or {}, event_id, db)
        standings.append({
            "rank": rank,
            "user_id": user.id,
            "username": user.username,
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

    total = 0.0
    for pid, qty in inventory.items():
        for city_prices in latest_round.price_snapshot.values():
            if pid in city_prices:
                total += city_prices[pid] * qty
                break

    return total
