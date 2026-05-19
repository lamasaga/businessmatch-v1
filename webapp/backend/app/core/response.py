"""统一API响应格式与全局异常处理"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, HTTPException as FastAPIHTTPException
from pydantic import BaseModel
from typing import TypeVar, Generic, Optional, Any

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """统一API响应格式"""
    success: bool = True
    code: int = 0
    message: str = "success"
    data: Optional[T] = None

    @classmethod
    def ok(cls, data: Optional[T] = None, message: str = "success") -> "ApiResponse[T]":
        return cls(success=True, code=0, message=message, data=data)

    @classmethod
    def error(cls, message: str, code: int = 1, data: Optional[T] = None) -> "ApiResponse[T]":
        return cls(success=False, code=code, message=message, data=data)


class BusinessException(Exception):
    """业务异常"""
    def __init__(self, message: str, code: int = 400, status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


# 错误码定义
class ErrorCode:
    SUCCESS = 0
    UNKNOWN_ERROR = 1000
    VALIDATION_ERROR = 1001
    UNAUTHORIZED = 1002
    FORBIDDEN = 1003
    NOT_FOUND = 1004
    DUPLICATE_ENTRY = 1005
    BAD_REQUEST = 1006
    TOKEN_EXPIRED = 1007
    TOKEN_INVALID = 1008


async def business_exception_handler(request: Request, exc: BusinessException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse.error(
            message=exc.message,
            code=exc.code,
        ).model_dump(),
    )


async def http_exception_handler(request: Request, exc: FastAPIHTTPException) -> JSONResponse:
    code_map = {
        400: ErrorCode.BAD_REQUEST,
        401: ErrorCode.UNAUTHORIZED,
        403: ErrorCode.FORBIDDEN,
        404: ErrorCode.NOT_FOUND,
    }
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse.error(
            message=exc.detail if isinstance(exc.detail, str) else "Request error",
            code=code_map.get(exc.status_code, ErrorCode.UNKNOWN_ERROR),
        ).model_dump(),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = []
    for error in exc.errors():
        field = ".".join(str(x) for x in error["loc"])
        errors.append(f"{field}: {error['msg']}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ApiResponse.error(
            message="; ".join(errors),
            code=ErrorCode.VALIDATION_ERROR,
        ).model_dump(),
    )


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ApiResponse.error(
            message="Internal server error",
            code=ErrorCode.UNKNOWN_ERROR,
        ).model_dump(),
    )
