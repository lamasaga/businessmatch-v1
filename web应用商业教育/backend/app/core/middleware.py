"""全局中间件：请求日志、处理时间、请求ID"""

import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger("bizsim")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """请求日志中间件 - 记录请求处理时间和基本信息"""

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        start_time = time.time()
        path = request.url.path
        method = request.method

        # 跳过健康检查日志
        if path in ["/health", "/"]:
            return await call_next(request)

        logger.info(f"[{request_id}] {method} {path} - started")

        try:
            response: Response = await call_next(request)
            process_time = (time.time() - start_time) * 1000
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
            logger.info(
                f"[{request_id}] {method} {path} - {response.status_code} - {process_time:.2f}ms"
            )
            return response
        except Exception as exc:
            process_time = (time.time() - start_time) * 1000
            logger.error(
                f"[{request_id}] {method} {path} - ERROR - {process_time:.2f}ms - {exc}"
            )
            raise


class CORSSecurityMiddleware:
    """CORS安全增强 - 生产环境限制来源"""
    pass  # FastAPI原生CORS已足够，如需更复杂控制可扩展
