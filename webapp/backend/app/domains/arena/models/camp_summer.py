"""夏令营扩展模型 — 任务、作品、公司、营币、评分、奖项"""

from sqlalchemy import (
    Column, Integer, String, DateTime, Text, ForeignKey,
    Enum, Boolean, Float, UniqueConstraint, Index,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.database import Base


# ========== 议程 ==========
class CampAgendaItem(Base):
    __tablename__ = "camp_agenda_items"

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False)
    start_time = Column(String(8), nullable=False)   # "09:00"
    end_time = Column(String(8), nullable=False)     # "10:30"
    title = Column(String(128), nullable=False)
    location = Column(String(64), nullable=True)
    description = Column(Text, nullable=True)
    task_id = Column(Integer, ForeignKey("camp_tasks.id"), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_agenda_group_day", "group_id", "day_number"),)


# ========== 任务 ==========
class CampTask(Base):
    __tablename__ = "camp_tasks"

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False)
    title = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String(32), nullable=False, default="image")
    submit_type = Column(String(16), default="group", nullable=False)  # user | group
    due_at = Column(DateTime(timezone=True), nullable=True)
    config_json = Column(Text, nullable=True)
    status = Column(String(16), default="draft", nullable=False)  # draft | published | closed | scored | archived
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    dimensions = relationship("ScoringDimension", back_populates="task", cascade="all, delete-orphan")
    submissions = relationship("TaskSubmission", back_populates="task", cascade="all, delete-orphan")

    __table_args__ = (Index("idx_tasks_group_status", "group_id", "status"),)


class ScoringDimension(Base):
    __tablename__ = "scoring_dimensions"

    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey("camp_tasks.id"), nullable=False, index=True)
    name = Column(String(64), nullable=False)
    weight = Column(Float, default=1.0, nullable=False)
    max_score = Column(Integer, default=5, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    task = relationship("CampTask", back_populates="dimensions")


# ========== 提交/作品 ==========
class TaskSubmission(Base):
    __tablename__ = "task_submissions"

    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey("camp_tasks.id"), nullable=False, index=True)
    submitter_type = Column(String(16), nullable=False)  # user | group
    submitter_id = Column(Integer, nullable=False)
    content = Column(Text, nullable=True)
    attachments = Column(Text, nullable=True)  # JSON array of URLs
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(16), default="pending", nullable=False)  # pending | reviewed | featured
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)

    task = relationship("CampTask", back_populates="submissions")
    reviews = relationship("SubmissionReview", back_populates="submission", cascade="all, delete-orphan")

    __table_args__ = (Index("idx_submissions_task", "task_id", "submitter_type", "submitter_id"),)


class SubmissionReview(Base):
    __tablename__ = "submission_reviews"

    id = Column(Integer, primary_key=True)
    submission_id = Column(Integer, ForeignKey("task_submissions.id"), nullable=False, index=True)
    dimension_id = Column(Integer, ForeignKey("scoring_dimensions.id"), nullable=False)
    scorer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Float, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    submission = relationship("TaskSubmission", back_populates="reviews")


# ========== 营币 ==========
class CampCoinBalance(Base):
    __tablename__ = "camp_coin_balances"

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    entity_type = Column(String(16), nullable=False)  # user | group
    entity_id = Column(Integer, nullable=False)
    balance = Column(Integer, default=0, nullable=False)
    total_earned = Column(Integer, default=0, nullable=False)
    total_spent = Column(Integer, default=0, nullable=False)

    __table_args__ = (
        UniqueConstraint("group_id", "entity_type", "entity_id", name="uq_camp_coin_balance"),
    )


class CampCoinTransaction(Base):
    __tablename__ = "camp_coin_transactions"

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    entity_type = Column(String(16), nullable=False)
    entity_id = Column(Integer, nullable=False)
    amount = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)
    tx_type = Column(String(16), nullable=False)  # earn | spend | transfer
    source_type = Column(String(32), nullable=False)
    source_id = Column(Integer, nullable=True)
    description = Column(String(256), nullable=True)
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_coin_tx_group", "group_id", "created_at"),)


class CampCoinRule(Base):
    __tablename__ = "camp_coin_rules"

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    name = Column(String(64), nullable=False)
    trigger_type = Column(String(32), nullable=False)
    amount = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class CampShopItem(Base):
    __tablename__ = "camp_shop_items"

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    name = Column(String(64), nullable=False)
    description = Column(String(256), nullable=True)
    price = Column(Integer, nullable=False)
    stock = Column(Integer, default=-1, nullable=False)  # -1 = unlimited
    effect_type = Column(String(32), nullable=False)
    effect_config = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)


# ========== 奖项 ==========
class CampAward(Base):
    __tablename__ = "camp_awards"

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    name = Column(String(64), nullable=False)
    description = Column(String(256), nullable=True)
    icon = Column(String(32), nullable=False)
    criteria = Column(String(256), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)

    winner = relationship("AwardWinner", back_populates="award", uselist=False, cascade="all, delete-orphan")


class AwardWinner(Base):
    __tablename__ = "award_winners"

    id = Column(Integer, primary_key=True)
    award_id = Column(Integer, ForeignKey("camp_awards.id"), nullable=False, index=True)
    winner_type = Column(String(16), nullable=False)
    winner_id = Column(Integer, nullable=False)
    score_value = Column(Float, nullable=True)
    announced_at = Column(DateTime(timezone=True), nullable=True)

    award = relationship("CampAward", back_populates="winner")

    __table_args__ = (
        UniqueConstraint("award_id", name="uq_award_winner"),
    )
