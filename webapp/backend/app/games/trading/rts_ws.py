"""浮生记 RTS WebSocket 推送 — tick 由调度器推进后广播"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class RtsWsHub:
    """按 event_id 分房间；调度器在 commit 后广播 tick / finished。"""

    def __init__(self) -> None:
        self._rooms: Dict[int, Set[WebSocket]] = {}
        self._loop: asyncio.AbstractEventLoop | None = None

    def set_event_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    async def connect(self, event_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._rooms.setdefault(event_id, set()).add(websocket)

    def disconnect(self, event_id: int, websocket: WebSocket) -> None:
        room = self._rooms.get(event_id)
        if not room:
            return
        room.discard(websocket)
        if not room:
            self._rooms.pop(event_id, None)

    async def broadcast(self, event_id: int, message: Dict[str, Any]) -> None:
        room = list(self._rooms.get(event_id, set()))
        if not room:
            return
        dead: list[WebSocket] = []
        for ws in room:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(event_id, ws)

    def schedule_broadcast(self, event_id: int, message: Dict[str, Any]) -> None:
        """从调度器同步上下文安全地投递到事件循环。"""
        loop = self._loop
        if loop is None:
            return
        try:
            asyncio.run_coroutine_threadsafe(self.broadcast(event_id, message), loop)
        except Exception:
            logger.exception("RTS WS schedule_broadcast failed event_id=%s", event_id)


hub = RtsWsHub()


def broadcast_rts_from_match(event, *, finished: bool = False) -> None:
    """在 db.commit() 之后调用，向订阅者推送当前 runtime 快照。"""
    from app.games.trading.rts_state import get_rts_runtime, seconds_until_next_tick

    config = event.config or {}
    rt = get_rts_runtime(config)
    broadcast_rts_tick(
        event.id,
        tick=int(rt.get("tick", 0)),
        phase=str(rt.get("phase", "finished" if finished else "running")),
        seconds_until_next_tick=0 if finished else seconds_until_next_tick(rt),
        finished=finished,
    )


def broadcast_rts_tick(
    event_id: int,
    *,
    tick: int,
    phase: str,
    seconds_until_next_tick: int,
    finished: bool = False,
) -> None:
    hub.schedule_broadcast(
        event_id,
        {
            "type": "finished" if finished else "tick",
            "event_id": event_id,
            "tick": tick,
            "phase": phase,
            "seconds_until_next_tick": seconds_until_next_tick,
            "finished": finished,
        },
    )
