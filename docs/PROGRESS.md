# Progress

**Last updated:** 2026-10-25

## Completed milestones
- Docs updated for the website-first plan (local branch `docs/web-first`, not pushed).
- Phase 0 to 2: discovery, PRD, blueprint, ADR-0001 to ADR-0019 (all Accepted; ADR-0013 pending user validation).
- **M0a, backend skeleton** (local branch `m0a-backend-skeleton`, not pushed).

## Current milestone
M0 Foundations. **Plan changed on 2026-10-26: website first** ([ADR-0020](adr/0020-mobile-first-website-first.md)). Next step: M0b (Next.js website skeleton), then M0c (CI and staging deploys).

## Files created or modified in M0a
| File | Purpose |
| --- | --- |
| `backend/pyproject.toml`, `backend/uv.lock` | Python project, pinned dependencies, ruff, mypy and pytest settings |
| `backend/app/main.py` | FastAPI app factory |
| `backend/app/core/config.py` | Settings from environment variables, with validation |
| `backend/app/core/db.py` | Async database engine and session dependency |
| `backend/app/core/errors.py` | Problem-details error format for every error |
| `backend/app/core/health.py` | `GET /healthz` with a database check |
| `backend/alembic.ini`, `backend/migrations/` | Alembic setup; migration 0001 creates the `app` schema and the `vector` and `citext` extensions |
| `backend/tests/` | Unit, API and integration tests |
| `backend/.env.example` | Sanitized settings template (no secrets) |
| `backend/README.md` | How to run, check and troubleshoot |
| `docker-compose.yml`, `docker/postgres-init/` | Local Postgres 16 with pgvector, plus a test database |
| `docs/TESTING_STRATEGY.md` | Added the required end-to-end journey |
| `docs/IMPLEMENTATION_ROADMAP.md` | M0 split into M0a, M0b, M0c |

## Tests executed (M0a, 2026-10-25, in the cloud workspace)
| Check | Result |
| --- | --- |
| `uv run pytest` | 11 passed (4 config, 4 error-format, 2 health check, 1 migration round-trip), also with deprecation warnings treated as errors |
| `uv run ruff check .` / `ruff format --check .` | Passed |
| `uv run mypy app tests migrations` (strict) | Passed, 17 files |
| `alembic upgrade head` from the command line | Applied 0001 |
| `uvicorn` + `curl /healthz` | `200 {"status":"ok","database":"ok"}`; unknown route returns problem JSON 404 |

Tests ran against Postgres 16.15 with pgvector 0.6.0 installed natively in the workspace. **Not verified here:** `docker-compose.yml` (Docker cannot run in this workspace). Please run `docker compose up -d db` once on your machine to confirm.

## Known issues
- None in code. The workspace is temporary: local commits are lost if it is reclaimed before they are pushed.

## Missing credentials or configuration
- None needed for M0a (local database only).
- Needed for M0c: Render account (API hosting), Vercel account (website hosting). Needed for M1: Supabase dev project, Google OAuth client. Details will be given when each is needed.

## Unresolved decisions
- OPEN_QUESTIONS Q1 to Q7 and Q9 (none block M0).

## Next recommended action
Confirm the website-first doc changes, then approve M0b (Next.js website with five empty sections that shows the `/healthz` result). Ask me to push M0a and the doc changes whenever you want them on GitHub.
