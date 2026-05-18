"""认证路由 - 注册、登录、刷新Token、获取当前用户"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from datetime import timedelta

from app.db.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserLogin, UserResponse, AuthResponse, RefreshTokenRequest
from app.core.security import verify_password, get_password_hash, create_access_token, decode_token
from app.core.config import get_settings
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.core.dependencies import get_current_active_user

router = APIRouter(prefix="/auth", tags=["认证"])
settings = get_settings()


@router.post("/register", response_model=ApiResponse[AuthResponse], status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """用户注册"""
    if db.query(User).filter(User.email == user_data.email).first():
        raise BusinessException(
            message="该邮箱已被注册",
            code=ErrorCode.DUPLICATE_ENTRY,
            status_code=status.HTTP_409_CONFLICT,
        )
    if db.query(User).filter(User.username == user_data.username).first():
        raise BusinessException(
            message="该用户名已被使用",
            code=ErrorCode.DUPLICATE_ENTRY,
            status_code=status.HTTP_409_CONFLICT,
        )

    db_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        role=UserRole.student,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    access_token = create_access_token(data={"sub": db_user.id})
    refresh_token = create_access_token(data={"sub": db_user.id}, expires_delta=timedelta(days=30))

    return ApiResponse.ok(data=AuthResponse(
        user=UserResponse.model_validate(db_user),
        tokens={"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"},
    ))


@router.post("/login", response_model=ApiResponse[AuthResponse])
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """用户登录（JSON格式）——支持邮箱或用户名登录"""
    # 先尝试按邮箱查找，如果找不到则按用户名查找
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        user = db.query(User).filter(User.username == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise BusinessException(
            message="邮箱/用户名或密码错误",
            code=ErrorCode.UNAUTHORIZED,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_access_token(data={"sub": user.id}, expires_delta=timedelta(days=30))

    return ApiResponse.ok(data=AuthResponse(
        user=UserResponse.model_validate(user),
        tokens={"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"},
    ))


@router.get("/me", response_model=ApiResponse[UserResponse])
def get_me(current_user: User = Depends(get_current_active_user)):
    """获取当前登录用户信息"""
    return ApiResponse.ok(data=UserResponse.model_validate(current_user))


@router.post("/refresh", response_model=ApiResponse[dict])
def refresh_token(body: RefreshTokenRequest, db: Session = Depends(get_db)):
    """刷新访问Token"""
    payload = decode_token(body.refresh_token)
    if payload is None:
        raise BusinessException(
            message="刷新令牌无效或已过期",
            code=ErrorCode.TOKEN_INVALID,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise BusinessException(
            message="用户不存在",
            code=ErrorCode.UNAUTHORIZED,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    access_token = create_access_token(data={"sub": user.id})
    return ApiResponse.ok(data={"access_token": access_token})
