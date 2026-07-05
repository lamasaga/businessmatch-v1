"""OPS 生产经营销售赛 API — 参赛端 + 组织端"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_teacher
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.db.database import get_db
from app.domains.arena.enums import MatchStatus, MatchKind, GameEngineId
from app.domains.arena.models.match import ArenaMatch
from app.domains.arena.models.participant import ArenaParticipant
from app.domains.arena.models.team import ArenaTeam
from app.domains.arena.config_json import persist_match_config
from app.domains.arena.services.match_lifecycle import begin_match
from app.models.user import User
from app.games.ops_sim.models import (
    OpsTeamState, OpsRound, OpsSubmission, OpsSnapshot, OpsProductCard,
    OpsAuctionItem, OpsAuctionBid,
)
from app.games.ops_sim.enums import (
    OpsRoundStatus, OpsMatchPhase, OpsCategory, OpsSegment, OpsAiStrategy, OpsAuctionStatus,
)
from app.games.ops_sim.config import get_cfg, V
from app.games.ops_sim.settle import settle_ops_round, final_ranking, ensure_ai_positioning
from app.games.ops_sim.auction import create_auction_items, place_bid, settle_auction, auction_state_for_event
from app.games.ops_sim.ai import generate_ai_decision

router = APIRouter(prefix="/ops", tags=["OPS 生产经营销售赛"])


# ── Schemas ──


class ProductPositioningRequest(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=100)
    category: OpsCategory
    target_segment: OpsSegment


class SubmitDecisionRequest(BaseModel):
    production_quantity: int = Field(..., ge=0)
    unit_price: float = Field(..., gt=0)
    marketing_spend: float = Field(0, ge=0)
    rnd_spend: float = Field(0, ge=0)
    sales_force: int = Field(0, ge=0)
    target_cities: list[str] = Field(default_factory=list)

    @validator("target_cities")
    def max_cities(cls, v):
        if len(v) > 3:
            raise ValueError("最多选择 3 个城市")
        return v

    @validator("sales_force")
    def max_sales_force(cls, v):
        if v > 10:
            raise ValueError("销售人员数不能超过 10")
        return v


class BidRequest(BaseModel):
    amount: float = Field(..., gt=0)


class AdvanceRequest(BaseModel):
    phase: OpsMatchPhase | None = None


# ── Helpers ──


def _get_match(event_id: int, db: Session) -> ArenaMatch:
    match = db.query(ArenaMatch).get(event_id)
    if not match:
        raise BusinessException("场次不存在", code=ErrorCode.NOT_FOUND, status_code=404)
    return match


def _get_team_and_state(event_id: int, user: User, db: Session) -> tuple[ArenaMatch, ArenaTeam, OpsTeamState]:
    match = _get_match(event_id, db)
    part = db.query(ArenaParticipant).filter(
        ArenaParticipant.event_id == event_id,
        ArenaParticipant.user_id == user.id,
    ).first()
    if not part:
        raise BusinessException("你未加入此场次", code=ErrorCode.FORBIDDEN, status_code=403)
    if not part.team_id:
        raise BusinessException("你尚未加入任何队伍", code=ErrorCode.BAD_REQUEST, status_code=400)
    team = db.query(ArenaTeam).get(part.team_id)
    if not team:
        raise BusinessException("队伍数据异常", code=ErrorCode.NOT_FOUND, status_code=404)
    state = db.query(OpsTeamState).filter(OpsTeamState.team_id == team.id).first()
    if not state:
        raise BusinessException("队伍状态未初始化", code=ErrorCode.NOT_FOUND, status_code=404)
    return match, team, state


def _current_round(event_id: int, db: Session) -> OpsRound | None:
    return db.query(OpsRound).filter(
        OpsRound.event_id == event_id,
        OpsRound.status == OpsRoundStatus.open,
    ).first()


def _match_phase(match: ArenaMatch) -> OpsMatchPhase:
    val = (match.config or {}).get("ops_phase")
    if val:
        return OpsMatchPhase(val)
    if match.status == MatchStatus.registration:
        return OpsMatchPhase.registration
    if match.status == MatchStatus.finished:
        return OpsMatchPhase.finished
    return OpsMatchPhase.positioning


def _set_match_ops_phase(match: ArenaMatch, phase: OpsMatchPhase, **extra: Any) -> None:
    persist_match_config(match, {**(match.config or {}), "ops_phase": phase.value, **extra})


def _operation_phase(round_number: int) -> OpsMatchPhase:
    return OpsMatchPhase(f"operation_round_{round_number}")


def _is_operation_phase(phase: OpsMatchPhase) -> bool:
    return phase.value.startswith("operation_round_")


def _round_no_from_phase(phase: OpsMatchPhase) -> int | None:
    if not _is_operation_phase(phase):
        return None
    try:
        return int(phase.value.rsplit("_", 1)[1])
    except (IndexError, ValueError):
        return None


def _is_auction_phase(phase: OpsMatchPhase) -> bool:
    return phase in (OpsMatchPhase.auction_a, OpsMatchPhase.auction_b, OpsMatchPhase.auction)


def _auction_stage(phase: OpsMatchPhase) -> str:
    if phase == OpsMatchPhase.auction_b:
        return "auction_b"
    return "auction_a"


def _next_phase_after_round(round_number: int) -> OpsMatchPhase:
    if round_number == 3:
        return OpsMatchPhase.auction_b
    if round_number >= 6:
        return OpsMatchPhase.finished
    return _operation_phase(round_number + 1)


def _ensure_round_open(db: Session, match: ArenaMatch, round_number: int) -> OpsRound:
    existing = db.query(OpsRound).filter(
        OpsRound.event_id == match.id,
        OpsRound.round_number == round_number,
    ).first()
    if existing:
        if existing.status != OpsRoundStatus.settled:
            existing.status = OpsRoundStatus.open
            if not existing.opened_at:
                existing.opened_at = datetime.now(timezone.utc)
            if not existing.ended_at and match.match_kind == MatchKind.official:
                cfg = get_cfg(match.game_config_id or "ops-sim-v1")
                existing.ended_at = existing.opened_at + timedelta(minutes=V("decision_time_minutes", cfg, 20))
        return existing
    return _open_round(db, match, round_number)


def _try_advance_from_positioning(db: Session, match: ArenaMatch, cfg: dict[str, Any]) -> OpsMatchPhase:
    """定位阶段收齐后进入拍卖 A；练习赛自动为 AI 填位。"""
    current = _match_phase(match)
    if current != OpsMatchPhase.positioning:
        return current

    if match.match_kind == MatchKind.practice:
        ensure_ai_positioning(db, match, cfg)

    event_id = match.id
    total_teams = db.query(ArenaTeam).filter(ArenaTeam.event_id == event_id).count()
    submitted = db.query(OpsProductCard).filter(OpsProductCard.event_id == event_id).count()
    if submitted < total_teams:
        return OpsMatchPhase.positioning

    create_auction_items(db, match, "auction_a")
    _set_match_ops_phase(match, OpsMatchPhase.auction_a)
    return OpsMatchPhase.auction_a


def _validate_spending(decision: SubmitDecisionRequest, state: OpsTeamState, cfg: dict[str, Any]) -> tuple[float, list[str]]:
    """校验总支出是否超过现金。返回 (total_cost, new_cities) 或抛出异常。"""
    category = state.category.value if state.category else "home"
    cat_cfg = cfg.get("product_categories", {}).get(category, {})
    material_cost = cat_cfg.get("base_material_cost", 50)

    raw_spend = decision.production_quantity * material_cost * (1 - state.discount_rate)

    cities_cfg = cfg.get("cities", {})
    entered = set(state.entered_cities or [])
    opening_fees = 0
    new_cities = []
    for city_id in decision.target_cities:
        if city_id not in entered:
            city_cfg = cities_cfg.get(city_id, {})
            tier = city_cfg.get("tier", 2)
            fee_multi = {1: 2.0, 2: 1.5, 3: 1.0, 4: 0.6}.get(tier, 1.0)
            fee = city_cfg.get("opening_cost", 15000) * fee_multi
            opening_fees += fee
            new_cities.append(city_id)

    total = (
        raw_spend
        + opening_fees
        + decision.marketing_spend
        + decision.rnd_spend
        + decision.sales_force * V("wage_per_head", cfg, 1500)
    )

    if total > state.cash + 0.01:
        raise BusinessException(
            f"总支出 {total:.0f} 超过可用现金 {state.cash:.0f}",
            code=ErrorCode.BAD_REQUEST, status_code=400,
        )

    return total, new_cities


def _teams_peers(db: Session, event_id: int) -> list[dict[str, Any]]:
    """参赛端可见的轻量队伍列表（大厅/进度展示）。"""
    teams_db = db.query(ArenaTeam).filter(ArenaTeam.event_id == event_id).order_by(ArenaTeam.id).all()
    cards = {
        c.team_id: c
        for c in db.query(OpsProductCard).filter(OpsProductCard.event_id == event_id).all()
    }
    peers: list[dict[str, Any]] = []
    for t in teams_db:
        card = cards.get(t.id)
        peers.append({
            "team_id": t.id,
            "team_name": t.team_name,
            "product_name": card.product_name if card else None,
            "category": card.category.value if card and card.category else None,
            "target_segment": card.target_segment.value if card and card.target_segment else None,
            "has_positioned": card is not None,
            "is_ai": bool(t.is_ai),
        })
    return peers


def _persist_settlement_news(match: ArenaMatch, news: list[dict[str, Any]] | None) -> None:
    if news:
        persist_match_config(match, {**(match.config or {}), "ops_last_news": news})


def _state_dict(state: OpsTeamState, team: ArenaTeam, cfg: dict[str, Any]) -> dict[str, Any]:
    return {
        "team_id": team.id,
        "team_name": team.team_name,
        "product_name": state.product_name or "",
        "category": state.category.value if state.category else None,
        "target_segment": state.target_segment.value if state.target_segment else None,
        "cash": state.cash,
        "inventory": state.inventory,
        "cumulative_profit": state.cumulative_profit,
        "net_assets": state.net_assets,
        "tech": state.tech,
        "fit": state.fit,
        "show": state.show,
        "entered_cities": state.entered_cities or [],
        "factories": state.factories or [],
        "ads": state.ads or [],
        "discount_rate": state.discount_rate,
    }


def _round_dict(r: OpsRound | None) -> dict[str, Any] | None:
    if not r:
        return None
    return {
        "id": r.id,
        "round_number": r.round_number,
        "status": r.status.value if hasattr(r.status, "value") else r.status,
        "opened_at": r.opened_at.isoformat() if r.opened_at else None,
        "ended_at": r.ended_at.isoformat() if r.ended_at else None,
        "settled_at": r.settled_at.isoformat() if r.settled_at else None,
    }


def _all_teams_submitted(db: Session, event_id: int, ops_round: OpsRound) -> bool:
    subs = db.query(OpsSubmission).filter(OpsSubmission.round_id == ops_round.id).count()
    teams = db.query(ArenaTeam).filter(ArenaTeam.event_id == event_id).count()
    return teams > 0 and subs >= teams


def _can_practice_advance(db: Session, match: ArenaMatch, team: ArenaTeam | None = None) -> bool:
    if match.match_kind != MatchKind.practice:
        return False
    phase = _match_phase(match)
    if _is_auction_phase(phase):
        return True
    if _is_operation_phase(phase):
        current_rd = _current_round(match.id, db)
        return bool(current_rd and _all_teams_submitted(db, match.id, current_rd))
    return False


# ── 参赛端 ──


@router.get("/events/{event_id}/state", response_model=ApiResponse[dict])
def get_state(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    match, team, state = _get_team_and_state(event_id, current_user, db)
    cfg = get_cfg(match.game_config_id or "ops-sim-v1")
    phase = _match_phase(match)

    rounds = db.query(OpsRound).filter(OpsRound.event_id == event_id).order_by(OpsRound.round_number).all()
    current_rd = next((r for r in rounds if r.status == OpsRoundStatus.open), None)

    has_submitted = False
    if current_rd:
        has_submitted = db.query(OpsSubmission).filter(
            OpsSubmission.round_id == current_rd.id,
            OpsSubmission.team_id == team.id,
        ).first() is not None

    last_snapshot = None
    settled_rounds = [r for r in rounds if r.status == OpsRoundStatus.settled]
    if settled_rounds:
        last = settled_rounds[-1]
        snap = db.query(OpsSnapshot).filter(
            OpsSnapshot.round_id == last.id,
            OpsSnapshot.team_id == team.id,
        ).first()
        if snap:
            last_snapshot = {
                "result": snap.result_json,
                "financial_statements": snap.financial_statements,
            }

    auction_items = []
    if _is_auction_phase(phase):
        auction_items = auction_state_for_event(db, event_id)

    theme_pack = cfg.get("theme_pack") or {}
    return ApiResponse.ok(data={
        "match_id": match.id,
        "match_kind": match.match_kind.value if match.match_kind else "official",
        "match_status": match.status.value,
        "phase": phase.value,
        "room_code": match.room_code,
        "title": match.title,
        "team": _state_dict(state, team, cfg),
        "teams_peers": _teams_peers(db, event_id),
        "rounds": [_round_dict(r) for r in rounds],
        "current_round": _round_dict(current_rd),
        "has_submitted": has_submitted,
        "can_advance": _can_practice_advance(db, match, team),
        "last_snapshot": last_snapshot,
        "last_news": (match.config or {}).get("ops_last_news") or [],
        "auction_items": auction_items,
        "theme_pack": {
            "id": theme_pack.get("id"),
            "name": theme_pack.get("name"),
        },
        "config": {
            "product_categories": cfg.get("product_categories", {}),
            "consumer_segments": cfg.get("consumer_segments", {}),
            "cities": cfg.get("cities", {}),
            "defaults": cfg.get("defaults", {}),
        },
    })


@router.post("/events/{event_id}/product-positioning", response_model=ApiResponse[dict])
def submit_positioning(
    event_id: int,
    body: ProductPositioningRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    match, team, state = _get_team_and_state(event_id, current_user, db)
    phase = _match_phase(match)
    if phase != OpsMatchPhase.positioning:
        raise BusinessException("当前不是产品定位阶段", code=ErrorCode.BAD_REQUEST, status_code=400)

    # 保存/更新定位卡
    card = db.query(OpsProductCard).filter(OpsProductCard.team_id == team.id).first()
    if not card:
        card = OpsProductCard(event_id=event_id, team_id=team.id)
        db.add(card)
    card.product_name = body.product_name
    card.category = body.category
    card.target_segment = body.target_segment

    # 同步队伍状态
    state.product_name = body.product_name
    state.category = body.category
    state.target_segment = body.target_segment
    cfg = get_cfg(match.game_config_id or "ops-sim-v1")
    cat_cfg = cfg.get("product_categories", {}).get(body.category.value, {})
    state.tech = float(cat_cfg.get("tech_base", state.tech or 20.0))
    state.fit = float(cat_cfg.get("fit_base", state.fit or 20.0))
    state.show = float(cat_cfg.get("show_base", state.show or 20.0))

    db.flush()
    new_phase = _try_advance_from_positioning(db, match, cfg)

    db.commit()
    db.refresh(match)
    return ApiResponse.ok(data={
        "product_name": body.product_name,
        "category": body.category.value,
        "target_segment": body.target_segment.value,
        "phase": new_phase.value,
    })


@router.post("/events/{event_id}/decisions", response_model=ApiResponse[dict])
def submit_decision(
    event_id: int,
    body: SubmitDecisionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    match, team, state = _get_team_and_state(event_id, current_user, db)
    cfg = get_cfg(match.game_config_id or "ops-sim-v1")

    phase = _match_phase(match)
    if not _is_operation_phase(phase):
        raise BusinessException("当前不可提交运营决策", code=ErrorCode.BAD_REQUEST, status_code=400)

    current_rd = _current_round(event_id, db)
    if not current_rd:
        raise BusinessException("当前无开放轮次", code=ErrorCode.BAD_REQUEST, status_code=400)
    if match.match_kind == MatchKind.official and current_rd.ended_at and datetime.now(timezone.utc) > current_rd.ended_at:
        raise BusinessException("当前轮次已截止", code=ErrorCode.BAD_REQUEST, status_code=400)

    key = f"ops_decision:{match.id}:{current_rd.id}:{team.id}"
    existing = db.query(OpsSubmission).filter(OpsSubmission.idempotency_key == key).first()
    if existing:
        return ApiResponse.ok(data={
            "submitted": True,
            "round_number": current_rd.round_number,
            "phase": phase.value,
            "can_advance": _can_practice_advance(db, match, team),
        })

    # 支出校验
    _validate_spending(body, state, cfg)

    db.add(OpsSubmission(
        round_id=current_rd.id,
        team_id=team.id,
        decision_json=body.dict(),
        idempotency_key=key,
    ))

    if match.match_kind == MatchKind.practice:
        from app.games.ops_sim.settle import ensure_ai_submissions
        ensure_ai_submissions(db, match, current_rd)

    db.commit()
    return ApiResponse.ok(data={
        "submitted": True,
        "round_number": current_rd.round_number,
        "phase": phase.value,
        "can_advance": _can_practice_advance(db, match, team),
    })


@router.post("/events/{event_id}/auction/bid", response_model=ApiResponse[dict])
def auction_bid(
    event_id: int,
    item_id: int,
    body: BidRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    match, team, state = _get_team_and_state(event_id, current_user, db)
    phase = _match_phase(match)
    if not _is_auction_phase(phase):
        raise BusinessException("当前不是竞价阶段", code=ErrorCode.BAD_REQUEST, status_code=400)

    result = place_bid(db, item_id, team.id, body.amount)
    if not result["ok"]:
        raise BusinessException(result["error"], code=ErrorCode.BAD_REQUEST, status_code=400)
    return ApiResponse.ok(data=result)


@router.get("/events/{event_id}/auction/state", response_model=ApiResponse[list])
def get_auction_state(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _get_team_and_state(event_id, current_user, db)
    return ApiResponse.ok(data=auction_state_for_event(db, event_id))


@router.get("/events/{event_id}/financials", response_model=ApiResponse[list])
def get_financials(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    match, team, state = _get_team_and_state(event_id, current_user, db)
    snapshots = db.query(OpsSnapshot).join(OpsRound).filter(
        OpsSnapshot.team_id == team.id,
        OpsRound.event_id == event_id,
    ).order_by(OpsRound.round_number).all()

    return ApiResponse.ok(data=[
        {
            "round_number": snap.round.round_number,
            "result": snap.result_json,
            "financial_statements": snap.financial_statements,
        }
        for snap in snapshots
    ])


@router.get("/events/{event_id}/ranking", response_model=ApiResponse[list])
def get_ranking(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _get_team_and_state(event_id, current_user, db)
    return ApiResponse.ok(data=final_ranking(db, _get_match(event_id, db)))


# ── 组织端 ──


@router.post("/events/{event_id}/start", response_model=ApiResponse[dict])
def start_match(
    event_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_teacher),
):
    match = _get_match(event_id, db)
    if match.status != MatchStatus.registration:
        raise BusinessException("比赛不在报名阶段", code=ErrorCode.BAD_REQUEST, status_code=400)

    begin_match(db, match)

    # 初始化 OpsTeamState
    teams = db.query(ArenaTeam).filter(ArenaTeam.event_id == event_id).all()
    cfg = get_cfg(match.game_config_id or "ops-sim-v1")
    initial_cash = V("initial_capital", cfg, 100000)

    existing_states = {s.team_id for s in db.query(OpsTeamState).filter(OpsTeamState.event_id == event_id).all()}
    for team in teams:
        if team.id in existing_states:
            continue
        ai_strategy = None
        if team.is_ai:
            slots = V("practice_ai_slots", cfg, ["balanced", "aggressive", "conservative"])
            idx = len([t for t in teams if t.is_ai and t.id < team.id]) % len(slots)
            ai_strategy = OpsAiStrategy(slots[idx])
        state = OpsTeamState(
            event_id=event_id,
            team_id=team.id,
            cash=initial_cash,
            net_assets=initial_cash,
            tech=20.0,
            fit=20.0,
            show=20.0,
            ai_strategy=ai_strategy,
        )
        db.add(state)

    _set_match_ops_phase(match, OpsMatchPhase.positioning)
    db.commit()
    return ApiResponse.ok(data={"status": match.status.value, "phase": OpsMatchPhase.positioning.value})


@router.post("/events/{event_id}/advance", response_model=ApiResponse[dict])
def advance(
    event_id: int,
    body: AdvanceRequest | None = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_teacher),
):
    match = _get_match(event_id, db)
    phase = _match_phase(match)
    cfg = get_cfg(match.game_config_id or "ops-sim-v1")

    if _is_operation_phase(phase):
        round_no = _round_no_from_phase(phase)
        if round_no is None:
            raise BusinessException("运营阶段异常", code=ErrorCode.BAD_REQUEST, status_code=400)
        current_rd = _current_round(event_id, db)
        if not current_rd:
            raise BusinessException("当前无开放轮次", code=ErrorCode.BAD_REQUEST, status_code=400)

        # 为未提交队伍生成默认决策
        teams = db.query(ArenaTeam).filter(ArenaTeam.event_id == event_id).all()
        existing = {
            s.team_id for s in db.query(OpsSubmission).filter(OpsSubmission.round_id == current_rd.id).all()
        }
        for team in teams:
            if team.id in existing:
                continue
            state = db.query(OpsTeamState).filter(OpsTeamState.team_id == team.id).first()
            default_dec = {"production_quantity": 0, "unit_price": 100, "marketing_spend": 0, "rnd_spend": 0, "sales_force": 0, "target_cities": []}
            if state and state.ai_strategy:
                default_dec = generate_ai_decision(_state_dict(state, team, cfg), cfg, current_rd.round_number)
            key = f"ops_decision:{match.id}:{current_rd.id}:{team.id}"
            db.add(OpsSubmission(
                round_id=current_rd.id,
                team_id=team.id,
                decision_json=default_dec,
                idempotency_key=key,
            ))

        output = settle_ops_round(db, match, current_rd)
        _persist_settlement_news(match, output.get("news"))
        next_phase = _next_phase_after_round(round_no)
        if next_phase == OpsMatchPhase.auction_b:
            create_auction_items(db, match, "auction_b")
            _set_match_ops_phase(match, next_phase)
            db.commit()
            return ApiResponse.ok(data={"phase": next_phase.value, "news": output.get("news", [])})

        if next_phase == OpsMatchPhase.finished:
            _set_match_ops_phase(match, OpsMatchPhase.finished)
            match.status = MatchStatus.finished
            ranking = final_ranking(db, match)
            from app.domains.career.services.rewards import finalize_match_rewards
            finalize_match_rewards(db, match)
            db.commit()
            return ApiResponse.ok(data={"phase": OpsMatchPhase.finished.value, "ranking": ranking})

        _ensure_round_open(db, match, round_no + 1)
        _set_match_ops_phase(match, next_phase)
        db.commit()
        return ApiResponse.ok(data={"phase": next_phase.value, "news": output.get("news", [])})

    if _is_auction_phase(phase):
        results = settle_auction(db, match)
        stage = _auction_stage(phase)
        next_round = 1 if stage == "auction_a" else 4
        next_phase = _operation_phase(next_round)
        _ensure_round_open(db, match, next_round)
        _set_match_ops_phase(match, next_phase)
        db.commit()
        return ApiResponse.ok(data={"phase": next_phase.value, "auction_results": results, "news": []})

    if phase == OpsMatchPhase.positioning:
        new_phase = _try_advance_from_positioning(db, match, cfg)
        if new_phase == OpsMatchPhase.positioning:
            total_teams = db.query(ArenaTeam).filter(ArenaTeam.event_id == event_id).count()
            submitted = db.query(OpsProductCard).filter(OpsProductCard.event_id == event_id).count()
            raise BusinessException(
                f"尚有 {total_teams - submitted} 支队伍未完成产品定位",
                code=ErrorCode.BAD_REQUEST,
                status_code=400,
            )
        db.commit()
        return ApiResponse.ok(data={"phase": new_phase.value})

    raise BusinessException(f"当前阶段 {phase.value} 不可推进", code=ErrorCode.BAD_REQUEST, status_code=400)


@router.post("/events/{event_id}/practice/advance", response_model=ApiResponse[dict])
def practice_advance(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    match, team, _state = _get_team_and_state(event_id, current_user, db)
    if match.match_kind != MatchKind.practice:
        raise BusinessException("仅练习赛支持参赛端推进", code=ErrorCode.FORBIDDEN, status_code=403)
    phase = _match_phase(match)

    if _is_auction_phase(phase):
        results = settle_auction(db, match)
        stage = _auction_stage(phase)
        next_round = 1 if stage == "auction_a" else 4
        next_phase = _operation_phase(next_round)
        _ensure_round_open(db, match, next_round)
        _set_match_ops_phase(match, next_phase)
        db.commit()
        return ApiResponse.ok(data={"phase": next_phase.value, "auction_results": results})

    if _is_operation_phase(phase):
        round_no = _round_no_from_phase(phase)
        current_rd = _current_round(event_id, db)
        if not round_no or not current_rd:
            raise BusinessException("当前无可推进轮次", code=ErrorCode.BAD_REQUEST, status_code=400)
        if not _all_teams_submitted(db, event_id, current_rd):
            raise BusinessException("仍有队伍未提交决策", code=ErrorCode.BAD_REQUEST, status_code=400)
        output = settle_ops_round(db, match, current_rd)
        _persist_settlement_news(match, output.get("news"))
        next_phase = _next_phase_after_round(round_no)
        if next_phase == OpsMatchPhase.auction_b:
            create_auction_items(db, match, "auction_b")
        elif next_phase == OpsMatchPhase.finished:
            _set_match_ops_phase(match, OpsMatchPhase.finished)
            match.status = MatchStatus.finished
            from app.domains.career.services.rewards import finalize_match_rewards
            finalize_match_rewards(db, match)
            db.commit()
            return ApiResponse.ok(data={
                "phase": OpsMatchPhase.finished.value,
                "news": output.get("news", []),
                "ranking": final_ranking(db, match),
            })
        else:
            _ensure_round_open(db, match, round_no + 1)
        _set_match_ops_phase(match, next_phase)
        db.commit()
        return ApiResponse.ok(data={"phase": next_phase.value, "news": output.get("news", [])})

    raise BusinessException(f"当前阶段 {phase.value} 不可由参赛端推进", code=ErrorCode.BAD_REQUEST, status_code=400)


@router.post("/events/{event_id}/pause", response_model=ApiResponse[dict])
def pause_match(
    event_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_teacher),
):
    match = _get_match(event_id, db)
    _set_match_ops_phase(match, OpsMatchPhase.paused, ops_phase_before_pause=_match_phase(match).value)
    db.commit()
    return ApiResponse.ok(data={"phase": OpsMatchPhase.paused.value})


@router.post("/events/{event_id}/resume", response_model=ApiResponse[dict])
def resume_match(
    event_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_teacher),
):
    match = _get_match(event_id, db)
    prev = (match.config or {}).get("ops_phase_before_pause", OpsMatchPhase.operation_round_2.value)
    _set_match_ops_phase(match, OpsMatchPhase(prev))
    db.commit()
    return ApiResponse.ok(data={"phase": prev})


def _screen_payload(match: ArenaMatch, db: Session) -> dict[str, Any]:
    """组织端大屏 / 控场页完整状态。"""
    event_id = match.id
    cfg = get_cfg(match.game_config_id or "ops-sim-v1")
    teams_db = db.query(ArenaTeam).filter(ArenaTeam.event_id == event_id).order_by(ArenaTeam.id).all()
    states = {
        s.team_id: s
        for s in db.query(OpsTeamState).filter(OpsTeamState.event_id == event_id).all()
    }
    member_counts: dict[int, int] = {}
    for p in db.query(ArenaParticipant).filter(ArenaParticipant.event_id == event_id).all():
        if p.team_id:
            member_counts[p.team_id] = member_counts.get(p.team_id, 0) + 1

    teams = []
    for t in teams_db:
        s = states.get(t.id)
        teams.append({
            "id": t.id,
            "team_name": t.team_name,
            "product_name": s.product_name if s else None,
            "category": s.category.value if s and s.category else None,
            "target_segment": s.target_segment.value if s and s.target_segment else None,
            "member_count": member_counts.get(t.id, 0),
            "cash": s.cash if s else 0,
            "net_assets": s.net_assets if s else 0,
            "is_ai": bool(t.is_ai),
        })

    rounds = db.query(OpsRound).filter(OpsRound.event_id == event_id).order_by(OpsRound.round_number).all()
    participant_count = db.query(ArenaParticipant).filter(ArenaParticipant.event_id == event_id).count()

    return {
        "match_id": match.id,
        "match_status": match.status.value,
        "phase": _match_phase(match).value,
        "title": match.title,
        "room_code": match.room_code,
        "max_players": match.max_players,
        "participant_count": participant_count,
        "teams": teams,
        "rounds": [_round_dict(r) for r in rounds],
        "current_round": _round_dict(_current_round(event_id, db)),
        "ranking": final_ranking(db, match),
    }


@router.get("/events/{event_id}/screen", response_model=ApiResponse[dict])
def screen(
    event_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_teacher),
):
    match = _get_match(event_id, db)
    return ApiResponse.ok(data=_screen_payload(match, db))


# ── Internal helpers ──


def _open_round(db: Session, match: ArenaMatch, round_number: int) -> OpsRound:
    now = datetime.now(timezone.utc)
    cfg = get_cfg(match.game_config_id or "ops-sim-v1")
    ended_at = None
    if match.match_kind == MatchKind.official:
        ended_at = now + timedelta(minutes=V("decision_time_minutes", cfg, 20))
    rd = OpsRound(
        event_id=match.id,
        round_number=round_number,
        status=OpsRoundStatus.open,
        opened_at=now,
        ended_at=ended_at,
    )
    db.add(rd)
    db.flush()
    return rd
