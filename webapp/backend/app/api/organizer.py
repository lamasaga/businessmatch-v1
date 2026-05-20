"""组织者路由"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.db.database import get_db
from app.models.user import User
from app.models.trading_competition import (
    OrganizerProfile,
    CompetitionEvent,
    CompetitionParticipant,
    TradingRound,
    TradingDecision,
    EventStatus,
    RoundStatus,
)
from app.schemas.trading_competition import (
    OrganizerProfileCreate,
    OrganizerProfileOut,
    OrganizerProfileUpdate,
    OrganizerStats,
    OrganizerControlOut,
    CompetitionEventOut,
)
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.core.dependencies import get_current_active_user

router = APIRouter(prefix="/organizer", tags=["组织者"])


def _get_profile_or_404(user_id: int, db: Session) -> OrganizerProfile:
    profile = db.query(OrganizerProfile).filter(OrganizerProfile.user_id == user_id).first()
    if not profile:
        raise BusinessException(
            message="您还不是组织者，请先申请",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return profile


@router.post("/apply", response_model=ApiResponse[OrganizerProfileOut], status_code=status.HTTP_201_CREATED)
def apply_organizer(
    data: OrganizerProfileCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """申请成为组织者"""
    # 检查是否已经是组织者
    existing = db.query(OrganizerProfile).filter(OrganizerProfile.user_id == current_user.id).first()
    if existing:
        raise BusinessException(
            message="您已经是组织者",
            code=ErrorCode.DUPLICATE_ENTRY,
            status_code=status.HTTP_409_CONFLICT,
        )

    profile = OrganizerProfile(
        user_id=current_user.id,
        organization_name=data.organization_name,
        contact_phone=data.contact_phone,
        verified=False,  # 需要管理员审核
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return ApiResponse.ok(data=OrganizerProfileOut.model_validate(profile))


@router.get("/profile", response_model=ApiResponse[OrganizerProfileOut])
def get_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取组织者档案"""
    profile = db.query(OrganizerProfile).filter(OrganizerProfile.user_id == current_user.id).first()
    if not profile:
        raise BusinessException(
            message="您还不是组织者，请先申请",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return ApiResponse.ok(data=OrganizerProfileOut.model_validate(profile))


@router.put("/profile", response_model=ApiResponse[OrganizerProfileOut])
def update_profile(
    data: OrganizerProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """更新组织者信息"""
    profile = db.query(OrganizerProfile).filter(OrganizerProfile.user_id == current_user.id).first()
    if not profile:
        raise BusinessException(
            message="您还不是组织者",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    if data.organization_name is not None:
        profile.organization_name = data.organization_name
    if data.contact_phone is not None:
        profile.contact_phone = data.contact_phone

    db.commit()
    db.refresh(profile)
    return ApiResponse.ok(data=OrganizerProfileOut.model_validate(profile))


@router.get("/stats", response_model=ApiResponse[OrganizerStats])
def get_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取组织者统计数据"""
    profile = db.query(OrganizerProfile).filter(OrganizerProfile.user_id == current_user.id).first()
    if not profile:
        raise BusinessException(
            message="您还不是组织者",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    from app.models.trading_competition import CompetitionEvent, EventStatus

    active_count = db.query(CompetitionEvent).filter(
        CompetitionEvent.organizer_id == profile.id,
        CompetitionEvent.status.in_([EventStatus.registration, EventStatus.playing])
    ).count()

    finished_count = db.query(CompetitionEvent).filter(
        CompetitionEvent.organizer_id == profile.id,
        CompetitionEvent.status == EventStatus.finished
    ).count()

    return ApiResponse.ok(data=OrganizerStats(
        total_events_hosted=profile.total_events_hosted,
        total_participants=profile.total_participants,
        active_events=active_count,
        finished_events=finished_count,
    ))


@router.get("/events", response_model=ApiResponse[List[CompetitionEventOut]])
def list_my_events(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取当前组织者主办的比赛列表"""
    profile = _get_profile_or_404(current_user.id, db)
    query = db.query(CompetitionEvent).filter(CompetitionEvent.organizer_id == profile.id)
    if status_filter:
        query = query.filter(CompetitionEvent.status == status_filter)
    events = query.order_by(CompetitionEvent.created_at.desc()).all()

    from app.api.competitions import _event_to_out

    return ApiResponse.ok(data=[_event_to_out(e, db) for e in events])


@router.get("/events/{event_id}/control", response_model=ApiResponse[OrganizerControlOut])
def get_event_control(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """组织者控场面板：赛事状态、回合、排行榜、参赛者（无需本人参赛）"""
    profile = _get_profile_or_404(current_user.id, db)
    event = db.query(CompetitionEvent).filter(CompetitionEvent.id == event_id).first()
    if not event:
        raise BusinessException(
            message="比赛不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if event.organizer_id != profile.id:
        raise BusinessException(
            message="您不是这场比赛的组织者",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    from app.api.competitions import _event_to_out, _participant_to_out, _calc_inventory_value
    from app.api.trading import _round_to_out
    from app.games.trading.rts_config import is_rts_mode
    from app.games.trading.rts_state import get_rts_runtime, seconds_until_next_tick

    rts_info = None
    if is_rts_mode(event.config):
        rt = get_rts_runtime(event.config or {})
        rts_info = {
            "tick": rt.get("tick", 0),
            "total_ticks": rt.get("total_ticks", 120),
            "phase": rt.get("phase", "warmup"),
            "tick_interval_sec": int(rt.get("tick_interval_sec", 5)),
            "seconds_until_next_tick": seconds_until_next_tick(rt),
            "duration_preset": (event.config or {}).get("duration_preset", "standard"),
        }

    participants = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.event_id == event_id,
    ).order_by(CompetitionParticipant.total_assets.desc()).all()

    current_round = db.query(TradingRound).filter(
        TradingRound.event_id == event_id,
    ).order_by(TradingRound.round_number.desc()).first()

    decisions_submitted = 0
    if current_round and current_round.status == RoundStatus.active:
        decisions_submitted = db.query(func.count(TradingDecision.id)).filter(
            TradingDecision.round_id == current_round.id,
        ).scalar() or 0

    standings = []
    for rank, p in enumerate(participants, 1):
        user = p.user
        inventory_value = _calc_inventory_value(p.inventory, event_id, db)
        standings.append({
            "rank": rank,
            "user_id": user.id,
            "username": user.username,
            "avatar": user.avatar,
            "cash": p.cash,
            "inventory_value": inventory_value,
            "total_assets": p.total_assets,
            "current_city": p.current_city,
        })

    return ApiResponse.ok(data=OrganizerControlOut(
        event=_event_to_out(event, db),
        current_round=_round_to_out(current_round) if current_round else None,
        standings=standings,
        participants=[_participant_to_out(p, db) for p in participants],
        decisions_submitted=decisions_submitted,
        rts=rts_info,
    ))
