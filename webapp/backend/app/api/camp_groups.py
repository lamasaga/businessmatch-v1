"""营团分组 API"""

import random
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User, UserRole
from app.domains.arena.models import TeachingGroup, GroupMembership
from app.domains.arena.models.camp_group import CampGroup, CampGroupMember
from app.schemas.camp_groups import (
    CampGroupCreate, CampGroupUpdate, CampGroupOut, CampGroupDetail,
    CampGroupMemberOut, AutoGroupRequest,
)
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.core.dependencies import get_current_active_user

router = APIRouter(prefix="/teaching-groups", tags=["营团分组"])

GROUP_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#f43f5e"]


def _require_teacher(user: User) -> None:
    if user.role not in (UserRole.admin, UserRole.teacher):
        raise BusinessException(
            message="仅教师或管理员可操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )


def _group_to_out(group: CampGroup, db: Session) -> CampGroupOut:
    mc = db.query(func.count(CampGroupMember.id)).filter(CampGroupMember.camp_group_id == group.id).scalar() or 0
    return CampGroupOut(
        id=group.id,
        teaching_group_id=group.teaching_group_id,
        name=group.name,
        color=group.color,
        member_count=mc,
        created_at=group.created_at,
    )


@router.get("/{group_id}/groups", response_model=ApiResponse[List[CampGroupDetail]])
def list_groups(
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
        .filter(GroupMembership.group_id == group_id, GroupMembership.user_id == current_user.id)
        .first()
    )
    if not is_teacher and not is_member and current_user.role != UserRole.admin:
        raise BusinessException(
            message="无权查看",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    groups = db.query(CampGroup).filter(CampGroup.teaching_group_id == group_id).all()
    result: List[CampGroupDetail] = []
    for g in groups:
        base = _group_to_out(g, db)
        members = (
            db.query(CampGroupMember, User)
            .join(User, User.id == CampGroupMember.user_id)
            .filter(CampGroupMember.camp_group_id == g.id)
            .all()
        )
        result.append(CampGroupDetail(
            **base.model_dump(),
            members=[
                CampGroupMemberOut(
                    user_id=u.id,
                    username=u.username,
                    role=m.role,
                    joined_at=m.joined_at,
                )
                for m, u in members
            ],
        ))
    return ApiResponse.ok(data=result)


@router.post("/{group_id}/groups", response_model=ApiResponse[CampGroupOut], status_code=status.HTTP_201_CREATED)
def create_group(
    group_id: int,
    data: CampGroupCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    group = db.query(TeachingGroup).filter(TeachingGroup.id == group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    camp_group = CampGroup(
        teaching_group_id=group_id,
        name=data.name,
        color=data.color,
    )
    db.add(camp_group)
    db.commit()
    db.refresh(camp_group)
    return ApiResponse.ok(data=_group_to_out(camp_group, db))


@router.patch("/{group_id}/groups/{camp_group_id}", response_model=ApiResponse[CampGroupOut])
def update_group(
    group_id: int,
    camp_group_id: int,
    data: CampGroupUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    group = db.query(TeachingGroup).filter(TeachingGroup.id == group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    camp_group = db.query(CampGroup).filter(
        CampGroup.id == camp_group_id,
        CampGroup.teaching_group_id == group_id,
    ).first()
    if not camp_group:
        raise BusinessException(
            message="分组不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if data.name is not None:
        camp_group.name = data.name
    if data.color is not None:
        camp_group.color = data.color
    db.commit()
    db.refresh(camp_group)
    return ApiResponse.ok(data=_group_to_out(camp_group, db))


@router.delete("/{group_id}/groups/{camp_group_id}")
def delete_group(
    group_id: int,
    camp_group_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    group = db.query(TeachingGroup).filter(TeachingGroup.id == group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    camp_group = db.query(CampGroup).filter(
        CampGroup.id == camp_group_id,
        CampGroup.teaching_group_id == group_id,
    ).first()
    if not camp_group:
        raise BusinessException(
            message="分组不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    db.delete(camp_group)
    db.commit()
    return ApiResponse.ok(message="分组已删除")


@router.post("/{group_id}/groups/auto-generate")
def auto_generate_groups(
    group_id: int,
    data: AutoGroupRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    group = db.query(TeachingGroup).filter(TeachingGroup.id == group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    # 获取所有未分组的学员
    all_members = (
        db.query(GroupMembership, User)
        .join(User, User.id == GroupMembership.user_id)
        .filter(GroupMembership.group_id == group_id)
        .all()
    )

    # 已分组的学员ID
    existing_grouped = {
        m.user_id
        for m in db.query(CampGroupMember).join(CampGroup).filter(CampGroup.teaching_group_id == group_id).all()
    }

    ungrouped = [(m, u) for m, u in all_members if u.id not in existing_grouped]
    if not ungrouped:
        raise BusinessException(
            message="没有待分组的学员",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if data.method == "random":
        random.shuffle(ungrouped)
    else:  # join_order
        ungrouped.sort(key=lambda x: x[0].joined_at)

    # 计算需要的组数
    num_groups = max(1, (len(ungrouped) + data.group_size - 1) // data.group_size)
    group_names = [chr(ord("A") + i) + "组" for i in range(num_groups)]

    created_groups: List[CampGroup] = []
    for i in range(num_groups):
        cg = CampGroup(
            teaching_group_id=group_id,
            name=group_names[i],
            color=GROUP_COLORS[i % len(GROUP_COLORS)],
        )
        db.add(cg)
        db.flush()
        created_groups.append(cg)

    for idx, (m, u) in enumerate(ungrouped):
        group_idx = idx % num_groups
        db.add(CampGroupMember(
            camp_group_id=created_groups[group_idx].id,
            user_id=u.id,
            role="member",
        ))

    db.commit()
    return ApiResponse.ok(message=f"已自动创建 {num_groups} 个分组")


@router.post("/{group_id}/groups/{camp_group_id}/members")
def add_member_to_group(
    group_id: int,
    camp_group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    group = db.query(TeachingGroup).filter(TeachingGroup.id == group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    camp_group = db.query(CampGroup).filter(
        CampGroup.id == camp_group_id,
        CampGroup.teaching_group_id == group_id,
    ).first()
    if not camp_group:
        raise BusinessException(
            message="分组不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    # 移除学员在其他分组的关联
    existing = (
        db.query(CampGroupMember)
        .join(CampGroup)
        .filter(CampGroup.teaching_group_id == group_id, CampGroupMember.user_id == user_id)
        .first()
    )
    if existing:
        db.delete(existing)

    db.add(CampGroupMember(camp_group_id=camp_group_id, user_id=user_id, role="member"))
    db.commit()
    return ApiResponse.ok(message="成员已添加")


@router.delete("/{group_id}/groups/{camp_group_id}/members/{user_id}")
def remove_member_from_group(
    group_id: int,
    camp_group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    group = db.query(TeachingGroup).filter(TeachingGroup.id == group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    member = db.query(CampGroupMember).filter(
        CampGroupMember.camp_group_id == camp_group_id,
        CampGroupMember.user_id == user_id,
    ).first()
    if member:
        db.delete(member)
        db.commit()
    return ApiResponse.ok(message="成员已移除")


@router.patch("/{group_id}/groups/{camp_group_id}/members/{user_id}/role")
def set_member_role(
    group_id: int,
    camp_group_id: int,
    user_id: int,
    role: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    group = db.query(TeachingGroup).filter(TeachingGroup.id == group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    member = db.query(CampGroupMember).filter(
        CampGroupMember.camp_group_id == camp_group_id,
        CampGroupMember.user_id == user_id,
    ).first()
    if not member:
        raise BusinessException(
            message="成员不在该分组中",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    member.role = role
    db.commit()
    return ApiResponse.ok(message=f"已设为{role}")
