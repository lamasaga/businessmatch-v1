"""
OPC FastAPI 路由骨架
可直接复制到现有后端项目中扩展
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.db.database import get_db
from app.core.security import verify_token, get_current_user
from app.schemas.opc import (
    CompanyCreate, CompanyUpdate, CompanyResponse,
    EmployeeCreate, EmployeeResponse,
    TaskCreate, TaskResponse, TaskReview,
    FinanceRecordCreate, FinanceRecordResponse,
    GatewayReviewCreate, GatewayReviewResponse
)
from app.services.opc import (
    CompanyService, EmployeeService, TaskService,
    FinanceService, PipelineService
)

# 创建路由
router = APIRouter(prefix="/api/v1/opc", tags=["OPC"])
security = HTTPBearer()


# ============ 公司管理 ============

@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """创建新公司"""
    service = CompanyService(db)
    company = service.create(
        user_id=current_user["id"],
        career_id=current_user["career_id"],
        data=data
    )
    return company


@router.get("/companies", response_model=List[CompanyResponse])
async def list_companies(
    status: Optional[str] = Query(None, enum=["active", "archived"]),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """获取用户的公司列表"""
    service = CompanyService(db)
    return service.list_by_user(
        user_id=current_user["id"],
        status=status,
        page=page,
        page_size=page_size
    )


@router.get("/companies/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """获取公司详情"""
    service = CompanyService(db)
    company = service.get(company_id)
    
    if not company or company.user_id != current_user["id"]:
        raise HTTPException(status_code=404, detail="公司不存在")
    
    return company


@router.patch("/companies/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: UUID,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """更新公司信息"""
    service = CompanyService(db)
    company = service.update(
        company_id=company_id,
        user_id=current_user["id"],
        data=data
    )
    return company


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_company(
    company_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """归档公司（软删除）"""
    service = CompanyService(db)
    service.archive(company_id=company_id, user_id=current_user["id"])
    return None


# ============ AI员工管理 ============

@router.post("/companies/{company_id}/employees", response_model=EmployeeResponse)
async def hire_employee(
    company_id: UUID,
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """雇佣AI员工"""
    service = EmployeeService(db)
    employee = service.hire(
        company_id=company_id,
        user_id=current_user["id"],
        role_type=data.role_type,
        name=data.name
    )
    return employee


@router.get("/companies/{company_id}/employees", response_model=List[EmployeeResponse])
async def list_employees(
    company_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """获取公司AI员工列表"""
    service = EmployeeService(db)
    return service.list_by_company(company_id=company_id, user_id=current_user["id"])


@router.delete("/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def dismiss_employee(
    employee_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """解雇AI员工"""
    service = EmployeeService(db)
    service.dismiss(employee_id=employee_id, user_id=current_user["id"])
    return None


# ============ 任务管理 ============

@router.post("/companies/{company_id}/tasks", response_model=TaskResponse)
async def create_task(
    company_id: UUID,
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """创建任务"""
    service = TaskService(db)
    task = service.create(
        company_id=company_id,
        user_id=current_user["id"],
        data=data
    )
    return task


@router.get("/companies/{company_id}/tasks", response_model=List[TaskResponse])
async def list_tasks(
    company_id: UUID,
    status: Optional[str] = Query(None, enum=["pending", "in_progress", "review", "completed", "rejected"]),
    assignee_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """获取任务列表"""
    service = TaskService(db)
    return service.list_by_company(
        company_id=company_id,
        user_id=current_user["id"],
        status=status,
        assignee_id=assignee_id
    )


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """获取任务详情"""
    service = TaskService(db)
    task = service.get(task_id=task_id, user_id=current_user["id"])
    return task


@router.post("/tasks/{task_id}/review", response_model=TaskResponse)
async def review_task(
    task_id: UUID,
    review: TaskReview,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """提交任务评审"""
    service = TaskService(db)
    task = service.submit_review(
        task_id=task_id,
        user_id=current_user["id"],
        review=review
    )
    return task


# ============ 财务管理 ============

@router.get("/companies/{company_id}/finance")
async def get_finance_report(
    company_id: UUID,
    period: str = Query("weekly", enum=["weekly", "monthly", "quarterly"]),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """获取财务报表"""
    service = FinanceService(db)
    return service.get_report(
        company_id=company_id,
        user_id=current_user["id"],
        period=period
    )


@router.post("/companies/{company_id}/finance/records", response_model=FinanceRecordResponse)
async def add_finance_record(
    company_id: UUID,
    data: FinanceRecordCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """添加财务记录"""
    service = FinanceService(db)
    record = service.add_record(
        company_id=company_id,
        user_id=current_user["id"],
        data=data
    )
    return record


# ============ 流水线管理 ============

@router.get("/companies/{company_id}/pipeline")
async def get_pipeline_status(
    company_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """获取创业流水线状态"""
    service = PipelineService(db)
    return service.get_status(company_id=company_id, user_id=current_user["id"])


@router.post("/companies/{company_id}/gateway-reviews", response_model=GatewayReviewResponse)
async def submit_gateway_review(
    company_id: UUID,
    data: GatewayReviewCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """提交Gateway评审"""
    service = PipelineService(db)
    review = service.submit_gateway_review(
        company_id=company_id,
        user_id=current_user["id"],
        data=data
    )
    return review


# ============ WebSocket 连接 ============

from fastapi import WebSocket, WebSocketDisconnect

@router.websocket("/ws/companies/{company_id}")
async def company_websocket(
    websocket: WebSocket,
    company_id: UUID,
    token: str,
    db: Session = Depends(get_db)
):
    """公司实时状态WebSocket"""
    # 验证token
    user = verify_token(token)
    if not user:
        await websocket.close(code=4001, reason="未认证")
        return
    
    # 验证权限
    service = CompanyService(db)
    if not service.check_access(company_id, user["id"]):
        await websocket.close(code=4003, reason="无权限")
        return
    
    await websocket.accept()
    
    try:
        # 注册连接
        await register_ws_connection(user["id"], company_id, websocket)
        
        while True:
            # 接收心跳或指令
            data = await websocket.receive_json()
            
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong", "timestamp": data.get("timestamp")})
            
            elif data.get("type") == "subscribe":
                # 处理订阅请求
                await handle_subscription(websocket, data.get("channels", []))
    
    except WebSocketDisconnect:
        await unregister_ws_connection(user["id"], websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await unregister_ws_connection(user["id"], websocket)
