"""Arena 队伍 — 通用组队模型；赛制专属状态由 game 插件在独立表维护"""

from sqlalchemy import (
    Column, String, Integer, DateTime, ForeignKey, JSON, Index,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base


class ArenaTeam(Base):
    __tablename__ = "arena_teams"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("competition_events.id"), nullable=False)
    team_name = Column(String(100), nullable=False)
    is_ai = Column(Integer, default=0, nullable=False)  # 0=真人队 1=AI 队（练习用）
    metadata_ = Column("metadata", JSON, default=dict)
    final_rank = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    match = relationship("ArenaMatch", backref="teams")
    members = relationship("ArenaParticipant", back_populates="team")

    __table_args__ = (
        Index("idx_arena_teams_event", "event_id"),
    )
