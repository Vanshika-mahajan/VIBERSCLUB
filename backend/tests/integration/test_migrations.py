"""Migrations must apply cleanly and be reversible."""

import asyncio

from alembic import command
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from tests.conftest import TEST_DATABASE_URL, alembic_config


async def _fetch_state() -> tuple[bool, set[str]]:
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.connect() as conn:
        has_schema = (
            await conn.execute(
                text("select exists(select 1 from pg_namespace where nspname = 'app')")
            )
        ).scalar_one()
        extensions = set((await conn.execute(text("select extname from pg_extension"))).scalars())
    await engine.dispose()
    return bool(has_schema), extensions


def test_upgrade_downgrade_upgrade_round_trip() -> None:
    config = alembic_config()

    command.upgrade(config, "head")
    has_schema, extensions = asyncio.run(_fetch_state())
    assert has_schema
    assert {"vector", "citext"} <= extensions

    command.downgrade(config, "base")
    has_schema, _ = asyncio.run(_fetch_state())
    assert not has_schema

    command.upgrade(config, "head")
    has_schema, _ = asyncio.run(_fetch_state())
    assert has_schema
