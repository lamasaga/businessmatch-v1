"""TechVenture 运行时表 — 仅服务 game_engine=techventure 的场次"""

from sqlalchemy import (
    Column, String, Integer, Float, DateTime, ForeignKey, Enum, JSON, Text,
    UniqueConstraint, Index,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.games.techventure.enums import TvRoundStatus, StrategyRoute, TvEventId, TvNewsKind


class TvTeamState(Base):
    """TechVenture 专属队伍运行时状态（与 ArenaTeam 1:1 关联）"""
    __tablename__ = "tv_team_state"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("arena_teams.id"), nullable=False, unique=True)
    event_id = Column(Integer, ForeignKey("competition_events.id"), nullable=False)

    route = Column(Enum(StrategyRoute), default=StrategyRoute.TECH, nullable=False)
    home_city = Column(String(20), nullable=False)
    opened_cities = Column(JSON, default=list)

    tech = Column(Float, default=2.0, nullable=False)
    fit_by_city = Column(JSON, default=dict)
    show_by_city = Column(JSON, default=dict)
    budget = Column(Float, default=100.0, nullable=False)

    attention_total = Column(Float, default=0.0, nullable=False)
    weighted_total = Column(Float, default=0.0, nullable=False)
    last_rank = Column(Integer, nullable=True)

    team = relationship("ArenaTeam", backref="tv_state", uselist=False)

    __table_args__ = (
        Index("idx_tv_team_state_event", "event_id"),
    )


class TvRound(Base):
    """TechVenture 轮次"""
    __tablename__ = "tv_rounds"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("competition_events.id"), nullable=False)
    round_no = Column(Integer, nullable=False)
    status = Column(Enum(TvRoundStatus), default=TvRoundStatus.pending, nullable=False)
    event_id_r3 = Column(Enum(TvEventId), default=TvEventId.none, nullable=False)
    opened_at = Column(DateTime(timezone=True), nullable=True)
    settled_at = Column(DateTime(timezone=True), nullable=True)

    match = relationship("ArenaMatch", foreign_keys=[event_id])
    submissions = relationship("TvSubmission", back_populates="round", cascade="all, delete-orphan")
    snapshots = relationship("TvSnapshot", back_populates="round", cascade="all, delete-orphan")
    news_items = relationship("TvNews", back_populates="round", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("event_id", "round_no", name="uq_tv_round_event_no"),
        Index("idx_tv_rounds_event", "event_id", "status"),
    )


class TvSubmission(Base):
    """TechVenture 队伍每轮提交的决策"""
    __tablename__ = "tv_submissions"

    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("tv_rounds.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("arena_teams.id"), nullable=False)

    route = Column(Enum(StrategyRoute), nullable=False)
    opened_cities = Column(JSON, default=list)
    invest_tech = Column(Float, default=0.0, nullable=False)
    invest_fit_by_city = Column(JSON, default=dict)
    invest_show_by_city = Column(JSON, default=dict)
    declaration = Column(Text, default="")

    switch_cost_paid = Column(Float, default=0.0, nullable=False)
    expand_cost_paid = Column(Float, default=0.0, nullable=False)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    round = relationship("TvRound", back_populates="submissions")
    team = relationship("ArenaTeam")

    __table_args__ = (
        UniqueConstraint("round_id", "team_id", name="uq_tv_sub_round_team"),
        Index("idx_tv_submissions_round", "round_id"),
    )


class TvSnapshot(Base):
    """TechVenture 结算快照（每队每轮一条）"""
    __tablename__ = "tv_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("tv_rounds.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("arena_teams.id"), nullable=False)

    result_json = Column(JSON, default=dict)

    round = relationship("TvRound", back_populates="snapshots")
    team = relationship("ArenaTeam")

    __table_args__ = (
        UniqueConstraint("round_id", "team_id", name="uq_tv_snap_round_team"),
    )


class TvNews(Base):
    """TechVenture 结算新闻"""
    __tablename__ = "tv_news"

    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("tv_rounds.id"), nullable=False)
    kind = Column(Enum(TvNewsKind), nullable=False)
    headline = Column(String(200), nullable=False)
    body = Column(Text, default="")
    team_ids = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    round = relationship("TvRound", back_populates="news_items")

    __table_args__ = (
        Index("idx_tv_news_round", "round_id"),
    )
