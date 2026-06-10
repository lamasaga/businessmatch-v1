"""OPS 生产经营销售赛运行时表"""

from sqlalchemy import (
    Column, String, Integer, Float, DateTime, ForeignKey, Enum, JSON,
    UniqueConstraint, Index,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.games.ops_sim.enums import (
    OpsRoundStatus, OpsCategory, OpsSegment, OpsAiStrategy,
    OpsAuctionItemType, OpsAuctionStatus,
)


class OpsTeamState(Base):
    __tablename__ = "ops_team_states"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("competition_events.id"), nullable=False, index=True)
    team_id = Column(Integer, ForeignKey("arena_teams.id"), nullable=False, unique=True)

    product_name = Column(String(100), default="", nullable=False)
    category = Column(Enum(OpsCategory), nullable=True)
    target_segment = Column(Enum(OpsSegment), nullable=True)

    cash = Column(Float, default=100000.0, nullable=False)
    inventory = Column(Integer, default=0, nullable=False)
    cumulative_profit = Column(Float, default=0.0, nullable=False)
    net_assets = Column(Float, default=100000.0, nullable=False)

    tech = Column(Float, default=20.0, nullable=False)
    fit = Column(Float, default=20.0, nullable=False)
    show = Column(Float, default=20.0, nullable=False)

    factories = Column(JSON, default=list)
    ads = Column(JSON, default=list)
    discount_rate = Column(Float, default=0.0, nullable=False)
    entered_cities = Column(JSON, default=list)

    ai_strategy = Column(Enum(OpsAiStrategy), nullable=True)

    team = relationship("ArenaTeam", backref="ops_state", uselist=False)

    __table_args__ = (
        Index("idx_ops_team_state_event", "event_id"),
    )


class OpsProductCard(Base):
    __tablename__ = "ops_products"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("competition_events.id"), nullable=False, index=True)
    team_id = Column(Integer, ForeignKey("arena_teams.id"), nullable=False, unique=True)

    product_name = Column(String(100), nullable=False)
    category = Column(Enum(OpsCategory), nullable=False)
    target_segment = Column(Enum(OpsSegment), nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())


class OpsRound(Base):
    __tablename__ = "ops_rounds"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("competition_events.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    status = Column(Enum(OpsRoundStatus), default=OpsRoundStatus.pending, nullable=False)

    market_snapshot = Column(JSON, default=dict)
    event_snapshot = Column(JSON, default=dict)
    opened_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    settled_at = Column(DateTime(timezone=True), nullable=True)

    submissions = relationship("OpsSubmission", back_populates="round", cascade="all, delete-orphan")
    snapshots = relationship("OpsSnapshot", back_populates="round", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("event_id", "round_number", name="uq_ops_round_event_no"),
        Index("idx_ops_rounds_event", "event_id", "status"),
    )


class OpsSubmission(Base):
    __tablename__ = "ops_submissions"

    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("ops_rounds.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("arena_teams.id"), nullable=False)

    decision_json = Column(JSON, default=dict, nullable=False)
    idempotency_key = Column(String(128), nullable=False, unique=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    round = relationship("OpsRound", back_populates="submissions")
    team = relationship("ArenaTeam")

    __table_args__ = (
        Index("idx_ops_submissions_round", "round_id"),
    )


class OpsSnapshot(Base):
    __tablename__ = "ops_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("ops_rounds.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("arena_teams.id"), nullable=False)

    result_json = Column(JSON, default=dict, nullable=False)
    financial_statements = Column(JSON, default=dict, nullable=False)

    round = relationship("OpsRound", back_populates="snapshots")
    team = relationship("ArenaTeam")

    __table_args__ = (
        UniqueConstraint("round_id", "team_id", name="uq_ops_snap_round_team"),
    )


class OpsAuctionItem(Base):
    __tablename__ = "ops_auction_items"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("competition_events.id"), nullable=False, index=True)

    item_key = Column(String(64), nullable=False)
    name = Column(String(100), nullable=False)
    item_type = Column(Enum(OpsAuctionItemType), nullable=False)
    base_price = Column(Float, default=0.0, nullable=False)
    effect_json = Column(JSON, default=dict, nullable=False)
    status = Column(Enum(OpsAuctionStatus), default=OpsAuctionStatus.pending, nullable=False)
    current_price = Column(Float, default=0.0, nullable=False)
    leading_team_id = Column(Integer, ForeignKey("arena_teams.id"), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    bids = relationship("OpsAuctionBid", back_populates="item", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_ops_auction_items_event", "event_id", "status"),
    )


class OpsAuctionBid(Base):
    __tablename__ = "ops_auction_bids"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("ops_auction_items.id"), nullable=False, index=True)
    team_id = Column(Integer, ForeignKey("arena_teams.id"), nullable=False)
    bid_amount = Column(Float, nullable=False)
    bid_at = Column(DateTime(timezone=True), server_default=func.now())
    is_winning = Column(Integer, default=0, nullable=False)

    item = relationship("OpsAuctionItem", back_populates="bids")

    __table_args__ = (
        Index("idx_ops_auction_bids_item", "item_id", "bid_at"),
    )


class OpsAuctionResult(Base):
    __tablename__ = "ops_auction_results"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("ops_auction_items.id"), nullable=False, unique=True)
    winner_team_id = Column(Integer, ForeignKey("arena_teams.id"), nullable=True)
    final_price = Column(Float, default=0.0, nullable=False)
    settled_at = Column(DateTime(timezone=True), server_default=func.now())
