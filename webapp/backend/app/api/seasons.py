"""赛季与里程碑 API"""

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User, UserRole
from app.domains.arena.models import TeachingGroup
from app.domains.arena.models.season import Season, SeasonMilestone
from app.schemas.seasons import (
    SeasonCreate, SeasonUpdate, SeasonOut, SeasonDetail,
    SeasonMilestoneCreate, SeasonMilestoneUpdate, SeasonMilestoneOut,
)
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.core.dependencies import get_current_active_user

router = APIRouter(prefix="/seasons", tags=["赛季"])


def _require_teacher(user: User) -> None:
    if user.role not in (UserRole.admin, UserRole.teacher):
        raise BusinessException(
            message="仅教师或管理员可操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )


def _season_to_out(season: Season, db: Session) -> SeasonOut:
    mc = db.query(func.count(SeasonMilestone.id)).filter(SeasonMilestone.season_id == season.id).scalar() or 0
    return SeasonOut(
        id=season.id,
        teaching_group_id=season.teaching_group_id,
        title=season.title,
        description=season.description,
        theme=season.theme,
        status=season.status,
        start_at=season.start_at,
        end_at=season.end_at,
        created_by=season.created_by,
        created_at=season.created_at,
        config_json=season.config_json,
        milestone_count=mc,
    )


# ── 赛季管理 ──

@router.post("", response_model=ApiResponse[SeasonOut], status_code=status.HTTP_201_CREATED)
def create_season(
    data: SeasonCreate,
    teaching_group_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    group = db.query(TeachingGroup).filter(TeachingGroup.id == teaching_group_id).first()
    if not group:
        raise BusinessException(
            message="体验营不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if group.teacher_user_id != current_user.id and current_user.role != UserRole.admin:
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    season = Season(
        teaching_group_id=teaching_group_id,
        title=data.title,
        description=data.description,
        theme=data.theme,
        status="draft",
        start_at=data.start_at,
        end_at=data.end_at,
        created_by=current_user.id,
        config_json=data.config_json,
    )
    db.add(season)
    db.commit()
    db.refresh(season)
    return ApiResponse.ok(data=_season_to_out(season, db))


@router.get("/by-group/{group_id}", response_model=ApiResponse[List[SeasonOut]])
def list_seasons(
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
    # 教师或成员可查看
    is_teacher = group.teacher_user_id == current_user.id
    if not is_teacher and current_user.role != UserRole.admin:
        # 学生仅能看到非草稿赛季
        seasons = (
            db.query(Season)
            .filter(Season.teaching_group_id == group_id, Season.status != "draft")
            .order_by(Season.created_at.desc())
            .all()
        )
    else:
        seasons = (
            db.query(Season)
            .filter(Season.teaching_group_id == group_id)
            .order_by(Season.created_at.desc())
            .all()
        )
    return ApiResponse.ok(data=[_season_to_out(s, db) for s in seasons])


@router.get("/{season_id}", response_model=ApiResponse[SeasonDetail])
def get_season(
    season_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise BusinessException(
            message="赛季不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    group = db.query(TeachingGroup).filter(TeachingGroup.id == season.teaching_group_id).first()
    is_teacher = group and group.teacher_user_id == current_user.id
    if season.status == "draft" and not is_teacher and current_user.role != UserRole.admin:
        raise BusinessException(
            message="无权查看",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    base = _season_to_out(season, db)
    milestones = (
        db.query(SeasonMilestone)
        .filter(SeasonMilestone.season_id == season_id)
        .order_by(SeasonMilestone.sequence_order.asc())
        .all()
    )
    return ApiResponse.ok(data=SeasonDetail(
        **base.model_dump(),
        milestones=[SeasonMilestoneOut.model_validate(m) for m in milestones],
    ))


@router.patch("/{season_id}", response_model=ApiResponse[SeasonOut])
def update_season(
    season_id: int,
    data: SeasonUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise BusinessException(
            message="赛季不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    group = db.query(TeachingGroup).filter(TeachingGroup.id == season.teaching_group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    if data.title is not None:
        season.title = data.title
    if data.description is not None:
        season.description = data.description
    if data.theme is not None:
        season.theme = data.theme
    if data.status is not None:
        season.status = data.status
    if data.start_at is not None:
        season.start_at = data.start_at
    if data.end_at is not None:
        season.end_at = data.end_at
    if data.config_json is not None:
        season.config_json = data.config_json
    db.commit()
    db.refresh(season)
    return ApiResponse.ok(data=_season_to_out(season, db))


@router.delete("/{season_id}")
def delete_season(
    season_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise BusinessException(
            message="赛季不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    group = db.query(TeachingGroup).filter(TeachingGroup.id == season.teaching_group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    db.delete(season)
    db.commit()
    return ApiResponse.ok(message="赛季已删除")


@router.post("/{season_id}/publish", response_model=ApiResponse[SeasonOut])
def publish_season(
    season_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise BusinessException(
            message="赛季不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    group = db.query(TeachingGroup).filter(TeachingGroup.id == season.teaching_group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    if season.status != "draft":
        raise BusinessException(
            message="仅草稿赛季可发布",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    season.status = "recruiting"
    db.commit()
    db.refresh(season)
    return ApiResponse.ok(data=_season_to_out(season, db))


@router.post("/{season_id}/close", response_model=ApiResponse[SeasonOut])
def close_season(
    season_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise BusinessException(
            message="赛季不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    group = db.query(TeachingGroup).filter(TeachingGroup.id == season.teaching_group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    season.status = "closed"
    db.commit()
    db.refresh(season)
    return ApiResponse.ok(data=_season_to_out(season, db))


# ── 里程碑管理 ──

@router.post("/{season_id}/milestones", response_model=ApiResponse[SeasonMilestoneOut], status_code=status.HTTP_201_CREATED)
def create_milestone(
    season_id: int,
    data: SeasonMilestoneCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise BusinessException(
            message="赛季不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    group = db.query(TeachingGroup).filter(TeachingGroup.id == season.teaching_group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    milestone = SeasonMilestone(
        season_id=season_id,
        title=data.title,
        description=data.description,
        milestone_type=data.milestone_type,
        sequence_order=data.sequence_order,
        due_at=data.due_at,
        config_json=data.config_json,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return ApiResponse.ok(data=SeasonMilestoneOut.model_validate(milestone))


@router.patch("/{season_id}/milestones/{milestone_id}", response_model=ApiResponse[SeasonMilestoneOut])
def update_milestone(
    season_id: int,
    milestone_id: int,
    data: SeasonMilestoneUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    milestone = db.query(SeasonMilestone).filter(
        SeasonMilestone.id == milestone_id,
        SeasonMilestone.season_id == season_id,
    ).first()
    if not milestone:
        raise BusinessException(
            message="里程碑不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    season = db.query(Season).filter(Season.id == season_id).first()
    group = db.query(TeachingGroup).filter(TeachingGroup.id == season.teaching_group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    if data.title is not None:
        milestone.title = data.title
    if data.description is not None:
        milestone.description = data.description
    if data.sequence_order is not None:
        milestone.sequence_order = data.sequence_order
    if data.status is not None:
        milestone.status = data.status
    if data.due_at is not None:
        milestone.due_at = data.due_at
    if data.config_json is not None:
        milestone.config_json = data.config_json
    db.commit()
    db.refresh(milestone)
    return ApiResponse.ok(data=SeasonMilestoneOut.model_validate(milestone))


@router.delete("/{season_id}/milestones/{milestone_id}")
def delete_milestone(
    season_id: int,
    milestone_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    milestone = db.query(SeasonMilestone).filter(
        SeasonMilestone.id == milestone_id,
        SeasonMilestone.season_id == season_id,
    ).first()
    if not milestone:
        raise BusinessException(
            message="里程碑不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if milestone.status in ("unlocked", "completed"):
        raise BusinessException(
            message="已解锁里程碑不可删除",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    season = db.query(Season).filter(Season.id == season_id).first()
    group = db.query(TeachingGroup).filter(TeachingGroup.id == season.teaching_group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    db.delete(milestone)
    db.commit()
    return ApiResponse.ok(message="里程碑已删除")


@router.post("/{season_id}/milestones/{milestone_id}/unlock", response_model=ApiResponse[SeasonMilestoneOut])
def unlock_milestone(
    season_id: int,
    milestone_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    milestone = db.query(SeasonMilestone).filter(
        SeasonMilestone.id == milestone_id,
        SeasonMilestone.season_id == season_id,
    ).first()
    if not milestone:
        raise BusinessException(
            message="里程碑不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    season = db.query(Season).filter(Season.id == season_id).first()
    group = db.query(TeachingGroup).filter(TeachingGroup.id == season.teaching_group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    milestone.status = "unlocked"
    db.commit()
    db.refresh(milestone)
    return ApiResponse.ok(data=SeasonMilestoneOut.model_validate(milestone))


@router.post("/{season_id}/milestones/{milestone_id}/complete", response_model=ApiResponse[SeasonMilestoneOut])
def complete_milestone(
    season_id: int,
    milestone_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    milestone = db.query(SeasonMilestone).filter(
        SeasonMilestone.id == milestone_id,
        SeasonMilestone.season_id == season_id,
    ).first()
    if not milestone:
        raise BusinessException(
            message="里程碑不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    season = db.query(Season).filter(Season.id == season_id).first()
    group = db.query(TeachingGroup).filter(TeachingGroup.id == season.teaching_group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    milestone.status = "completed"
    db.commit()
    db.refresh(milestone)
    return ApiResponse.ok(data=SeasonMilestoneOut.model_validate(milestone))
