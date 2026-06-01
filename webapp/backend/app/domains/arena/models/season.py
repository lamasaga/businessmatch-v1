"""赛季与里程碑 — 教学段落编排"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base


class Season(Base):
    """赛季：营团内的教学段落容器"""

    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True, index=True)
    teaching_group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    title = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    theme = Column(String(64), nullable=True)
    status = Column(String(20), default="draft", nullable=False)  # draft | recruiting | ongoing | final | closed
    start_at = Column(DateTime(timezone=True), nullable=True)
    end_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    config_json = Column(Text, nullable=True)

    group = relationship("TeachingGroup", backref="seasons")
    milestones = relationship("SeasonMilestone", back_populates="season", cascade="all, delete-orphan", order_by="SeasonMilestone.sequence_order")

    __table_args__ = (Index("idx_seasons_group_status", "teaching_group_id", "status"),)


class SeasonMilestone(Base):
    """里程碑：赛季内的教学单元"""

    __tablename__ = "season_milestones"

    id = Column(Integer, primary_key=True, index=True)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False, index=True)
    title = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    milestone_type = Column(String(32), nullable=False)  # lecture | practice_match | formal_match | debrief | assignment | discussion
    sequence_order = Column(Integer, nullable=False, default=0)
    status = Column(String(20), default="locked", nullable=False)  # locked | unlocked | completed
    unlock_at = Column(DateTime(timezone=True), nullable=True)
    due_at = Column(DateTime(timezone=True), nullable=True)
    linked_event_id = Column(Integer, ForeignKey("competition_events.id"), nullable=True)
    config_json = Column(Text, nullable=True)

    season = relationship("Season", back_populates="milestones")

    __table_args__ = (Index("idx_milestones_season_order", "season_id", "sequence_order"),)
