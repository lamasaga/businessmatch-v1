"""OHB Pydantic Schemas"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class AIEmployeeBase(BaseModel):
    codename: str
    name: str
    avatar_emoji: str = "🤖"
    role_type: str
    level: int = 1
    skills: List[Dict[str, Any]] = []


class AIEmployeeCreate(AIEmployeeBase):
    pass


class AIEmployeeOut(AIEmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    status: str
    tasks_completed: int
    satisfaction_score: float
    created_at: datetime


class AITaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: str = "custom"
    priority: str = "normal"
    requirements: Dict[str, Any] = {}


class AITaskCreate(AITaskBase):
    assignee_id: int


class AITaskUpdate(BaseModel):
    status: Optional[str] = None
    progress: Optional[int] = None
    student_review: Optional[str] = None
    student_rating: Optional[int] = None


class AITaskOut(AITaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    assignee_id: int
    status: str
    progress: int
    deliverables: List[Dict[str, Any]]
    student_rating: Optional[int]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]


class OneCompanyBase(BaseModel):
    name: str
    description: Optional[str] = None


class OneCompanyCreate(OneCompanyBase):
    pass


class OneCompanyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    stage: Optional[str] = None
    business_model_canvas: Optional[Dict[str, Any]] = None


class OneCompanyOut(OneCompanyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    slug: str
    stage: str
    mode: str
    total_revenue: float
    total_cost: float
    business_model_canvas: Dict[str, Any]
    brand_config: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime]
    employee_count: int = 0
    task_stats: Dict[str, int] = {}


class CompanyDetailOut(OneCompanyOut):
    employees: List[AIEmployeeOut] = []
    tasks: List[AITaskOut] = []
