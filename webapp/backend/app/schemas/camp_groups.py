"""营团分组 Schemas"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CampGroupMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    username: str
    role: str = "member"
    joined_at: datetime


class CampGroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    color: Optional[str] = None


class CampGroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=64)
    color: Optional[str] = None


class CampGroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    teaching_group_id: int
    name: str
    color: Optional[str] = None
    member_count: int = 0
    created_at: datetime


class CampGroupDetail(CampGroupOut):
    members: List[CampGroupMemberOut] = []


class AutoGroupRequest(BaseModel):
    group_size: int = Field(..., ge=2, le=20)
    method: str = Field(default="random", pattern=r"^(random|join_order)$")
