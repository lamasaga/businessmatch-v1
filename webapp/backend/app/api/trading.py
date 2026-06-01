"""FStrading 路由 — RTS 即时商战（HTTP 只读 + 排队指令）"""

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.schemas.trading_competition import GameState, RtsActionRequest, RtsActionResult, WorldGeoPackOut
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.core.dependencies import get_current_active_user
from app.api.trading_rts_handlers import build_rts_game_state, submit_rts_action
from app.games.trading.round_presenter import round_to_out as _round_to_out  # noqa: F401 — 兼容 organizer 等旧导入
from app.games.trading.rts_config import is_rts_mode
from app.games.trading.models import TradingRound
from app.games.trading.world_slice import geo_pack_for_region
from app.domains.cybercore.registry import get_game_config

CompetitionEvent = ArenaMatch
CompetitionParticipant = ArenaParticipant

router = APIRouter(prefix="/trading", tags=["交易游戏"])


def _require_rts_event(event: ArenaMatch) -> None:
    if not is_rts_mode(event.config):
        raise BusinessException(
            message="仅支持 FStrading（RTS）赛制；回合制已移除",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


@router.get("/events/{event_id}/state", response_model=ApiResponse[GameState])
def get_game_state(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取当前 RTS 对局状态（只读，不推进 tick）"""
    event = db.query(CompetitionEvent).filter(CompetitionEvent.id == event_id).first()
    if not event:
        raise BusinessException(
            message="比赛不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    _require_rts_event(event)

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

    state = build_rts_game_state(db, event, participant)
    db.commit()
    return ApiResponse.ok(data=state)


@router.post("/events/{event_id}/actions", response_model=ApiResponse[RtsActionResult])
def submit_rts_game_action(
    event_id: int,
    data: RtsActionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """RTS：提交即时指令（下 tick 结算）"""
    event = db.query(CompetitionEvent).filter(CompetitionEvent.id == event_id).first()
    if not event:
        raise BusinessException(
            message="比赛不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    _require_rts_event(event)

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

    result = submit_rts_action(db, event, participant, data)
    db.commit()
    return ApiResponse.ok(data=result)


@router.get("/events/{event_id}/history", response_model=ApiResponse[List[Dict[str, Any]]])
def get_price_history(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取 tick 价格历史（TradingRound 快照）"""
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

    rounds = (
        db.query(TradingRound)
        .filter(TradingRound.event_id == event_id)
        .order_by(TradingRound.round_number)
        .all()
    )
    history = [
        {
            "round_number": r.round_number,
            "status": r.status.value if r.status else "pending",
            "events": r.events,
            "prices": r.price_snapshot,
        }
        for r in rounds
    ]
    return ApiResponse.ok(data=history)


@router.get("/regions/{region_id}/geo-pack", response_model=ApiResponse[WorldGeoPackOut])
def get_region_geo_pack(
    region_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """获取区域地理包（锚点、路网边、美术资源路径）— 开赛前预加载"""
    try:
        pack = geo_pack_for_region(region_id)
    except FileNotFoundError:
        raise BusinessException(
            message=f"地理包不存在: {region_id}",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return ApiResponse.ok(data=WorldGeoPackOut(**pack))


@router.get("/game-configs/{config_id}/geo-pack", response_model=ApiResponse[WorldGeoPackOut])
def get_game_config_geo_pack(
    config_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """按赛制包 id 解析默认 world 区域并返回地理包"""
    try:
        doc = get_game_config(config_id)
    except KeyError:
        raise BusinessException(
            message=f"赛制配置不存在: {config_id}",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    region_id = (doc.meta or {}).get("world_region_id") or (doc.defaults or {}).get("world", {}).get("region_id")
    if not region_id:
        raise BusinessException(
            message="该赛制未绑定拟真城市区域",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    pack = geo_pack_for_region(str(region_id))
    return ApiResponse.ok(data=WorldGeoPackOut(**pack))
