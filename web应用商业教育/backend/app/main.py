"""FastAPI 应用入口"""

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.response import (
    ApiResponse,
    BusinessException,
    business_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    global_exception_handler,
)
from app.core.middleware import RequestLoggingMiddleware
from app.api import auth, wiki, courses, ohb
from fastapi.exceptions import RequestValidationError, HTTPException as FastAPIHTTPException

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="商域 - 商业模拟教育平台后端 API",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,

)

# 注册全局异常处理器
app.add_exception_handler(BusinessException, business_exception_handler)
app.add_exception_handler(FastAPIHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# 请求日志中间件
app.add_middleware(RequestLoggingMiddleware)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router, prefix="/api/v1")
app.include_router(wiki.router, prefix="/api/v1")
app.include_router(courses.router, prefix="/api/v1")
app.include_router(ohb.router, prefix="/api/v1")


@app.get("/", response_model=ApiResponse[dict])
def root():
    return ApiResponse.ok(data={
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs" if settings.DEBUG else None,
    })


@app.get("/health", response_model=ApiResponse[dict])
def health_check():
    return ApiResponse.ok(data={"status": "healthy", "service": settings.APP_NAME})
