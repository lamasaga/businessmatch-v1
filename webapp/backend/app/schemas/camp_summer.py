"""夏令营扩展 Schemas"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ========== 议程 ==========
class CampAgendaItemCreate(BaseModel):
    day_number: int = Field(..., ge=1, le=7)
    start_time: str = Field(..., min_length=5, max_length=8)  # "09:00"
    end_time: str = Field(..., min_length=5, max_length=8)
    title: str = Field(..., min_length=1, max_length=128)
    location: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = None
    task_id: Optional[int] = None
    sort_order: int = 0


class CampAgendaItemUpdate(BaseModel):
    day_number: Optional[int] = Field(None, ge=1, le=7)
    start_time: Optional[str] = Field(None, min_length=5, max_length=8)
    end_time: Optional[str] = Field(None, min_length=5, max_length=8)
    title: Optional[str] = Field(None, min_length=1, max_length=128)
    location: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = None
    task_id: Optional[int] = None
    sort_order: Optional[int] = None


class CampAgendaItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    group_id: int
    day_number: int
    start_time: str
    end_time: str
    title: str
    location: Optional[str] = None
    description: Optional[str] = None
    task_id: Optional[int] = None
    sort_order: int


# ========== 任务 ==========
class ScoringDimensionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    weight: float = Field(..., ge=0, le=1)
    max_score: int = Field(default=5, ge=1)
    sort_order: int = 0


class ScoringDimensionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int
    name: str
    weight: float
    max_score: int
    sort_order: int


class CampTaskCreate(BaseModel):
    day_number: int = Field(..., ge=1, le=7)
    title: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = None
    task_type: str = Field(default="image")
    submit_type: str = Field(default="group")  # user | group
    due_at: Optional[datetime] = None
    config_json: Optional[str] = None
    dimensions: Optional[List[ScoringDimensionCreate]] = None


class CampTaskUpdate(BaseModel):
    day_number: Optional[int] = Field(None, ge=1, le=7)
    title: Optional[str] = Field(None, min_length=1, max_length=128)
    description: Optional[str] = None
    task_type: Optional[str] = None
    submit_type: Optional[str] = None
    due_at: Optional[datetime] = None
    config_json: Optional[str] = None
    status: Optional[str] = None
    dimensions: Optional[List[ScoringDimensionCreate]] = None


class CampTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    group_id: int
    day_number: int
    title: str
    description: Optional[str] = None
    task_type: str
    submit_type: str
    due_at: Optional[datetime] = None
    config_json: Optional[str] = None
    status: str
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    dimensions: List[ScoringDimensionOut] = []


# ========== 提交/作品 ==========
class TaskSubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int
    submitter_type: str
    submitter_id: int
    content: Optional[str] = None
    attachments: Optional[str] = None
    submitted_at: datetime
    status: str
    score: Optional[float] = None
    feedback: Optional[str] = None


class ReviewDimension(BaseModel):
    dimension_id: int
    score: float = Field(..., ge=0)
    comment: Optional[str] = None


class SubmissionReviewCreate(BaseModel):
    dimensions: List[ReviewDimension]


class SubmissionReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    submission_id: int
    dimension_id: int
    scorer_id: int
    score: float
    comment: Optional[str] = None
    created_at: datetime


# ========== 营币 ==========
class CoinTarget(BaseModel):
    entity_type: str
    entity_id: int


class CoinGrantRequest(BaseModel):
    targets: List[CoinTarget]
    amount: int = Field(..., gt=0)
    reason: str = Field(..., min_length=1, max_length=256)


class CoinTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    group_id: int
    entity_type: str
    entity_id: int
    amount: int
    balance_after: int
    tx_type: str
    source_type: str
    description: Optional[str] = None
    created_at: datetime


class CoinLeaderboardEntry(BaseModel):
    rank: int
    entity_type: str
    entity_id: int
    entity_name: str
    balance: int


class CampCoinRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    group_id: int
    name: str
    trigger_type: str
    amount: int
    is_active: bool


class CampCoinRuleUpdate(BaseModel):
    name: Optional[str] = None
    trigger_type: Optional[str] = None
    amount: Optional[int] = None
    is_active: Optional[bool] = None


class CampShopItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    description: Optional[str] = Field(None, max_length=256)
    price: int = Field(..., ge=0)
    stock: int = Field(default=-1)
    effect_type: str = Field(..., min_length=1)
    effect_config: Optional[str] = None
    is_active: bool = True


class CampShopItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    group_id: int
    name: str
    description: Optional[str] = None
    price: int
    stock: int
    effect_type: str
    effect_config: Optional[str] = None
    is_active: bool


# ========== 奖项 ==========
class CampAwardCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    description: Optional[str] = Field(None, max_length=256)
    icon: str = Field(default="Trophy")
    criteria: Optional[str] = Field(None, max_length=256)
    sort_order: int = 0


class CampAwardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    group_id: int
    name: str
    description: Optional[str] = None
    icon: str
    criteria: Optional[str] = None
    sort_order: int


class AwardWinnerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    award_id: int
    winner_type: str
    winner_id: int
    score_value: Optional[float] = None
    announced_at: Optional[datetime] = None


# ========== 看板 ==========
class AgendaItemBrief(BaseModel):
    id: int
    time: str
    title: str
    status: str  # upcoming | ongoing | finished


class QuickActionsOut(BaseModel):
    has_ongoing_match: bool
    has_pending_reviews: int
    unscored_tasks: int


class CampDashboardOut(BaseModel):
    member_count: int
    active_event_count: int
    weekly_active_count: int
    company_count: int
    current_day: int
    active_task_count: int
    today_agenda: List[CampAgendaItemOut] = []
    quick_actions: QuickActionsOut
    recent_announcements: List[dict] = []
    recent_events: List[dict] = []
