"""体验营营团 API"""

from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User, UserRole
from app.domains.arena.models import TeachingGroup, GroupMembership, ArenaMatch
from app.domains.arena.enums_group import TeachingGroupStatus
from app.domains.arena.services.teaching_group_service import (
    ensure_organizer_profile,
    unique_group_invite_code,
)
from app.schemas.teaching_groups import (
    TeachingGroupCreate,
    TeachingGroupUpdate,
    TeachingGroupJoin,
    TeachingGroupOut,
    TeachingGroupDetail,
    GroupMemberOut,
)
from app.schemas.trading_competition import CompetitionEventOut
from app.domains.arena.serializers import event_to_out
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.core.dependencies import get_current_active_user

router = APIRouter(prefix="/teaching-groups", tags=["体验营"])


def _group_counts(db: Session, group_id: int) -> tuple[int, int]:
    members = db.query(func.count(GroupMembership.id)).filter(
        GroupMembership.group_id == group_id
    ).scalar() or 0
    events = db.query(func.count(ArenaMatch.id)).filter(
        ArenaMatch.teaching_group_id == group_id
    ).scalar() or 0
    return members, events


def _teacher_username(db: Session, user_id: int) -> Optional[str]:
    u = db.query(User).filter(User.id == user_id).first()
    return u.username if u else None


def _group_to_out(group: TeachingGroup, db: Session) -> TeachingGroupOut:
    mc, ec = _group_counts(db, group.id)
    return TeachingGroupOut(
        id=group.id,
        name=group.name,
        description=group.description,
        invite_code=group.invite_code,
        teacher_user_id=group.teacher_user_id,
        teacher_username=_teacher_username(db, group.teacher_user_id),
        camp_start_at=group.camp_start_at,
        camp_end_at=group.camp_end_at,
        status=group.status.value if group.status else "active",
        created_at=group.created_at,
        member_count=mc,
        event_count=ec,
    )


def _require_teacher(user: User) -> None:
    if user.role not in (UserRole.admin, UserRole.teacher):
        raise BusinessException(
            message="仅教师或管理员可管理体验营",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )


@router.post("", response_model=ApiResponse[TeachingGroupOut], status_code=status.HTTP_201_CREATED)
def create_teaching_group(
    data: TeachingGroupCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    ensure_organizer_profile(db, current_user)

    group = TeachingGroup(
        name=data.name,
        description=data.description,
        invite_code=unique_group_invite_code(db),
        teacher_user_id=current_user.id,
        camp_start_at=data.camp_start_at,
        camp_end_at=data.camp_end_at,
        status=TeachingGroupStatus.active,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return ApiResponse.ok(data=_group_to_out(group, db))


@router.get("/mine", response_model=ApiResponse[List[TeachingGroupOut]])
def list_my_teaching_groups(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    groups = (
        db.query(TeachingGroup)
        .filter(TeachingGroup.teacher_user_id == current_user.id)
        .order_by(TeachingGroup.created_at.desc())
        .all()
    )
    return ApiResponse.ok(data=[_group_to_out(g, db) for g in groups])


@router.get("/joined", response_model=ApiResponse[List[TeachingGroupOut]])
def list_joined_groups(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    group_ids = [
        m.group_id
        for m in db.query(GroupMembership).filter(GroupMembership.user_id == current_user.id).all()
    ]
    if not group_ids:
        return ApiResponse.ok(data=[])
    groups = db.query(TeachingGroup).filter(TeachingGroup.id.in_(group_ids)).all()
    return ApiResponse.ok(data=[_group_to_out(g, db) for g in groups])


@router.post("/join", response_model=ApiResponse[TeachingGroupOut])
def join_teaching_group(
    data: TeachingGroupJoin,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    code = data.invite_code.strip().upper()
    group = db.query(TeachingGroup).filter(TeachingGroup.invite_code == code).first()
    if not group:
        raise BusinessException(
            message="邀请码无效",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if group.status != TeachingGroupStatus.active:
        raise BusinessException(
            message="该体验营已结束招募",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    existing = (
        db.query(GroupMembership)
        .filter(
            GroupMembership.group_id == group.id,
            GroupMembership.user_id == current_user.id,
        )
        .first()
    )
    if not existing:
        db.add(GroupMembership(group_id=group.id, user_id=current_user.id, role="student"))
        db.commit()
    return ApiResponse.ok(data=_group_to_out(group, db))


@router.get("/{group_id}", response_model=ApiResponse[TeachingGroupDetail])
def get_teaching_group(
    group_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    group = db.query(TeachingGroup).filter(TeachingGroup.id == group_id).first()
    if not group:
        raise BusinessException(
            message="体验营不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    is_teacher = group.teacher_user_id == current_user.id
    is_member = (
        db.query(GroupMembership)
        .filter(
            GroupMembership.group_id == group_id,
            GroupMembership.user_id == current_user.id,
        )
        .first()
    )
    if not is_teacher and not is_member and current_user.role != UserRole.admin:
        raise BusinessException(
            message="无权查看该体验营",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    members: List[GroupMemberOut] = []
    if is_teacher or current_user.role == UserRole.admin:
        rows = (
            db.query(GroupMembership, User)
            .join(User, User.id == GroupMembership.user_id)
            .filter(GroupMembership.group_id == group_id)
            .order_by(GroupMembership.joined_at.asc())
            .all()
        )
        for m, u in rows:
            members.append(
                GroupMemberOut(
                    user_id=u.id,
                    username=u.username,
                    role=m.role,
                    joined_at=m.joined_at,
                )
            )

    base = _group_to_out(group, db)
    return ApiResponse.ok(
        data=TeachingGroupDetail(**base.model_dump(), members=members)
    )


@router.patch("/{group_id}", response_model=ApiResponse[TeachingGroupOut])
def update_teaching_group(
    group_id: int,
    data: TeachingGroupUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    group = db.query(TeachingGroup).filter(TeachingGroup.id == group_id).first()
    if not group:
        raise BusinessException(
            message="体验营不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if group.teacher_user_id != current_user.id:
        raise BusinessException(
            message="无权修改该体验营",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    if data.name is not None:
        group.name = data.name
    if data.description is not None:
        group.description = data.description
    if data.status is not None:
        group.status = TeachingGroupStatus(data.status)
    if data.reset_invite_code:
        group.invite_code = unique_group_invite_code(db)
    db.commit()
    db.refresh(group)
    return ApiResponse.ok(data=_group_to_out(group, db))


@router.get("/{group_id}/events", response_model=ApiResponse[List[CompetitionEventOut]])
def list_group_events(
    group_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    group = db.query(TeachingGroup).filter(TeachingGroup.id == group_id).first()
    if not group:
        raise BusinessException(
            message="体验营不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    is_teacher = group.teacher_user_id == current_user.id
    is_member = (
        db.query(GroupMembership)
        .filter(
            GroupMembership.group_id == group_id,
            GroupMembership.user_id == current_user.id,
        )
        .first()
    )
    if not is_teacher and not is_member and current_user.role != UserRole.admin:
        raise BusinessException(
            message="无权查看",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    events = (
        db.query(ArenaMatch)
        .filter(ArenaMatch.teaching_group_id == group_id)
        .order_by(ArenaMatch.created_at.desc())
        .all()
    )
    return ApiResponse.ok(data=[event_to_out(e, db) for e in events])
