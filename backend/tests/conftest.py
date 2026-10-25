"""Shared test fixtures.

Integration tests need a real Postgres with pgvector. They use TEST_DATABASE_URL,
defaulting to the database created by docker-compose.yml. That database may be wiped.
"""

import os
from collections.abc import AsyncIterator

import pytest
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.main import create_app

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/vibers_test"
)


def alembic_config(database_url: str = TEST_DATABASE_URL) -> Config:
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", database_url)
    config.attributes["configure_logger"] = False
    return config


@pytest.fixture(scope="session")
def migrated_database() -> str:
    """Bring the test database to the latest migration once per test run."""
    command.upgrade(alembic_config(), "head")
    return TEST_DATABASE_URL


def make_settings(database_url: str) -> Settings:
    return Settings(app_env="test", database_url=database_url)


async def make_client(database_url: str) -> AsyncIterator[AsyncClient]:
    app = create_app(make_settings(database_url))
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    await app.state.engine.dispose()


@pytest.fixture
async def client(migrated_database: str) -> AsyncIterator[AsyncClient]:
    async for c in make_client(migrated_database):
        yield c
