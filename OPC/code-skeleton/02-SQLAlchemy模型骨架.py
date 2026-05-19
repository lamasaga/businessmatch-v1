"""
OPC SQLAlchemy ORM 模型骨架
可直接复制到现有后端项目的 models/ 目录
"""

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey,
    Enum, JSON, UniqueConstraint, Index, CheckConstraint, event
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import uuid
import enum

Base = declarative_base()


# ============ 枚举定义 ============

class CompanyStage(str, enum.Enum):
    IDEATE = "IDEATE"
    VALIDATE = "VALIDATE"
    BUILD = "BUILD"
    LAUNCH = "LAUNCH"
    SCALE = "SCALE"
    ARCHIVED = "ARCHIVED"

class CompanyMode(str, enum.Enum):
    SIMULATION = "simulation"
    REAL = "real"
    COMPETITION = "competition"

class CompanyStatus(str, enum.Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    SUSPENDED = "suspended"

class EmployeeRoleType(str, enum.Enum):
    STRATEGIST = "strategist"
    WORKER = "worker"
    ADVISOR = "advisor"
    SCOUT = "scout"

class EmployeeStatus(str, enum.Enum):
    IDLE = "idle"
    BUSY = "busy"
    OFFLINE = "offline"
    FROZEN = "frozen"

class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    REVIEW = "review"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    MODIFYING = "modifying"
    CANCELLED = "cancelled"

class TaskType(str, enum.Enum):
    RESEARCH = "research"
    DESIGN = "design"
    CODE = "code"
    COPYWRITING = "copywriting"
    ANALYSIS = "analysis"
    STRATEGY = "strategy"
    REVIEW = "review"
    CUSTOM = "custom"

class Priority(str, enum.Enum):
    URGENT = "urgent"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"

class FinanceType(str, enum.Enum):
    REVENUE = "revenue"
    COST = "cost"

class GatewayDecision(str, enum.Enum):
    PASS = "pass"
    CONDITIONAL = "conditional"
    FAIL = "fail"


# ============ 核心模型 ============

class OneCompany(Base):
    """学生创建的公司"""
    __tablename__ = "one_companies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    career_id = Column(UUID(as_uuid=True), ForeignKey("career_profiles.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    
    stage = Column(Enum(CompanyStage), default=CompanyStage.IDEATE, nullable=False)
    mode = Column(Enum(CompanyMode), default=CompanyMode.SIMULATION, nullable=False)
    status = Column(Enum(CompanyStatus), default=CompanyStatus.ACTIVE, nullable=False)
    
    business_model_canvas = Column(JSON, default=dict)
    brand_config = Column(JSON, default=dict)
    
    total_revenue = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    launched_at = Column(DateTime(timezone=True), nullable=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    
    # 关联关系
    employees = relationship("AIEmployee", back_populates="company", cascade="all, delete-orphan")
    tasks = relationship("AITask", back_populates="company", cascade="all, delete-orphan")
    sprints = relationship("Sprint", back_populates="company", cascade="all, delete-orphan")
    finance_records = relationship("FinanceRecord", back_populates="company", cascade="all, delete-orphan")
    gateway_reviews = relationship("GatewayReview", back_populates="company", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_companies_career_status", "career_id", "status"),
        Index("idx_companies_stage", "stage"),
    )


class AIEmployee(Base):
    """AI数字员工"""
    __tablename__ = "ai_employees"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id"), nullable=False)
    
    codename = Column(String(20), nullable=False)
    name = Column(String(50), nullable=False)
    avatar_emoji = Column(String(10), default="🤖")
    
    role_type = Column(Enum(EmployeeRoleType), nullable=False)
    level = Column(Integer, default=1)
    status = Column(Enum(EmployeeStatus), default=EmployeeStatus.IDLE)
    
    skills = Column(JSON, default=list)  # [{"name": "...", "level": 3, "category": "core"}]
    mcp_tools = Column(JSON, default=list)
    personality_prompt = Column(Text)
    memory_vector_id = Column(String(100))
    
    tasks_completed = Column(Integer, default=0)
    satisfaction_score = Column(Float, default=0.0)  # 学生评分均值
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关联关系
    company = relationship("OneCompany", back_populates="employees")
    tasks = relationship("AITask", back_populates="assignee")
    
    __table_args__ = (
        Index("idx_employees_company", "company_id", "status"),
        UniqueConstraint("company_id", "codename", name="uq_employee_codename_per_company"),
    )


class AITask(Base):
    """AI任务"""
    __tablename__ = "ai_tasks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id"), nullable=False)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("ai_employees.id"), nullable=False)
    sprint_id = Column(UUID(as_uuid=True), ForeignKey("sprints.id"), nullable=True)
    
    title = Column(String(200), nullable=False)
    description = Column(Text)
    task_type = Column(Enum(TaskType), default=TaskType.CUSTOM)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING)
    priority = Column(Enum(Priority), default=Priority.NORMAL)
    
    requirements = Column(JSON, default=dict)
    deliverables = Column(JSON, default=list)
    mcp_calls = Column(JSON, default=list)
    execution_logs = Column(JSON, default=list)
    
    student_review = Column(Text)
    student_rating = Column(Integer, nullable=True)
    
    deadline = Column(DateTime(timezone=True), nullable=True)
    expected_duration = Column(Integer, nullable=True)  # 预估耗时（分钟）
    
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关联关系
    company = relationship("OneCompany", back_populates="tasks")
    assignee = relationship("AIEmployee", back_populates="tasks")
    sprint = relationship("Sprint", back_populates="tasks")
    
    __table_args__ = (
        Index("idx_tasks_company_status", "company_id", "status"),
        Index("idx_tasks_assignee", "assignee_id", "status"),
        CheckConstraint("student_rating >= 1 AND student_rating <= 5", name="chk_rating_range"),
    )


