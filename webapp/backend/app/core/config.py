from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "商识唯智 API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./bizsim.db"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:4173",
        "http://localhost:3000",
        "http://localhost",
        "http://127.0.0.1",
    ]

    # ─── 引擎匣子配置 ──────────────────────────────────────────────
    # 各引擎的 endpoint，格式：ENGINE_<引擎ID大写>_ENDPOINT
    # 例如：ENGINE_FUSHENGJI_ENDPOINT=http://localhost:9001
    #      ENGINE_TECHVENTURE_ENDPOINT=http://localhost:9002
    ENGINE_ENDPOINT: str = ""  # 通用 fallback
    ENGINE_TOKEN: str = ""     # 调用引擎的共享密钥

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
