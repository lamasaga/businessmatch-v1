"""作业系统 — 轻量版文本作业"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base


class Assignment(Base):
    """作业定义"""

    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    teaching_group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=True)
    milestone_id = Column(Integer, ForeignKey("season_milestones.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    due_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(String(20), default="active", nullable=False)  # active | closed

    group = relationship("TeachingGroup", backref="assignments")
    submissions = relationship("AssignmentSubmission", back_populates="assignment", cascade="all, delete-orphan")


class AssignmentSubmission(Base):
    """作业提交"""

    __tablename__ = "assignment_submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    score = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_at = Column(DateTime(timezone=True), nullable=True)
    graded_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    assignment = relationship("Assignment", back_populates="submissions")
    user = relationship("User", foreign_keys=[user_id], backref="assignment_submissions")

    __table_args__ = (
        Index("idx_assignment_submissions_assignment", "assignment_id", "user_id"),
    )
