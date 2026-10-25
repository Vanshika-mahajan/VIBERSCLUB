"""Every error leaves the API in the same problem-details shape. No database needed."""

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.core.errors import PROBLEM_JSON, ApiError
from app.main import create_app

# Never connected to: these routes don't touch the database.
UNUSED_DB = "postgresql+asyncpg://nobody:nothing@127.0.0.1:1/none"


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app = create_app(Settings(app_env="test", database_url=UNUSED_DB))

    async def raises_api_error() -> None:
        raise ApiError(409, "already_registered", "You are already registered.")

    async def crashes() -> None:
        raise RuntimeError("secret internal detail")

    async def needs_int(count: int) -> dict[str, int]:
        return {"count": count}

    app.add_api_route("/test/api-error", raises_api_error)
    app.add_api_route("/test/crash", crashes)
    app.add_api_route("/test/needs-int", needs_int)

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_unknown_route_is_problem_json(client: AsyncClient) -> None:
    response = await client.get("/does-not-exist")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith(PROBLEM_JSON)
    assert response.json()["code"] == "not_found"


async def test_api_error_keeps_status_and_code(client: AsyncClient) -> None:
    response = await client.get("/test/api-error")
    assert response.status_code == 409
    body = response.json()
    assert body["code"] == "already_registered"
    assert body["detail"] == "You are already registered."
    assert body["title"] == "Conflict"


async def test_validation_error_lists_fields(client: AsyncClient) -> None:
    response = await client.get("/test/needs-int", params={"count": "many"})
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_failed"
    assert body["errors"][0]["loc"] == ["query", "count"]


async def test_unhandled_error_hides_internals(client: AsyncClient) -> None:
    response = await client.get("/test/crash")
    assert response.status_code == 500
    body = response.json()
    assert body["code"] == "internal_error"
    assert "secret internal detail" not in response.text
