"""RTS tick 推进"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.domains.arena.enums import MatchKind, MatchStatus
from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.domains.arena.config_json import persist_match_config
from app.domains.career.services.rewards import settle_match_rewards
from app.games.trading import TradingRound, RoundStatus
from app.games.trading.rts_actions import advance_transits, apply_distributors, apply_pending_actions, natural_pool_tick
from app.games.trading.rts_ai import enqueue_ai_actions
from app.games.trading.rts_config import is_rts_mode
from app.games.trading.rts_events import advance_market_events
from app.games.trading.rts_state import (
    build_price_snapshot,
    get_rts_runtime,
    init_rts_runtime,
    phase_for_tick,
    should_advance_tick,
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _utc_now_dt() -> datetime:
    """ORM 字段用真实 datetime；勿用 func.now() 以免未 flush 时序列化失败。"""
    return datetime.now(timezone.utc)


def ensure_rts_runtime(event: ArenaMatch, config_id: str) -> dict:
    config = event.config or {}
    rt = get_rts_runtime(config)
    if not rt.get("cities"):
        config["rts_runtime"] = init_rts_runtime(config, config_id)
        persist_match_config(event, config)
        rt = config["rts_runtime"]
    return rt


def create_rts_first_round(db: Session, event: ArenaMatch) -> TradingRound:
    config_id = event.game_config_id or "fstrading"
    config = event.config or {}
    rt = init_rts_runtime(config, config_id)
    config["rts_runtime"] = rt
    persist_match_config(event, config)

    snapshot = build_price_snapshot(rt, config, config_id)
    rnd = TradingRound(
        event_id=event.id,
        round_number=0,
        status=RoundStatus.active,
        events=[],
        price_snapshot=snapshot,
        started_at=_utc_now_dt(),
    )
    db.add(rnd)
    db.flush()
    return rnd


def maybe_advance_rts(db: Session, event: ArenaMatch) -> Tuple[bool, bool]:
    """
    若距上次 tick 已满间隔则推进（仅由 rts_scheduler 调用，HTTP 不得推进）。
    返回 (是否推进了, 比赛是否已结束)
    """
    if not is_rts_mode(event.config):
        return False, False
    if event.status != MatchStatus.playing:
        return False, event.status == MatchStatus.finished

    locked = (
        db.query(ArenaMatch)
        .filter(ArenaMatch.id == event.id)
        .with_for_update()
        .first()
    )
    if not locked:
        return False, False
    event = locked

    config_id = event.game_config_id or "fstrading"
    config = event.config or {}
    rt = ensure_rts_runtime(event, config_id)

    if not should_advance_tick(rt):
        return False, False

    next_tick = int(rt.get("tick", 0)) + 1
    dup = (
        db.query(TradingRound)
        .filter(
            TradingRound.event_id == event.id,
            TradingRound.round_number == next_tick,
        )
        .first()
    )
    if dup:
        if int(rt.get("tick", 0)) < next_tick:
            rt["tick"] = next_tick
            rt["phase"] = phase_for_tick(next_tick, rt)
            persist_match_config(event, config)
        return False, event.status == MatchStatus.finished

    finished = advance_one_tick(db, event)
    return True, finished


def advance_one_tick(db: Session, event: ArenaMatch) -> bool:
    """推进一个 tick，返回是否整场结束"""
    config_id = event.game_config_id or "fstrading"
    config = event.config or {}
    rt = ensure_rts_runtime(event, config_id)

    current_tick = int(rt.get("tick", 0))
    next_tick = current_tick + 1
    rt["tick"] = next_tick
    rt["phase"] = phase_for_tick(next_tick, rt)
    rt["last_tick_at"] = _utc_now_iso()
    rt["tick_events"] = []

    participants = (
        db.query(ArenaParticipant)
        .filter(ArenaParticipant.event_id == event.id)
        .all()
    )
    cash_at_tick_start = {p.id: float(p.cash) for p in participants}
    assets_at_tick_start = {p.id: float(p.total_assets) for p in participants}

    latest = (
        db.query(TradingRound)
        .filter(TradingRound.event_id == event.id)
        .order_by(TradingRound.round_number.desc())
        .first()
    )
    snapshot = (latest.price_snapshot if latest else {}) or {}

    advance_transits(config, participants, next_tick)
    advance_market_events(rt, config, config_id, event.id)
    apply_pending_actions(db, event, participants, snapshot, rt, next_tick)
    natural_pool_tick(rt, config, config_id)
    snapshot = build_price_snapshot(rt, config, config_id)
    apply_distributors(event, participants, snapshot, rt, next_tick)
    snapshot = build_price_snapshot(rt, config, config_id)

    if event.match_kind == MatchKind.practice:
        enqueue_ai_actions(event, participants, snapshot, rt)
        apply_pending_actions(db, event, participants, snapshot, rt, next_tick)
        natural_pool_tick(rt, config, config_id)
        snapshot = build_price_snapshot(rt, config, config_id)
        apply_distributors(event, participants, snapshot, rt, next_tick)
        snapshot = build_price_snapshot(rt, config, config_id)

    for p in participants:
        from app.games.trading.rts_actions import _refresh_assets
        _refresh_assets(p, snapshot, config_id, config)

    from app.games.trading.rts_actions import finalize_tick_digests
    finalize_tick_digests(
        config,
        participants,
        next_tick,
        config_id,
        cash_at_tick_start=cash_at_tick_start,
        assets_at_tick_start=assets_at_tick_start,
    )

    if latest and latest.status == RoundStatus.active:
        latest.status = RoundStatus.completed
        latest.ended_at = _utc_now_dt()

    new_round = TradingRound(
        event_id=event.id,
        round_number=next_tick,
        status=RoundStatus.active,
        events=rt.get("tick_events", []),
        price_snapshot=snapshot,
        started_at=_utc_now_dt(),
    )
    db.add(new_round)
    event.current_round = next_tick
    persist_match_config(event, config)

    total = int(rt.get("total_ticks", 120))
    if next_tick >= total:
        _finish_rts_match(db, event, participants)
        return True
    return False


def finish_rts_match(db: Session, event: ArenaMatch, participants: list | None = None) -> None:
    """正常结束或组织者提前结束时共用收尾。"""
    if participants is None:
        participants = (
            db.query(ArenaParticipant)
            .filter(ArenaParticipant.event_id == event.id)
            .all()
        )
    _finish_rts_match(db, event, participants)


def _finish_rts_match(db: Session, event: ArenaMatch, participants: list) -> None:
    from app.domains.arena.enums import ParticipantStatus

    active = (
        db.query(TradingRound)
        .filter(TradingRound.event_id == event.id, TradingRound.status == RoundStatus.active)
        .all()
    )
    for r in active:
        r.status = RoundStatus.completed
        r.ended_at = _utc_now_dt()

    ranked = sorted(participants, key=lambda x: x.total_assets, reverse=True)
    for rank, p in enumerate(ranked, 1):
        p.final_rank = rank
        p.status = ParticipantStatus.joined

    settle_match_rewards(db, event, ranked)
    event.status = MatchStatus.finished
    event.ends_at = _utc_now_dt()
    config = event.config or {}
    rt = get_rts_runtime(config)
    rt["phase"] = "finished"
    event.current_round = int(rt.get("tick", event.current_round or 0))
    persist_match_config(event, config)

    from app.games.trading.rts_scheduler import stop_rts_scheduler

    stop_rts_scheduler(event.id)
    # finished 广播在 db.commit() 之后由调用方或调度器发送，避免客户端读到未提交状态


def get_active_round(db: Session, event_id: int) -> Optional[TradingRound]:
    return (
        db.query(TradingRound)
        .filter(TradingRound.event_id == event_id)
        .order_by(TradingRound.round_number.desc())
        .first()
    )
