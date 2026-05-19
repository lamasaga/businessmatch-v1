"""组织者路由"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.models.user import User
from app.models.trading_competition import OrganizerProfile
from app.schemas.trading_competition import (
    OrganizerProfileCreate, OrganizerProfileOut, OrganizerProfileUpdate, OrganizerStats
)
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.core.dependencies import get_current_active_user, require_teacher

router = APIRouter(prefix="/organizer", tags=["组织者"])


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
