"""日常练习 — 单人独立商赛（practice + AI 对手占位）"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.db.database import get_db
from app.domains.arena.enums import DesignMode, GameEngineId, MatchKind, MatchStatus
from app.domains.arena.models import ArenaMatch, OrganizerProfile
from app.domains.arena.services.match_factory import create_practice_match
from app.domains.arena.services.match_lifecycle import begin_match
from app.domains.cybercore.registry import get_game_config, list_game_configs
from app.models.user import User
from app.domains.arena.serializers import event_to_out
from app.schemas.trading_competition import CompetitionEventOut, PracticeStartRequest

router = APIRouter(prefix="/practice", tags=["日常练习"])


def _platform_organizer(db: Session) -> OrganizerProfile:
    """日常练习场次挂靠平台组织者（与演示 admin 组织者共用档案）"""
    profile = db.query(OrganizerProfile).first()
    if not profile:
        raise BusinessException(
            message="组织者档案未初始化，请重启后端",
            code=ErrorCode.INTERNAL_ERROR,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    return profile


@router.get("/game-configs", response_model=ApiResponse[list])
def list_configs():
    return ApiResponse.ok(data=list_game_configs())


@router.post("/trading/start", response_model=ApiResponse[CompetitionEventOut], status_code=status.HTTP_201_CREATED)
def start_trading_practice(
    data: PracticeStartRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """创建并自动开始一场交易赛日常练习（单人，低权重 XP）"""
    config_id = data.game_config_id or "trading-v1"
    doc = get_game_config(config_id)
    if doc.engine != GameEngineId.trading.value:
        raise BusinessException(
            message="该配置非交易引擎，请使用对应练习接口",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    design = DesignMode(data.design_mode) if data.design_mode else DesignMode.standalone
    platform = _platform_organizer(db)
    overrides = data.config.model_dump() if data.config else None

    match, _participant = create_practice_match(
        db,
        platform_organizer=platform,
        user_id=current_user.id,
        game_config_id=config_id,
        design_mode=design,
        title=data.title,
        config_overrides=overrides,
    )
    begin_match(db, match)
    db.commit()
    db.refresh(match)
    return ApiResponse.ok(data=event_to_out(match, db))


@router.get("/my", response_model=ApiResponse[list])
def my_practice_matches(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    from app.domains.arena.models import ArenaParticipant

    event_ids = [
        row[0]
        for row in db.query(ArenaParticipant.event_id)
        .filter(ArenaParticipant.user_id == current_user.id)
        .all()
    ]
    if not event_ids:
        return ApiResponse.ok(data=[])

    matches = (
        db.query(ArenaMatch)
        .filter(
            ArenaMatch.id.in_(event_ids),
            ArenaMatch.match_kind == MatchKind.practice,
        )
        .order_by(ArenaMatch.created_at.desc())
        .limit(20)
        .all()
    )
    return ApiResponse.ok(data=[event_to_out(m, db) for m in matches])
