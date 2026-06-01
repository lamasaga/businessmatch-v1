"""营团分组 — 大营团内的小组协作"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base


class CampGroup(Base):
    """营团内的分组（小队/队伍）"""

    __tablename__ = "camp_groups"

    id = Column(Integer, primary_key=True, index=True)
    teaching_group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    name = Column(String(64), nullable=False)
    color = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    group = relationship("TeachingGroup", backref="camp_groups")
    members = relationship("CampGroupMember", back_populates="camp_group", cascade="all, delete-orphan")

    __table_args__ = (Index("idx_camp_groups_teaching", "teaching_group_id"),)


class CampGroupMember(Base):
    """分组成员关联"""

    __tablename__ = "camp_group_members"

    id = Column(Integer, primary_key=True, index=True)
    camp_group_id = Column(Integer, ForeignKey("camp_groups.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(20), default="member", nullable=False)  # leader | member
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    camp_group = relationship("CampGroup", back_populates="members")
    user = relationship("User", backref="camp_group_memberships")

    __table_args__ = (
        UniqueConstraint("camp_group_id", "user_id", name="uq_camp_group_member"),
    )
