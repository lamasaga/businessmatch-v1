"""全局依赖：权限校验、分页参数"""

from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.models.user import User, UserRole
from app.core.security import decode_token
from app.core.response import BusinessException, ErrorCode

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


class PaginationParams:
    """分页参数"""
    def __init__(
        self,
        page: int = Query(1, ge=1, description="页码"),
        page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    ):
        self.page = page
        self.page_size = page_size
        self.offset = (page - 1) * page_size


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """获取当前登录用户"""
    if not token:
        raise BusinessException(
            message="Authentication required",
            code=ErrorCode.UNAUTHORIZED,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    payload = decode_token(token)
    if payload is None:
        raise BusinessException(
            message="Invalid or expired token",
            code=ErrorCode.TOKEN_INVALID,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    user_id = payload.get("sub")
    if user_id is None:
        raise BusinessException(
            message="Invalid token payload",
            code=ErrorCode.TOKEN_INVALID,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise BusinessException(
            message="User not found",
            code=ErrorCode.UNAUTHORIZED,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """获取当前活跃用户（可扩展为检查账户是否被禁用）"""
    return current_user


class RoleChecker:
    """角色权限检查器"""
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise BusinessException(
                message="Permission denied",
                code=ErrorCode.FORBIDDEN,
                status_code=status.HTTP_403_FORBIDDEN,
            )
        return current_user


# 常用权限组合
require_student = RoleChecker([UserRole.student, UserRole.teacher, UserRole.admin])
require_teacher = RoleChecker([UserRole.teacher, UserRole.admin])
require_admin = RoleChecker([UserRole.admin])
