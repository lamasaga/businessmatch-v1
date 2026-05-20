"""浮生记 RTS WebSocket — 只读订阅 tick 推送（推进仅由调度器负责）"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.database import SessionLocal
from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.games.trading.rts_config import is_rts_mode
from app.games.trading.rts_state import get_rts_runtime, seconds_until_next_tick
from app.games.trading.rts_ws import hub
from app.domains.arena.models import OrganizerProfile

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/trading", tags=["交易游戏-WebSocket"])


def _user_from_token(token: str) -> int | None:
    payload = decode_token(token)
    if not payload:
        return None
    sub = payload.get("sub")
    if sub is None:
        return None
    return int(sub) if not isinstance(sub, int) else sub


def _can_subscribe_rts(db: Session, event: ArenaMatch, user_id: int) -> bool:
    if not is_rts_mode(event.config):
        return False
    participant = (
        db.query(ArenaParticipant)
        .filter(
            ArenaParticipant.event_id == event.id,
            ArenaParticipant.user_id == user_id,
        )
        .first()
    )
    if participant:
        return True
    profile = db.query(OrganizerProfile).filter(OrganizerProfile.user_id == user_id).first()
    return bool(profile and event.organizer_id == profile.id)


@router.websocket("/events/{event_id}/ws")
async def rts_event_websocket(
    websocket: WebSocket,
    event_id: int,
    token: str = Query(..., description="JWT access token"),
):
    user_id = _user_from_token(token)
    if user_id is None:
        await websocket.accept()
        await websocket.close(code=4401, reason="Unauthorized")
        return

    db = SessionLocal()
    try:
        event = db.query(ArenaMatch).filter(ArenaMatch.id == event_id).first()
        if not event or not _can_subscribe_rts(db, event, user_id):
            await websocket.accept()
            await websocket.close(code=4403, reason="Forbidden")
            return

        rt = get_rts_runtime(event.config or {})
        await hub.connect(event_id, websocket)
        await websocket.send_json({
            "type": "connected",
            "event_id": event_id,
            "tick": int(rt.get("tick", 0)),
            "phase": rt.get("phase", "warmup"),
            "seconds_until_next_tick": seconds_until_next_tick(rt),
            "finished": event.status.value == "finished",
        })

        while True:
            raw = await websocket.receive_text()
            if raw.strip().lower() == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("RTS WebSocket error event_id=%s", event_id)
    finally:
        hub.disconnect(event_id, websocket)
        db.close()
