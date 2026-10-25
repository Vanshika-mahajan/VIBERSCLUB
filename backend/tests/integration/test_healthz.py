from httpx import AsyncClient

from tests.conftest import make_client


async def test_healthz_reports_database_ok(client: AsyncClient) -> None:
    response = await client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


async def test_healthz_returns_503_when_database_is_down() -> None:
    unreachable = "postgresql+asyncpg://postgres:postgres@127.0.0.1:1/nothing"
    async for client in make_client(unreachable):
        response = await client.get("/healthz")
        assert response.status_code == 503
        assert response.json()["code"] == "database_unavailable"
        # The client must not see connection strings or driver errors.
        assert "127.0.0.1" not in response.text
