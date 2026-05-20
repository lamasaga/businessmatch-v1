"""生涯 XP 账本 — 只增记录，幂等发放"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Index, UniqueConstraint
from sqlalchemy.sql import func

from app.db.database import Base
from app.domains.arena.enums import MatchKind


class XpEvent(Base):
    __tablename__ = "xp_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    match_id = Column(Integer, ForeignKey("competition_events.id"), nullable=True)
    match_kind = Column(Enum(MatchKind), nullable=False)
    source = Column(String(64), nullable=False)  # e.g. match.finish, quest.daily
    amount = Column(Integer, nullable=False)
    idempotency_key = Column(String(128), nullable=False, unique=True)
    meta = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_xp_events_user_created", "user_id", "created_at"),
        UniqueConstraint("idempotency_key", name="uq_xp_events_idempotency"),
    )