class Sprint(Base):
    """Sprint周期"""
    __tablename__ = "sprints"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id"), nullable=False)
    
    name = Column(String(200), nullable=False)
    goal = Column(Text)
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    status = Column(String(20), default="planning")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关联关系
    company = relationship("OneCompany", back_populates="sprints")
    tasks = relationship("AITask", back_populates="sprint")


class FinanceRecord(Base):
    """财务记录"""
    __tablename__ = "finance_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id"), nullable=False)
    
    record_type = Column(Enum(FinanceType), nullable=False)
    category = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="CNY")
    is_real_money = Column(Boolean, default=False)
    description = Column(Text)
    
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关联关系
    company = relationship("OneCompany", back_populates="finance_records")
    
    __table_args__ = (
        Index("idx_finance_company_type", "company_id", "record_type"),
        Index("idx_finance_date", "company_id", "recorded_at"),
    )


class GatewayReview(Base):
    """阶段评审"""
    __tablename__ = "gateway_reviews"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id"), nullable=False)
    
    stage = Column(Enum(CompanyStage), nullable=False)
    reviewer_type = Column(String(20), default="ai_panel")  # ai_panel / mentor / peer
    review_data = Column(JSON, default=dict)
    decision = Column(Enum(GatewayDecision), nullable=True)
    feedback = Column(Text)
    
    reviewed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关联关系
    company = relationship("OneCompany", back_populates="gateway_reviews")
    
    __table_args__ = (
        Index("idx_gateway_company", "company_id", "stage"),
    )


class VentureLog(Base):
    """创业日志/叙事"""
    __tablename__ = "venture_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id"), nullable=False)
    
    log_type = Column(String(50), nullable=False)  # milestone, reflection, decision
    content = Column(Text, nullable=False)
    metadata = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ============ 触发器 ============

@event.listens_for(FinanceRecord, "after_insert")
def update_company_finance(mapper, connection, target):
    """插入财务记录后自动更新公司累计金额"""
    if target.record_type == FinanceType.REVENUE:
        connection.execute(
            OneCompany.__table__.update()
            .where(OneCompany.id == target.company_id)
            .values(total_revenue=OneCompany.total_revenue + target.amount)
        )
    else:
        connection.execute(
            OneCompany.__table__.update()
            .where(OneCompany.id == target.company_id)
            .values(total_cost=OneCompany.total_cost + target.amount)
        )
