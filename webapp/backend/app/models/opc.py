"""OPC（一人公司）模型"""

import enum
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey,
    Enum, JSON, UniqueConstraint, Index, CheckConstraint
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base


class CompanyStage(str, enum.Enum):
    IDEATE = "IDEATE"
    VALIDATE = "VALIDATE"
    BUILD = "BUILD"
    LAUNCH = "LAUNCH"
    SCALE = "SCALE"


class CompanyMode(str, enum.Enum):
    SIMULATION = "simulation"
    REAL = "real"


class EmployeeStatus(str, enum.Enum):
    IDLE = "idle"
    BUSY = "busy"
    OFFLINE = "offline"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"
    REJECTED = "rejected"


class TaskType(str, enum.Enum):
    RESEARCH = "research"
    DESIGN = "design"
    CODE = "code"
    COPYWRITING = "copywriting"
    ANALYSIS = "analysis"
    STRATEGY = "strategy"
    REVIEW = "review"
    CUSTOM = "custom"


class OneCompany(Base):
    """学生创建的一人公司"""
    __tablename__ = "opc_companies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    stage = Column(Enum(CompanyStage), default=CompanyStage.IDEATE, nullable=False)
    mode = Column(Enum(CompanyMode), default=CompanyMode.SIMULATION, nullable=False)

    business_model_canvas = Column(JSON, default=dict)
    brand_config = Column(JSON, default=dict)

    total_revenue = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    launched_at = Column(DateTime(timezone=True), nullable=True)

    # 关联关系
    user = relationship("User", backref="companies")
    employees = relationship("AIEmployee", back_populates="company", cascade="all, delete-orphan")
    tasks = relationship("AITask", back_populates="company", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_opc_companies_user", "user_id", "stage"),
    )


class AIEmployee(Base):
    """AI数字员工"""
    __tablename__ = "opc_employees"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("opc_companies.id"), nullable=False)

    codename = Column(String(20), nullable=False)
    name = Column(String(50), nullable=False)
    avatar_emoji = Column(String(10), default="🤖")
    role_type = Column(String(20), nullable=False)
    level = Column(Integer, default=1)
    status = Column(Enum(EmployeeStatus), default=EmployeeStatus.IDLE)

    skills = Column(JSON, default=list)
    personality_prompt = Column(Text)

    tasks_completed = Column(Integer, default=0)
    satisfaction_score = Column(Float, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关联关系
    company = relationship("OneCompany", back_populates="employees")
    tasks = relationship("AITask", back_populates="assignee")

    __table_args__ = (
        UniqueConstraint("company_id", "codename", name="uq_employee_codename_per_company"),
        Index("idx_opc_employees_company", "company_id", "status"),
    )


class AITask(Base):
    """AI任务"""
    __tablename__ = "opc_tasks"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("opc_companies.id"), nullable=False)
    assignee_id = Column(Integer, ForeignKey("opc_employees.id"), nullable=False)

    title = Column(String(200), nullable=False)
    description = Column(Text)
    task_type = Column(Enum(TaskType), default=TaskType.CUSTOM)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING)
    priority = Column(String(20), default="normal")

    requirements = Column(JSON, default=dict)
    deliverables = Column(JSON, default=list)
    progress = Column(Integer, default=0)

    student_review = Column(Text)
    student_rating = Column(Integer, nullable=True)

    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关联关系
    company = relationship("OneCompany", back_populates="tasks")
    assignee = relationship("AIEmployee", back_populates="tasks")

    __table_args__ = (
        Index("idx_opc_tasks_company_status", "company_id", "status"),
        Index("idx_opc_tasks_assignee", "assignee_id", "status"),
        CheckConstraint("student_rating >= 1 AND student_rating <= 5", name="chk_opc_rating_range"),
    )
