"""交易赛运行时表 — 仅服务 game_engine=trading 的场次"""

from sqlalchemy import (
    Column, String, Integer, Float, DateTime, ForeignKey, Enum, JSON,
    UniqueConstraint, Index,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.games.trading.enums import RoundStatus, ActionType


class TradingRound(Base):
    __tablename__ = "trading_rounds"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("competition_events.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    status = Column(Enum(RoundStatus), default=RoundStatus.pending, nullable=False)
    events = Column(JSON, default=list)
    price_snapshot = Column(JSON, default=dict)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    match = relationship("ArenaMatch", foreign_keys=[event_id], backref="trading_rounds")
    decisions = relationship("TradingDecision", back_populates="round", cascade="all, delete-orphan")
    prices = relationship("TradingPrice", back_populates="round", cascade="all, delete-orphan")

    @property
    def event(self):
        """兼容旧代码中的 round.event 命名"""
        return self.match

    __table_args__ = (
        UniqueConstraint("event_id", "round_number", name="uq_round_event_number"),
        Index("idx_trading_rounds_event", "event_id", "status"),
    )


class TradingDecision(Base):
    __tablename__ = "trading_decisions"

    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("trading_rounds.id"), nullable=False)
    participant_id = Column(Integer, ForeignKey("competition_participants.id"), nullable=False)
    action_type = Column(Enum(ActionType), nullable=False)
    action_data = Column(JSON, default=dict)
    cash_after = Column(Float, default=0, nullable=False)
    inventory_after = Column(JSON, default=dict)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    round = relationship("TradingRound", back_populates="decisions")
    participant = relationship("ArenaParticipant", backref="trading_decisions")

    __table_args__ = (
        UniqueConstraint("round_id", "participant_id", name="uq_decision_round_participant"),
        Index("idx_trading_decisions_round", "round_id", "action_type"),
    )


class TradingPrice(Base):
    __tablename__ = "trading_prices"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("competition_events.id"), nullable=False)
    round_id = Column(Integer, ForeignKey("trading_rounds.id"), nullable=False)
    city = Column(String(20), nullable=False)
    product_id = Column(String(20), nullable=False)
    base_price = Column(Float, nullable=False)
    supply_factor = Column(Float, default=0, nullable=False)
    event_factor = Column(Float, default=0, nullable=False)
    final_price = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    round = relationship("TradingRound", back_populates="prices")

    __table_args__ = (
        Index("idx_trading_prices_event", "event_id", "round_id"),
        Index("idx_trading_prices_lookup", "event_id", "city", "product_id"),
    )
