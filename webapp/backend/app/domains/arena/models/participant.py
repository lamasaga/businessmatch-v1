"""Arena 参赛者 — 通用身份；赛制运行时字段由 game 插件解释"""

from sqlalchemy import (
    Column, String, Integer, Float, DateTime, ForeignKey, Enum, JSON,
    UniqueConstraint, Index,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.domains.arena.enums import ParticipantStatus


class ArenaParticipant(Base):
    __tablename__ = "competition_participants"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("competition_events.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_ai = Column(Integer, default=0, nullable=False)  # 0=真人 1=AI 替补/日常对手

    # trading 插件使用的运行时状态（后续可迁入 runtime_state JSON）
    cash = Column(Float, default=0, nullable=False)
    inventory = Column(JSON, default=dict)
    current_city = Column(String(20), default="nanjing", nullable=False)
    total_assets = Column(Float, default=0, nullable=False)

    # 队伍（可选）：team_id 有值 → 队伍成员；NULL → 个人模式（如浮生记）
    team_id = Column(Integer, ForeignKey("arena_teams.id"), nullable=True)
    team_role = Column(String(32), nullable=True)

    status = Column(Enum(ParticipantStatus), default=ParticipantStatus.joined, nullable=False)
    final_rank = Column(Integer, nullable=True)
    experience_earned = Column(Integer, default=0, nullable=False)
    achievements_earned = Column(JSON, default=list)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    match = relationship("ArenaMatch", back_populates="participants")
    user = relationship("User", backref="competition_participations")
    team = relationship("ArenaTeam", back_populates="members")

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_participant_event_user"),
        Index("idx_comp_participants_event", "event_id", "status"),
        Index("idx_comp_participants_user", "user_id", "status"),
    )


CompetitionParticipant = ArenaParticipant
