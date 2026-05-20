"""组织者档案 — 正式赛控场身份"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base


class OrganizerProfile(Base):
    __tablename__ = "organizer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    organization_name = Column(String(100), nullable=False)
    contact_phone = Column(String(20), nullable=True)
    verified = Column(Boolean, default=False, nullable=False)
    total_events_hosted = Column(Integer, default=0, nullable=False)
    total_participants = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", backref="organizer_profile")
