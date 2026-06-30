"""RTS 后台 tick 调度 — 每场比赛一个 asyncio 循环"""

from __future__ import annotations

import asyncio
import logging
from typing import Dict, Set

from app.db.database import SessionLocal
from app.domains.arena.enums import MatchStatus
from app.domains.arena.models import ArenaMatch
from app.games.trading.rts_config import is_rts_mode
from app.games.trading.rts_tick import maybe_advance_rts

logger = logging.getLogger(__name__)

_tasks: Dict[int, asyncio.Task] = {}
_running: Set[int] = set()
_app_loop: asyncio.AbstractEventLoop | None = None


def set_app_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    """在 FastAPI lifespan 启动时注册，供同步路由开赛时挂 tick 任务。"""
    global _app_loop
    _app_loop = loop


async def _tick_loop(match_id: int) -> None:
    try:
        while match_id in _running:
            db = SessionLocal()
            try:
                event = db.query(ArenaMatch).filter(ArenaMatch.id == match_id).first()
                if not event or event.status != MatchStatus.playing or not is_rts_mode(event.config):
                    break
                interval = int((event.config or {}).get("tick_interval_sec", (event.config or {}).get("day_interval_sec", 4)))
                advanced, finished = maybe_advance_rts(db, event)
                if advanced or finished:
                    db.commit()
                    db.refresh(event)
                    from app.games.trading.rts_ws import broadcast_rts_from_match

                    broadcast_rts_from_match(event, finished=finished)
                if finished:
                    break
            except Exception:
                logger.exception("RTS tick failed match_id=%s", match_id)
                db.rollback()
            finally:
                db.close()
            await asyncio.sleep(max(1, interval))
    finally:
        _running.discard(match_id)
        _tasks.pop(match_id, None)


def start_rts_scheduler(match_id: int) -> None:
    if match_id in _running:
        task = _tasks.get(match_id)
        if task and not task.done():
            return
        _running.discard(match_id)
    loop: asyncio.AbstractEventLoop | None = None
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = _app_loop
    if loop is None:
        logger.warning(
            "RTS scheduler 未启动（无事件循环）match_id=%s；tick 将无法推进，请重启后端",
            match_id,
        )
        return
    if match_id in _tasks and not _tasks[match_id].done():
        return
    _running.add(match_id)
    _tasks[match_id] = loop.create_task(_tick_loop(match_id))
    logger.info("RTS scheduler started match_id=%s", match_id)


def stop_rts_scheduler(match_id: int) -> None:
    _running.discard(match_id)
    task = _tasks.pop(match_id, None)
    if task and not task.done():
        task.cancel()


def resume_playing_rts_matches() -> None:
    """应用启动时恢复进行中的 RTS 场次调度"""
    from app.domains.arena.enums import MatchStatus
    from app.domains.arena.models import ArenaMatch

    db = SessionLocal()
    try:
        matches = (
            db.query(ArenaMatch)
            .filter(ArenaMatch.status == MatchStatus.playing)
            .all()
        )
        for m in matches:
            if is_rts_mode(m.config):
                start_rts_scheduler(m.id)
    finally:
        db.close()
