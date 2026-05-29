"""体验营营团 — 教师创建的班级/夏令营容器"""

from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Enum, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.domains.arena.enums_group import TeachingGroupStatus


class TeachingGroup(Base):
    __tablename__ = "teaching_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    invite_code = Column(String(6), unique=True, nullable=False, index=True)
    teacher_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    camp_start_at = Column(DateTime(timezone=True), nullable=True)
    camp_end_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(
        Enum(TeachingGroupStatus),
        default=TeachingGroupStatus.active,
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    memberships = relationship("GroupMembership", back_populates="group", cascade="all, delete-orphan")
    events = relationship("ArenaMatch", back_populates="teaching_group", foreign_keys="ArenaMatch.teaching_group_id")

    __table_args__ = (Index("idx_teaching_groups_teacher", "teacher_user_id", "status"),)


class GroupMembership(Base):
    __tablename__ = "group_memberships"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(20), default="student", nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    group = relationship("TeachingGroup", back_populates="memberships")

    __table_args__ = (
        Index("uq_group_user", "group_id", "user_id", unique=True),
    )
