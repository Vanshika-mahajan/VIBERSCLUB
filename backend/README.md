# Vibers Club backend

FastAPI API (and, from M3, the background worker). Architecture: [docs/SYSTEM_ARCHITECTURE.md](../docs/SYSTEM_ARCHITECTURE.md).

## Prerequisites

- [uv](https://docs.astral.sh/uv/) (manages Python 3.12+ and dependencies)
- Docker Desktop, for the local Postgres with pgvector, or any Postgres 16 with the `vector` extension installed

## First run

```bash
# 1. Start the database (from the repo root)
docker compose up -d db

# 2. Install dependencies and create your local settings file
cd backend
uv sync
cp .env.example .env          # edit if your database is not the docker-compose one

# 3. Apply migrations
uv run alembic upgrade head

# 4. Start the API
uv run uvicorn app.main:app --reload

# 5. Check it
curl http://localhost:8000/healthz     # {"status":"ok","database":"ok"}
```

Interactive API docs: http://localhost:8000/docs

## Checks (run all of these before opening a pull request)

```bash
uv run ruff check .            # lint
uv run ruff format --check .   # formatting
uv run mypy app tests migrations
uv run pytest                  # needs the database; uses TEST_DATABASE_URL
```

## Layout

| Path | What it holds |
| --- | --- |
| `app/main.py` | Builds the FastAPI app |
| `app/core/` | Settings, database engine, error format, health check |
| `app/modules/` | One package per product module (from M1) |
| `migrations/` | Alembic migrations; every schema change goes here |
| `tests/unit/` | Tests without a database |
| `tests/integration/` | Tests against a real Postgres |

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `DATABASE_URL ... Field required` on start | No `.env` file, or the variable is missing |
| `DATABASE_URL must start with postgresql+asyncpg://` | The URL uses another driver prefix |
| `/healthz` returns 503 `database_unavailable` | Database not running or wrong URL |
| `extension "vector" is not available` during migration | Your Postgres lacks pgvector; use the docker-compose image |
| Tests fail with connection refused | Database not running, or `TEST_DATABASE_URL` points elsewhere |
