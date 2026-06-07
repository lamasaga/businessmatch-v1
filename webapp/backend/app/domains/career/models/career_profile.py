"""生涯档案模型 — Career Profile"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func

from app.db.database import Base


class CareerProfile(Base):
    __tablename__ = "career_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    # 基础成长
    title = Column(String(64), default="商业探索者", nullable=False)
    season_id = Column(String(32), default="2026-S1", nullable=False)

    # 五维雷达（JSON 占位，B2 起逐步真实化）
    competency_json = Column(
        String(1024),
        default='{"financial":50,"marketing":50,"strategic":50,"collaborative":50,"ethical":50}',
        nullable=False,
    )

    # 成就（JSON 列表，B2 起迁移为独立表）
    achievements_json = Column(String(2048), default="[]", nullable=False)

    # 家园（B3 开放，Phase A 仅占位）
    homestead_json = Column(
        String(512),
        default='{"unlocked_slots":0,"total_slots":5}',
        nullable=False,
    )

    # 元数据
    is_started = Column(Boolean, default=True, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
