"""用户相关 Pydantic Schema"""

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=2, max_length=50)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=6)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserPublic(BaseModel):
    """用户公开信息"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    avatar: Optional[str] = None
    role: UserRole
    level: int = 1


class UserResponse(UserBase):
    """用户详细信息（本人查看）"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    role: UserRole
    avatar: Optional[str] = None
    bio: Optional[str] = None
    experience: int = 0
    level: int = 1
    created_at: datetime


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    user: UserResponse
    tokens: TokenPair


class TokenPayload(BaseModel):
    sub: Optional[int] = None