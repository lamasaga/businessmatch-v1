"""RTS 模式 API 处理"""

from __future__ import annotations

from fastapi import status
from sqlalchemy.orm import Session

from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.domains.arena.config_json import persist_match_config
from app.domains.arena.enums import MatchStatus
from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.games.trading.market import get_pricing_config
from app.games.trading.rts_actions import queue_action, validate_queue
from app.games.trading.rts_api_helpers import (
    build_rts_capacity,
    build_rts_inventory,
    build_rts_markets,
    build_rts_meta,
)
from app.games.trading.rts_state import ensure_player_registered, get_rts_runtime
from app.games.trading.rts_tick import get_active_round
from app.schemas.trading_competition import (
    CityMarket,
    GameState,
    InventoryCapacity,
    PlayerInventoryItem,
    ProductPrice,
    RtsActionRequest,
    RtsActionResult,
    TradingRoundOut,
)
from app.games.trading import TradingRound


def _coerce_datetime(value):
    from datetime import datetime
    if value is None or isinstance(value, datetime):
        return value
    return None


def _round_to_out(round_obj: TradingRound) -> TradingRoundOut:
    snapshot = dict(round_obj.price_snapshot or {})
    snapshot.pop("_rts", None)
    return TradingRoundOut(
        id=round_obj.id,
        event_id=round_obj.event_id,
        round_number=round_obj.round_number,
        status=round_obj.status.value if round_obj.status else "pending",
        events=round_obj.events or [],
        price_snapshot={k: v for k, v in snapshot.items() if not k.startswith("_")},
        started_at=_coerce_datetime(round_obj.started_at),
        ended_at=_coerce_datetime(round_obj.ended_at),
    )


def _get_standings(event_id: int, db: Session):
    from app.games.trading.bot_users import bot_display_name

    participants = (
        db.query(ArenaParticipant)
        .filter(ArenaParticipant.event_id == event_id)
        .order_by(ArenaParticipant.total_assets.desc())
        .all()
    )
    standings = []
    for rank, p in enumerate(participants, 1):
        user = p.user
        name = bot_display_name(user.username) if getattr(p, "is_ai", 0) else user.username
        standings.append({
            "rank": rank,
            "user_id": user.id,
            "username": name,
            "avatar": user.avatar,
            "cash": round(p.cash, 2),
            "inventory_value": round(max(0, p.total_assets - p.cash), 2),
            "total_assets": round(p.total_assets, 2),
            "current_city": p.current_city,
        })
    return standings


def build_rts_game_state(
    db: Session,
    event: ArenaMatch,
    participant: ArenaParticipant,
) -> GameState:
    from app.api.competitions import _event_to_out, _participant_to_out

    # tick 仅由 rts_scheduler 推进；HTTP 只读当前状态
    config = event.config or {}
    if ensure_player_registered(event, config, participant.id):
        persist_match_config(event, config)
    db.refresh(event)
    db.refresh(participant)

    current_round = get_active_round(db, event.id)
    markets_raw = build_rts_markets(event, current_round, db)
    markets = [
        CityMarket(
            city=m["city"],
            city_name=m["city_name"],
            products=[ProductPrice(**p) for p in m["products"]],
        )
        for m in markets_raw
    ]
    inv_raw = build_rts_inventory(participant, event, current_round)
    inventory = [PlayerInventoryItem(**i) for i in inv_raw]
    cap_raw = build_rts_capacity(participant, event)
    rts_meta = build_rts_meta(event, participant)
    rt = get_rts_runtime(event.config or {})
    phase = rt.get("phase", "warmup")
    status_val = event.status.value if hasattr(event.status, "value") else str(event.status)
    can_act = (
        rts_meta.get("can_trade", False)
        and phase in ("warmup", "running")
        and status_val == MatchStatus.playing.value
    )

    config_id = event.game_config_id or "trading-v2-rts"
    pricing = get_pricing_config(config_id)

    return GameState(
        event=_event_to_out(event, db),
        participant=_participant_to_out(participant, db),
        current_round=_round_to_out(current_round) if current_round else None,
        markets=markets,
        inventory=inventory,
        standings=_get_standings(event.id, db),
        time_remaining=rts_meta.get("seconds_until_next_tick"),
        is_practice=event.match_kind.value == "practice",
        game_mode="rts",
        pricing_mode=pricing.get("mode", "pool_ask_bid"),
        market_insights=[],
        has_submitted_this_round=False,
        can_submit_decision=can_act,
        inventory_capacity=InventoryCapacity(
            limit_per_product=0,
            total_items=sum(int(q) for q in (participant.inventory or {}).values()),
            by_product=cap_raw.get("by_product", {}),
            storage_capacity=cap_raw.get("storage_capacity"),
            storage_used=cap_raw.get("storage_used"),
            storage_remaining=cap_raw.get("storage_remaining"),
            vehicles=cap_raw.get("vehicles", []),
            max_vehicles=cap_raw.get("max_vehicles", 3),
        ),
        rts=rts_meta,
    )


def submit_rts_action(
    db: Session,
    event: ArenaMatch,
    participant: ArenaParticipant,
    data: RtsActionRequest,
) -> RtsActionResult:
    if event.status != MatchStatus.playing:
        raise BusinessException(
            message="比赛未在进行中",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    config = event.config or {}
    rt = get_rts_runtime(config)
    tick = int(rt.get("tick", 0))
    current_round = get_active_round(db, event.id)
    snapshot = (current_round.price_snapshot if current_round else {}) or {}

    ok, msg = validate_queue(
        participant, event, data.action_type.lower(), data.payload, snapshot, tick,
    )
    if not ok:
        return RtsActionResult(accepted=False, message=msg)

    queue_action(rt, participant.id, data.action_type.lower(), data.payload)
    persist_match_config(event, config)
    db.commit()

    state = build_rts_game_state(db, event, participant)
    return RtsActionResult(accepted=True, message=msg or "指令已排队，下 tick 执行", game_state=state)
