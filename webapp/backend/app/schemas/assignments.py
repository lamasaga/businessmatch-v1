"""作业系统 Schemas"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class AssignmentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    due_at: Optional[datetime] = None
    season_id: Optional[int] = None
    milestone_id: Optional[int] = None


class AssignmentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    due_at: Optional[datetime] = None
    status: Optional[str] = Field(None, pattern=r"^(active|closed)$")


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    teaching_group_id: int
    season_id: Optional[int] = None
    milestone_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    due_at: Optional[datetime] = None
    created_by: int
    created_at: datetime
    status: str
    submission_count: int = 0
    total_students: int = 0


class SubmissionCreate(BaseModel):
    content: str = Field(..., min_length=1)


class GradeSubmission(BaseModel):
    score: int = Field(..., ge=0, le=100)
    feedback: Optional[str] = None


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assignment_id: int
    user_id: int
    username: str
    content: str
    submitted_at: datetime
    score: Optional[int] = None
    feedback: Optional[str] = None
    graded_at: Optional[datetime] = None
    graded_by: Optional[int] = None
