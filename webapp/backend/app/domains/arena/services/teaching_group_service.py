"""营团业务逻辑"""

from typing import Optional

from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.domains.arena.models import OrganizerProfile, TeachingGroup
from app.domains.arena.utils import generate_group_invite_code


def ensure_organizer_profile(db: Session, user: User) -> OrganizerProfile:
    profile = db.query(OrganizerProfile).filter(OrganizerProfile.user_id == user.id).first()
    if profile:
        return profile
    if user.role not in (UserRole.admin, UserRole.teacher):
        raise PermissionError("需要教师或管理员身份")
    org_name = f"{user.username} 的体验营"
    profile = OrganizerProfile(
        user_id=user.id,
        organization_name=org_name,
        verified=user.role == UserRole.admin,
    )
    db.add(profile)
    db.flush()
    return profile


def unique_group_invite_code(db: Session) -> str:
    for _ in range(200):
        code = generate_group_invite_code()
        if not db.query(TeachingGroup).filter(TeachingGroup.invite_code == code).first():
            return code
    raise RuntimeError("group invite code generation failed")


def assert_group_teacher(group: TeachingGroup, user: User) -> None:
    if user.role == UserRole.admin:
        return
    if group.teacher_user_id != user.id:
        raise PermissionError("非本营团教师")
