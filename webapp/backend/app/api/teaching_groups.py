"""体验营营团 API"""

from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User, UserRole
from app.domains.arena.models import TeachingGroup, GroupMembership, ArenaMatch
from app.domains.arena.models.participant import ArenaParticipant
from app.domains.arena.models.announcement import CampAnnouncement
from app.domains.arena.enums_group import TeachingGroupStatus
from app.domains.arena.enums import MatchStatus
from app.domains.career.models.xp_event import XpEvent
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
    AnnouncementCreate,
    AnnouncementOut,
    MemberProgressList,
    MemberProgressOut,
    MemberProgressSummary,
    CampDashboardOut,
)
from app.schemas.trading_competition import CompetitionEventOut
from app.domains.arena.serializers import event_to_out
from app.domains.arena.models.announcement import CampAnnouncement
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.core.dependencies import get_current_active_user
from datetime import datetime, timedelta

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


# ── 公告管理 ──

@router.get("/{group_id}/announcements", response_model=ApiResponse[List[AnnouncementOut]])
def list_announcements(
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
    announcements = (
        db.query(CampAnnouncement)
        .filter(CampAnnouncement.teaching_group_id == group_id)
        .order_by(CampAnnouncement.is_pinned.desc(), CampAnnouncement.created_at.desc())
        .all()
    )
    return ApiResponse.ok(data=[AnnouncementOut.model_validate(a) for a in announcements])


@router.post("/{group_id}/announcements", response_model=ApiResponse[AnnouncementOut], status_code=status.HTTP_201_CREATED)
def create_announcement(
    group_id: int,
    data: AnnouncementCreate,
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
    if group.teacher_user_id != current_user.id and current_user.role != UserRole.admin:
        raise BusinessException(
            message="无权管理该体验营",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    announcement = CampAnnouncement(
        teaching_group_id=group_id,
        title=data.title,
        content=data.content,
        created_by=current_user.id,
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return ApiResponse.ok(data=AnnouncementOut.model_validate(announcement))


@router.patch("/{group_id}/announcements/{announcement_id}/pin", response_model=ApiResponse[AnnouncementOut])
def pin_announcement(
    group_id: int,
    announcement_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    group = db.query(TeachingGroup).filter(TeachingGroup.id == group_id).first()
    if not group or group.teacher_user_id != current_user.id:
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    announcement = db.query(CampAnnouncement).filter(
        CampAnnouncement.id == announcement_id,
        CampAnnouncement.teaching_group_id == group_id,
    ).first()
    if not announcement:
        raise BusinessException(
            message="公告不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    announcement.is_pinned = not announcement.is_pinned
    db.commit()
    db.refresh(announcement)
    return ApiResponse.ok(data=AnnouncementOut.model_validate(announcement))


@router.delete("/{group_id}/announcements/{announcement_id}")
def delete_announcement(
    group_id: int,
    announcement_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    group = db.query(TeachingGroup).filter(TeachingGroup.id == group_id).first()
    if not group or group.teacher_user_id != current_user.id:
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    announcement = db.query(CampAnnouncement).filter(
        CampAnnouncement.id == announcement_id,
        CampAnnouncement.teaching_group_id == group_id,
    ).first()
    if not announcement:
        raise BusinessException(
            message="公告不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    db.delete(announcement)
    db.commit()
    return ApiResponse.ok(message="公告已删除")


# ── 学员进度看板 ──

def _calc_student_status(days_joined: int, match_count: int, last_active_days: Optional[int]) -> str:
    if match_count >= 2 and (last_active_days is not None and last_active_days <= 7):
        return "active"
    if match_count >= 1:
        return "normal"
    if days_joined > 7 and match_count == 0:
        return "attention"
    return "newcomer"


@router.get("/{group_id}/member-progress", response_model=ApiResponse[MemberProgressList])
def get_member_progress(
    group_id: int,
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
    if group.teacher_user_id != current_user.id and current_user.role != UserRole.admin:
        raise BusinessException(
            message="无权查看",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    now = datetime.now()
    week_ago = now - timedelta(days=7)

    # 获取所有成员
    rows = (
        db.query(GroupMembership, User)
        .join(User, User.id == GroupMembership.user_id)
        .filter(GroupMembership.group_id == group_id)
        .all()
    )

    # 获取本营团所有 event_ids
    event_ids = [
        e.id for e in db.query(ArenaMatch.id).filter(ArenaMatch.teaching_group_id == group_id).all()
    ]

    members_out: List[MemberProgressOut] = []
    summary = MemberProgressSummary()

    for m, u in rows:
        joined_at = m.joined_at.replace(tzinfo=None) if m.joined_at.tzinfo else m.joined_at
        days_joined = (now - joined_at).days

        # 参赛场次（本营团内）
        match_count = 0
        last_active_at = None
        if event_ids:
            participant_rows = (
                db.query(ArenaParticipant)
                .filter(
                    ArenaParticipant.user_id == u.id,
                    ArenaParticipant.event_id.in_(event_ids),
                )
                .all()
            )
            match_count = len(participant_rows)
            if participant_rows:
                last_joined = max(p.joined_at for p in participant_rows)
                last_active_at = last_joined.replace(tzinfo=None) if last_joined and last_joined.tzinfo else last_joined

        # 累计 XP
        xp_total = (
            db.query(func.sum(XpEvent.amount))
            .filter(XpEvent.user_id == u.id)
            .scalar()
        ) or 0

        last_active_days = None
        if last_active_at:
            last_active_days = (now - last_active_at).days

        status = _calc_student_status(days_joined, match_count, last_active_days)

        members_out.append(
            MemberProgressOut(
                user_id=u.id,
                username=u.username,
                joined_at=m.joined_at,
                match_count=match_count,
                total_xp=int(xp_total),
                last_active_at=last_active_at,
                status=status,
            )
        )

        summary.total += 1
        if status == "active":
            summary.active += 1
        elif status == "normal":
            summary.normal += 1
        elif status == "attention":
            summary.attention += 1
        else:
            summary.newcomer += 1

    return ApiResponse.ok(data=MemberProgressList(members=members_out, summary=summary))


# ── 营团 Dashboard ──

@router.get("/{group_id}/dashboard", response_model=ApiResponse[CampDashboardOut])
def get_camp_dashboard(
    group_id: int,
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
    if group.teacher_user_id != current_user.id and current_user.role != UserRole.admin:
        raise BusinessException(
            message="无权查看",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    now = datetime.now()
    week_ago = now - timedelta(days=7)

    # 成员数
    member_count = db.query(func.count(GroupMembership.id)).filter(
        GroupMembership.group_id == group_id
    ).scalar() or 0

    # 进行中商赛数
    from app.domains.arena.enums import MatchStatus
    active_event_count = db.query(func.count(ArenaMatch.id)).filter(
        ArenaMatch.teaching_group_id == group_id,
        ArenaMatch.status == MatchStatus.playing,
    ).scalar() or 0

    # 本周活跃人次（参赛）
    event_ids = [
        e.id for e in db.query(ArenaMatch.id).filter(ArenaMatch.teaching_group_id == group_id).all()
    ]
    weekly_active_count = 0
    if event_ids:
        weekly_active_count = db.query(func.count(ArenaParticipant.id)).filter(
            ArenaParticipant.event_id.in_(event_ids),
            ArenaParticipant.joined_at >= week_ago,
        ).scalar() or 0

    # 最新公告（置顶优先）
    announcements = (
        db.query(CampAnnouncement)
        .filter(CampAnnouncement.teaching_group_id == group_id)
        .order_by(CampAnnouncement.is_pinned.desc(), CampAnnouncement.created_at.desc())
        .limit(5)
        .all()
    )

    # 最近活动
    recent_events_raw = (
        db.query(ArenaMatch)
        .filter(ArenaMatch.teaching_group_id == group_id)
        .order_by(ArenaMatch.created_at.desc())
        .limit(5)
        .all()
    )
    recent_events = []
    for ev in recent_events_raw:
        recent_events.append({
            "id": ev.id,
            "title": ev.title,
            "status": ev.status.value if ev.status else "draft",
            "created_at": ev.created_at.isoformat() if ev.created_at else None,
        })

    return ApiResponse.ok(data=CampDashboardOut(
        member_count=member_count,
        active_event_count=active_event_count,
        weekly_active_count=weekly_active_count,
        recent_announcements=[AnnouncementOut.model_validate(a) for a in announcements],
        recent_events=recent_events,
    ))
