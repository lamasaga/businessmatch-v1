"""营团公告 — 教师发布的营团内通知"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base


class CampAnnouncement(Base):
    __tablename__ = "camp_announcements"

    id = Column(Integer, primary_key=True, index=True)
    teaching_group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    group = relationship("TeachingGroup", backref="announcements")

    __table_args__ = (
        Index("idx_camp_announcements_group_pin", "teaching_group_id", "is_pinned", "created_at"),
    )
