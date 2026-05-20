"""Arena 场次 — 正式赛与日常练习共用（competition_events 表）"""

from sqlalchemy import (
    Column, String, Integer, DateTime, Text, ForeignKey, Enum, JSON, Index
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.domains.arena.enums import MatchKind, DesignMode, MatchStatus, GameEngineId


class ArenaMatch(Base):
    """
    商赛场次实例。
    - official + organizer_id：组织者控场多人赛
    - practice + organizer_id NULL：学生日常单人练习（可搭 AI 对手，见 game_engine 插件）
    """

    __tablename__ = "competition_events"

    id = Column(Integer, primary_key=True, index=True)
    organizer_id = Column(Integer, ForeignKey("organizer_profiles.id"), nullable=True)
    room_code = Column(String(4), unique=True, nullable=False, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    match_kind = Column(Enum(MatchKind), default=MatchKind.official, nullable=False)
    design_mode = Column(Enum(DesignMode), default=DesignMode.standalone, nullable=False)
    game_config_id = Column(String(64), default="trading-v1", nullable=False)
    # game_type = 引擎插件 ID（trading / negotiation / strategy）
    game_type = Column(Enum(GameEngineId), default=GameEngineId.trading, nullable=False)
    status = Column(Enum(MatchStatus), default=MatchStatus.draft, nullable=False)
    config = Column(JSON, default=dict)

    max_players = Column(Integer, default=50, nullable=False)
    current_round = Column(Integer, default=0, nullable=False)
    starts_at = Column(DateTime(timezone=True), nullable=True)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organizer = relationship("OrganizerProfile", backref="events")
    participants = relationship(
        "ArenaParticipant",
        back_populates="match",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_comp_events_status", "status", "game_type"),
        Index("idx_comp_events_organizer", "organizer_id", "status"),
        Index("idx_comp_events_kind", "match_kind", "status"),
    )


# 向后兼容
CompetitionEvent = ArenaMatch
