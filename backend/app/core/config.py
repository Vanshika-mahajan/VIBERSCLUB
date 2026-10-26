"""Application settings, read from environment variables (or a local `.env` file).

Every setting the backend needs is declared here, so a missing or malformed value
fails at startup with a clear message instead of deep inside a request.
"""

from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: Literal["local", "test", "staging", "production"] = "local"

    # SQLAlchemy URL using the asyncpg driver, e.g.
    # postgresql+asyncpg://postgres:postgres@localhost:5432/vibers
    database_url: str

    # Comma-separated list of website origins allowed to call the API from a browser.
    cors_allowed_origins: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_allowed_origins.split(",") if o.strip()]

    @field_validator("database_url")
    @classmethod
    def _require_asyncpg(cls, value: str) -> str:
        if not value.startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL must start with postgresql+asyncpg://")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()  # values come from the environment
