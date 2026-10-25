"""Create the app schema and the extensions later milestones rely on.

- `app` schema: all application tables live here, not in `public`, so Supabase's
  auto-generated Data API cannot expose them (ADR-0018).
- `vector` (pgvector): embeddings for semantic matching (ADR-0004, ADR-0011).
- `citext`: case-insensitive emails.

Revision ID: 0001
Revises:
Create Date: 2026-10-25
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")
    op.execute("CREATE SCHEMA IF NOT EXISTS app")


def downgrade() -> None:
    # Extensions are left in place: on Supabase they may be shared with other schemas.
    op.execute("DROP SCHEMA IF EXISTS app CASCADE")
