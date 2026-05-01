from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # core
    environment: str = "development"
    allowed_origins: str = "http://localhost:3000"

    # storage
    upload_dir: Path = Path("/var/recallai/uploads")
    result_dir: Path = Path("/var/recallai/results")
    max_upload_size_mb: int = 50
    job_ttl_hours: int = 24

    # auth (shared with NextAuth)
    nextauth_secret: str = Field(default="dev-secret-change-me")
    jwt_algorithm: str = "HS256"

    # database / redis
    database_url: str = "postgresql+asyncpg://recallai:recallai@postgres:5432/recallai"
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/0"
    celery_result_backend: str = "redis://redis:6379/1"

    # celery
    celery_concurrency: int = 4

    # rate limits (per-user, app-level)
    rate_limit_default: str = "60/minute"
    rate_limit_upload: str = "20/hour"
    rate_limit_concurrent_jobs: int = 2

    # BYOK key handling
    gemini_key_pepper: str = "dev-pepper-change-me"

    # gemini
    default_model: str = "gemini-3-flash-preview"


@lru_cache
def get_settings() -> Settings:
    return Settings()


SETTINGS = get_settings()
SETTINGS.upload_dir.mkdir(parents=True, exist_ok=True)
SETTINGS.result_dir.mkdir(parents=True, exist_ok=True)

GEMINI_MODELS = [
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
]
