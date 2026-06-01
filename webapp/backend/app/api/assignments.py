"""作业系统 API"""

from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User, UserRole
from app.domains.arena.models import TeachingGroup
from app.domains.arena.models.assignment import Assignment, AssignmentSubmission
from app.schemas.assignments import (
    AssignmentCreate, AssignmentUpdate, AssignmentOut,
    SubmissionCreate, SubmissionOut, GradeSubmission,
)
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.core.dependencies import get_current_active_user

router = APIRouter(prefix="/assignments", tags=["作业"])


def _require_teacher(user: User) -> None:
    if user.role not in (UserRole.admin, UserRole.teacher):
        raise BusinessException(
            message="仅教师或管理员可操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )


def _assignment_to_out(assignment: Assignment, db: Session) -> AssignmentOut:
    sc = db.query(func.count(AssignmentSubmission.id)).filter(
        AssignmentSubmission.assignment_id == assignment.id
    ).scalar() or 0
    tc = db.query(func.count(GroupMembership.id)).filter(
        GroupMembership.group_id == assignment.teaching_group_id
    ).scalar() or 0
    return AssignmentOut(
        id=assignment.id,
        teaching_group_id=assignment.teaching_group_id,
        season_id=assignment.season_id,
        milestone_id=assignment.milestone_id,
        title=assignment.title,
        description=assignment.description,
        due_at=assignment.due_at,
        created_by=assignment.created_by,
        created_at=assignment.created_at,
        status=assignment.status,
        submission_count=sc,
        total_students=tc,
    )


# ── 作业管理 ──

@router.post("", response_model=ApiResponse[AssignmentOut], status_code=status.HTTP_201_CREATED)
def create_assignment(
    data: AssignmentCreate,
    teaching_group_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    group = db.query(TeachingGroup).filter(TeachingGroup.id == teaching_group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    assignment = Assignment(
        teaching_group_id=teaching_group_id,
        season_id=data.season_id,
        milestone_id=data.milestone_id,
        title=data.title,
        description=data.description,
        due_at=data.due_at,
        created_by=current_user.id,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return ApiResponse.ok(data=_assignment_to_out(assignment, db))


@router.get("/by-group/{group_id}", response_model=ApiResponse[List[AssignmentOut]])
def list_assignments(
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
    if not is_teacher and current_user.role != UserRole.admin:
        # 学生只看已发布的作业
        assignments = (
            db.query(Assignment)
            .filter(Assignment.teaching_group_id == group_id, Assignment.status == "active")
            .order_by(Assignment.created_at.desc())
            .all()
        )
    else:
        assignments = (
            db.query(Assignment)
            .filter(Assignment.teaching_group_id == group_id)
            .order_by(Assignment.created_at.desc())
            .all()
        )
    return ApiResponse.ok(data=[_assignment_to_out(a, db) for a in assignments])


@router.get("/{assignment_id}", response_model=ApiResponse[AssignmentOut])
def get_assignment(
    assignment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise BusinessException(
            message="作业不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    group = db.query(TeachingGroup).filter(TeachingGroup.id == assignment.teaching_group_id).first()
    is_teacher = group and group.teacher_user_id == current_user.id
    is_member = (
        db.query(GroupMembership)
        .filter(GroupMembership.group_id == assignment.teaching_group_id, GroupMembership.user_id == current_user.id)
        .first()
    )
    if not is_teacher and not is_member and current_user.role != UserRole.admin:
        raise BusinessException(
            message="无权查看",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    return ApiResponse.ok(data=_assignment_to_out(assignment, db))


@router.patch("/{assignment_id}", response_model=ApiResponse[AssignmentOut])
def update_assignment(
    assignment_id: int,
    data: AssignmentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise BusinessException(
            message="作业不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    group = db.query(TeachingGroup).filter(TeachingGroup.id == assignment.teaching_group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    if data.title is not None:
        assignment.title = data.title
    if data.description is not None:
        assignment.description = data.description
    if data.due_at is not None:
        assignment.due_at = data.due_at
    if data.status is not None:
        assignment.status = data.status
    db.commit()
    db.refresh(assignment)
    return ApiResponse.ok(data=_assignment_to_out(assignment, db))


@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise BusinessException(
            message="作业不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    group = db.query(TeachingGroup).filter(TeachingGroup.id == assignment.teaching_group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    db.delete(assignment)
    db.commit()
    return ApiResponse.ok(message="作业已删除")


# ── 提交管理 ──

@router.post("/{assignment_id}/submissions", response_model=ApiResponse[SubmissionOut], status_code=status.HTTP_201_CREATED)
def create_submission(
    assignment_id: int,
    data: SubmissionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise BusinessException(
            message="作业不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if assignment.status != "active":
        raise BusinessException(
            message="作业已截止",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    # 检查截止时间
    if assignment.due_at and datetime.now() > assignment.due_at:
        raise BusinessException(
            message="作业已截止",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    # 检查是否已提交
    existing = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == assignment_id,
        AssignmentSubmission.user_id == current_user.id,
    ).first()
    if existing:
        raise BusinessException(
            message="已提交过该作业",
            code=ErrorCode.CONFLICT,
            status_code=status.HTTP_409_CONFLICT,
        )
    submission = AssignmentSubmission(
        assignment_id=assignment_id,
        user_id=current_user.id,
        content=data.content,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return ApiResponse.ok(data=SubmissionOut(
        id=submission.id,
        assignment_id=submission.assignment_id,
        user_id=submission.user_id,
        username=current_user.username,
        content=submission.content,
        submitted_at=submission.submitted_at,
        score=submission.score,
        feedback=submission.feedback,
        graded_at=submission.graded_at,
        graded_by=submission.graded_by,
    ))


@router.get("/{assignment_id}/submissions", response_model=ApiResponse[List[SubmissionOut]])
def list_submissions(
    assignment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise BusinessException(
            message="作业不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    group = db.query(TeachingGroup).filter(TeachingGroup.id == assignment.teaching_group_id).first()
    is_teacher = group and group.teacher_user_id == current_user.id
    if not is_teacher and current_user.role != UserRole.admin:
        # 学生只能看自己的
        submissions = (
            db.query(AssignmentSubmission)
            .filter(AssignmentSubmission.assignment_id == assignment_id, AssignmentSubmission.user_id == current_user.id)
            .all()
        )
    else:
        submissions = (
            db.query(AssignmentSubmission)
            .filter(AssignmentSubmission.assignment_id == assignment_id)
            .order_by(AssignmentSubmission.submitted_at.desc())
            .all()
        )
    result: List[SubmissionOut] = []
    for s in submissions:
        user = db.query(User).filter(User.id == s.user_id).first()
        result.append(SubmissionOut(
            id=s.id,
            assignment_id=s.assignment_id,
            user_id=s.user_id,
            username=user.username if user else "",
            content=s.content,
            submitted_at=s.submitted_at,
            score=s.score,
            feedback=s.feedback,
            graded_at=s.graded_at,
            graded_by=s.graded_by,
        ))
    return ApiResponse.ok(data=result)


@router.patch("/{assignment_id}/submissions/{submission_id}/grade", response_model=ApiResponse[SubmissionOut])
def grade_submission(
    assignment_id: int,
    submission_id: int,
    data: GradeSubmission,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_teacher(current_user)
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise BusinessException(
            message="作业不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    group = db.query(TeachingGroup).filter(TeachingGroup.id == assignment.teaching_group_id).first()
    if not group or (group.teacher_user_id != current_user.id and current_user.role != UserRole.admin):
        raise BusinessException(
            message="无权操作",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    submission = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.id == submission_id,
        AssignmentSubmission.assignment_id == assignment_id,
    ).first()
    if not submission:
        raise BusinessException(
            message="提交不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    submission.score = data.score
    submission.feedback = data.feedback
    submission.graded_at = datetime.now()
    submission.graded_by = current_user.id
    db.commit()
    db.refresh(submission)
    user = db.query(User).filter(User.id == submission.user_id).first()
    return ApiResponse.ok(data=SubmissionOut(
        id=submission.id,
        assignment_id=submission.assignment_id,
        user_id=submission.user_id,
        username=user.username if user else "",
        content=submission.content,
        submitted_at=submission.submitted_at,
        score=submission.score,
        feedback=submission.feedback,
        graded_at=submission.graded_at,
        graded_by=submission.graded_by,
    ))
