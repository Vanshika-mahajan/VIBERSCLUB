"""The browser may call the API only from the website's own origins."""

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.main import create_app

UNUSED_DB = "postgresql+asyncpg://nobody:nothing@127.0.0.1:1/none"


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    settings = Settings(
        database_url=UNUSED_DB,
        cors_allowed_origins="http://localhost:3000, https://vibers.example/",
    )
    transport = ASGITransport(app=create_app(settings))
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


def test_origins_are_split_and_trimmed() -> None:
    settings = Settings(database_url=UNUSED_DB, cors_allowed_origins=" a.test , b.test/ ,")
    assert settings.cors_origins == ["a.test", "b.test"]


async def test_preflight_from_allowed_origin(client: AsyncClient) -> None:
    response = await client.options(
        "/healthz",
        headers={
            "Origin": "https://vibers.example",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://vibers.example"


async def test_preflight_from_other_origin_is_refused(client: AsyncClient) -> None:
    response = await client.options(
        "/healthz",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert "access-control-allow-origin" not in response.headers
