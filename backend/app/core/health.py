"""Liveness check used by the hosting platform and by the mobile app's first screen."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.errors import ApiError

router = APIRouter(tags=["health"])


@router.get("/healthz")
async def healthz(session: Annotated[AsyncSession, Depends(get_session)]) -> dict[str, str]:
    try:
        await session.execute(text("select 1"))
    except (SQLAlchemyError, OSError) as exc:
        raise ApiError(503, "database_unavailable", "The database is not reachable.") from exc
    return {"status": "ok", "database": "ok"}
