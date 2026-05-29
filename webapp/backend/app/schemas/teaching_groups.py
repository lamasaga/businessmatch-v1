"""体验营营团 Schemas"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class TeachingGroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = None
    camp_start_at: Optional[datetime] = None
    camp_end_at: Optional[datetime] = None


class TeachingGroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = None
    status: Optional[str] = Field(None, description="active | closed")
    reset_invite_code: bool = False


class TeachingGroupJoin(BaseModel):
    invite_code: str = Field(..., min_length=6, max_length=6)


class GroupMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    username: str
    role: str
    joined_at: datetime


class TeachingGroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    invite_code: str
    teacher_user_id: int
    teacher_username: Optional[str] = None
    camp_start_at: Optional[datetime] = None
    camp_end_at: Optional[datetime] = None
    status: str
    created_at: datetime
    member_count: int = 0
    event_count: int = 0


class TeachingGroupDetail(TeachingGroupOut):
    members: List[GroupMemberOut] = []
