"""
引擎匣子回调接收端点。
引擎通过 HTTP POST 向平台推送状态变化事件。
"""

from typing import Any
from fastapi import APIRouter, Request, Header
from sqlalchemy.orm import Session

from app.core.response import ApiResponse
from app.core.dependencies import get_db
from app.db.database import SessionLocal
from app.domains.arena.models import ArenaMatch
from app.domains.career.services.rewards import settle_match_rewards

router = APIRouter(prefix="/engine/callbacks", tags=["引擎回调"])


# ─── Callback Handlers ───────────────────────────────────────────────

@router.post("/match/state")
async def on_match_state_changed(
    request: Request,
    x_event_type: str = Header(default=""),
) -> ApiResponse[dict]:
    """
    接收引擎的 match.state_changed 回调。
    引擎每回合/tick 结算后推送最新状态。
    """
    body = await request.json()
    payload = body.get("payload", {})
    match_id = payload.get("match_id")
    state = payload.get("state", {})

    # TODO: 更新本地比赛缓存状态（如 WebSocket 广播）
    # TODO: 将引擎状态同步到前端

    return ApiResponse.ok(data={"received": True, "match_id": match_id})


@router.post("/match/finished")
async def on_match_finished(
    request: Request,
    x_event_type: str = Header(default=""),
) -> ApiResponse[dict]:
    """
    接收引擎的 match.finished 回调。
    引擎比赛结束时推送最终结果，平台负责 XP 入账。
    """
    body = await request.json()
    payload = body.get("payload", {})
    match_id = payload.get("match_id")
    result = payload.get("result", {})

    # 异步处理：XP 入账
    # TODO: 改为后台任务或消息队列
    db = SessionLocal()
    try:
        match = db.query(ArenaMatch).filter(
            ArenaMatch.engine_match_id == match_id
        ).first()

        if match and result:
            xp_payload = result.get("xp_payload")
            if xp_payload:
                # 调用 Career 域结算
                # settle_match_rewards(db, match, xp_payload)
                pass

            # 更新本地比赛状态
            from app.domains.arena.enums import MatchStatus
            match.status = MatchStatus.finished
            db.commit()
    finally:
        db.close()

    return ApiResponse.ok(data={"received": True, "match_id": match_id})


@router.post("/match/joined")
async def on_player_joined(
    request: Request,
    x_event_type: str = Header(default=""),
) -> ApiResponse[dict]:
    """
    接收引擎的 match.player_joined 回调。
    """
    body = await request.json()
    payload = body.get("payload", {})
    match_id = payload.get("match_id")
    player_id = payload.get("player_id")

    return ApiResponse.ok(data={"received": True, "match_id": match_id, "player_id": player_id})


# ─── Health / Discovery ──────────────────────────────────────────────

@router.get("/health")
async def callback_health():
    """供引擎检查回调端点可用性。"""
    return ApiResponse.ok(data={"status": "ready"})
