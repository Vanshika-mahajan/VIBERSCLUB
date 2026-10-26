"""FastAPI application factory.

Run locally with:  uv run uvicorn app.main:app --reload
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.config import Settings, get_settings
from app.core.db import create_engine
from app.core.errors import register_error_handlers
from app.core.health import router as health_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    engine = create_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        yield
        await engine.dispose()

    app = FastAPI(title="Vibers Club API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.engine = engine
    app.state.sessionmaker = async_sessionmaker(engine, expire_on_commit=False)

    # Browsers only let the website call the API if the API names the website's origin.
    # Auth uses the Authorization header (not cookies), so credentials stay off.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
    )
    register_error_handlers(app)
    app.include_router(health_router)
    return app


def __getattr__(name: str) -> FastAPI:
    # `uvicorn app.main:app` builds the app on first access, so importing this module
    # (for example in tests) does not require DATABASE_URL to be set.
    if name == "app":
        return create_app()
    raise AttributeError(name)
