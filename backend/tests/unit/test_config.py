import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_accepts_asyncpg_url() -> None:
    settings = Settings(database_url="postgresql+asyncpg://u:p@localhost:5432/db")
    assert settings.app_env == "local"


def test_rejects_url_without_asyncpg_driver() -> None:
    with pytest.raises(ValidationError, match="postgresql\\+asyncpg"):
        Settings(database_url="postgresql://u:p@localhost:5432/db")


def test_reads_values_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://env:env@db:5432/envdb")
    monkeypatch.setenv("APP_ENV", "staging")
    settings = Settings(_env_file=None)
    assert settings.database_url.endswith("/envdb")
    assert settings.app_env == "staging"


def test_missing_database_url_fails_clearly(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(ValidationError, match="database_url"):
        Settings(_env_file=None)
