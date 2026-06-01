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


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    teaching_group_id: int
    title: str
    content: str
    created_by: int
    is_pinned: bool = False
    created_at: datetime


class MemberProgressOut(BaseModel):
    user_id: int
    username: str
    joined_at: datetime
    match_count: int = 0
    total_xp: int = 0
    last_active_at: Optional[datetime] = None
    status: str = "newcomer"  # active | normal | attention | newcomer


class MemberProgressSummary(BaseModel):
    total: int = 0
    active: int = 0
    normal: int = 0
    attention: int = 0
    newcomer: int = 0


class MemberProgressList(BaseModel):
    members: List[MemberProgressOut] = []
    summary: MemberProgressSummary


class RecentEventOut(BaseModel):
    id: int
    title: str
    status: str
    created_at: Optional[str] = None


class CampDashboardOut(BaseModel):
    member_count: int = 0
    active_event_count: int = 0
    weekly_active_count: int = 0
    recent_announcements: List[AnnouncementOut] = []
    recent_events: List[RecentEventOut] = []
