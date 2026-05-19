"""OPC API 路由"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.opc import OneCompany, AIEmployee, AITask, CompanyStage, EmployeeStatus, TaskStatus
from app.schemas.opc import (
    OneCompanyCreate, OneCompanyOut, OneCompanyUpdate, CompanyDetailOut,
    AIEmployeeCreate, AIEmployeeOut,
    AITaskCreate, AITaskOut, AITaskUpdate,
)
from app.core.response import ApiResponse

router = APIRouter(prefix="/opc", tags=["OPC - 一人公司"])


# ============= 公司 =============

@router.get("/companies", response_model=ApiResponse[List[OneCompanyOut]])
def list_companies(db: Session = Depends(get_db)):
    """获取公司列表（Demo：返回所有，生产应限制当前用户）"""
    companies = db.query(OneCompany).all()
    result = []
    for c in companies:
        out = OneCompanyOut.model_validate(c)
        out.employee_count = len(c.employees)
        out.task_stats = {
            "pending": len([t for t in c.tasks if t.status == TaskStatus.PENDING]),
            "in_progress": len([t for t in c.tasks if t.status == TaskStatus.IN_PROGRESS]),
            "completed": len([t for t in c.tasks if t.status == TaskStatus.COMPLETED]),
        }
        result.append(out)
    return ApiResponse.ok(data=result)


@router.post("/companies", response_model=ApiResponse[OneCompanyOut])
def create_company(body: OneCompanyCreate, db: Session = Depends(get_db)):
    """创建公司"""
    import uuid
    slug = f"{body.name.lower().replace(' ', '-')}-{str(uuid.uuid4())[:8]}"
    company = OneCompany(
        user_id=1,  # Demo: 默认关联到第一个用户
        name=body.name,
        slug=slug,
        description=body.description,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return ApiResponse.ok(data=OneCompanyOut.model_validate(company))


@router.get("/companies/{company_id}", response_model=ApiResponse[CompanyDetailOut])
def get_company(company_id: int, db: Session = Depends(get_db)):
    """获取公司详情（含员工和任务）"""
    company = db.query(OneCompany).filter(OneCompany.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="公司不存在")
    out = CompanyDetailOut.model_validate(company)
    out.employee_count = len(company.employees)
    out.task_stats = {
        "pending": len([t for t in company.tasks if t.status == TaskStatus.PENDING]),
        "in_progress": len([t for t in company.tasks if t.status == TaskStatus.IN_PROGRESS]),
        "completed": len([t for t in company.tasks if t.status == TaskStatus.COMPLETED]),
    }
    return ApiResponse.ok(data=out)


@router.patch("/companies/{company_id}", response_model=ApiResponse[OneCompanyOut])
def update_company(company_id: int, body: OneCompanyUpdate, db: Session = Depends(get_db)):
    company = db.query(OneCompany).filter(OneCompany.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="公司不存在")
    if body.name is not None:
        company.name = body.name
    if body.description is not None:
        company.description = body.description
    if body.stage is not None:
        company.stage = CompanyStage(body.stage)
    if body.business_model_canvas is not None:
        company.business_model_canvas = body.business_model_canvas
    db.commit()
    db.refresh(company)
    return ApiResponse.ok(data=OneCompanyOut.model_validate(company))


# ============= AI 员工 =============

@router.get("/companies/{company_id}/employees", response_model=ApiResponse[List[AIEmployeeOut]])
def list_employees(company_id: int, db: Session = Depends(get_db)):
    employees = db.query(AIEmployee).filter(AIEmployee.company_id == company_id).all()
    return ApiResponse.ok(data=[AIEmployeeOut.model_validate(e) for e in employees])


@router.post("/companies/{company_id}/employees", response_model=ApiResponse[AIEmployeeOut])
def hire_employee(company_id: int, body: AIEmployeeCreate, db: Session = Depends(get_db)):
    """雇佣 AI 员工"""
    company = db.query(OneCompany).filter(OneCompany.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="公司不存在")

    existing = db.query(AIEmployee).filter(
        AIEmployee.company_id == company_id,
        AIEmployee.codename == body.codename
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"员工 {body.codename} 已存在")

    employee = AIEmployee(
        company_id=company_id,
        codename=body.codename,
        name=body.name,
        avatar_emoji=body.avatar_emoji,
        role_type=body.role_type,
        level=body.level,
        skills=body.skills,
        personality_prompt=f"You are {body.name} ({body.codename}), a {body.role_type} AI employee."
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return ApiResponse.ok(data=AIEmployeeOut.model_validate(employee))


@router.get("/employees/{employee_id}", response_model=ApiResponse[AIEmployeeOut])
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = db.query(AIEmployee).filter(AIEmployee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="员工不存在")
    return ApiResponse.ok(data=AIEmployeeOut.model_validate(employee))


# ============= 任务 =============

@router.get("/companies/{company_id}/tasks", response_model=ApiResponse[List[AITaskOut]])
def list_tasks(company_id: int, status: str = None, db: Session = Depends(get_db)):
    query = db.query(AITask).filter(AITask.company_id == company_id)
    if status:
        query = query.filter(AITask.status == status)
    tasks = query.order_by(AITask.created_at.desc()).all()
    return ApiResponse.ok(data=[AITaskOut.model_validate(t) for t in tasks])


@router.post("/companies/{company_id}/tasks", response_model=ApiResponse[AITaskOut])
def create_task(company_id: int, body: AITaskCreate, db: Session = Depends(get_db)):
    """创建任务"""
    company = db.query(OneCompany).filter(OneCompany.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="公司不存在")

    employee = db.query(AIEmployee).filter(AIEmployee.id == body.assignee_id).first()
    if not employee or employee.company_id != company_id:
        raise HTTPException(status_code=400, detail="指派员工不存在或不属于该公司")

    task = AITask(
        company_id=company_id,
        assignee_id=body.assignee_id,
        title=body.title,
        description=body.description,
        task_type=body.task_type,
        priority=body.priority,
        requirements=body.requirements,
    )
    db.add(task)

    # 更新员工状态为忙碌
    employee.status = EmployeeStatus.BUSY

    db.commit()
    db.refresh(task)
    return ApiResponse.ok(data=AITaskOut.model_validate(task))


@router.patch("/tasks/{task_id}", response_model=ApiResponse[AITaskOut])
def update_task(task_id: int, body: AITaskUpdate, db: Session = Depends(get_db)):
    task = db.query(AITask).filter(AITask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    if body.status is not None:
        task.status = TaskStatus(body.status)
        if body.status == "in_progress" and not task.started_at:
            from datetime import datetime
            task.started_at = datetime.now()
        if body.status in ("completed", "rejected"):
            from datetime import datetime
            task.completed_at = datetime.now()
            task.progress = 100 if body.status == "completed" else 0
            # 更新员工状态
            employee = db.query(AIEmployee).filter(AIEmployee.id == task.assignee_id).first()
            if employee:
                employee.status = EmployeeStatus.IDLE
                if body.status == "completed":
                    employee.tasks_completed += 1

    if body.progress is not None:
        task.progress = body.progress

    if body.student_review is not None:
        task.student_review = body.student_review

    if body.student_rating is not None:
        task.student_rating = body.student_rating

    db.commit()
    db.refresh(task)
    return ApiResponse.ok(data=AITaskOut.model_validate(task))
