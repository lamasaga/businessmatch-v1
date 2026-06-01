"""赛季与里程碑 Schemas"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SeasonMilestoneCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = None
    milestone_type: str = Field(..., pattern=r"^(lecture|practice_match|formal_match|debrief|assignment|discussion)$")
    sequence_order: int = Field(..., ge=0)
    due_at: Optional[datetime] = None
    config_json: Optional[str] = None


class SeasonMilestoneUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = None
    sequence_order: Optional[int] = None
    status: Optional[str] = Field(None, pattern=r"^(locked|unlocked|completed)$")
    due_at: Optional[datetime] = None
    config_json: Optional[str] = None


class SeasonMilestoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    season_id: int
    title: str
    description: Optional[str] = None
    milestone_type: str
    sequence_order: int
    status: str
    unlock_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    linked_event_id: Optional[int] = None
    config_json: Optional[str] = None


class SeasonCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = None
    theme: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    config_json: Optional[str] = None


class SeasonUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = None
    theme: Optional[str] = None
    status: Optional[str] = Field(None, pattern=r"^(draft|recruiting|ongoing|final|closed)$")
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    config_json: Optional[str] = None


class SeasonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    teaching_group_id: int
    title: str
    description: Optional[str] = None
    theme: Optional[str] = None
    status: str
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    created_by: int
    created_at: datetime
    config_json: Optional[str] = None
    milestone_count: int = 0


class SeasonDetail(SeasonOut):
    milestones: List[SeasonMilestoneOut] = []
