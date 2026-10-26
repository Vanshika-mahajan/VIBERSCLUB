# Progress

**Last updated:** 2026-10-26

## Completed milestones
- Phase 0 to 2: discovery, PRD, blueprint, ADR-0001 to ADR-0019 (all Accepted; ADR-0013 pending user validation).
- **M0a, backend skeleton** (branch `m0a-backend-skeleton`, pushed, no PR).
- Docs updated for the website-first plan, ADR-0020 (branch `docs/web-first`, pushed, no PR).
- **M0b, website skeleton** (local branch `m0b-web-skeleton`, not pushed).

## Current milestone
M0 Foundations. **Plan changed on 2026-10-26: website first** ([ADR-0020](adr/0020-mobile-first-website-first.md)). M0a and M0b are done. Next: M0c (CI and staging deploys).

## Files created or modified in M0b
| File | Purpose |
| --- | --- |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | pnpm workspace at the root (`apps/*`), shortcuts `pnpm web:dev`, `web:test`, `web:e2e` |
| `apps/web/` | Next.js 16.4.3 + React 19.3 + Tailwind v4 app, created with `create-next-app` |
| `apps/web/app/layout.tsx` | Shell: navigation plus page area; title template, theme colour |
| `apps/web/components/AppNav.tsx`, `lib/nav.ts` | Bottom bar on phones, sidebar on wide screens; active-section logic |
| `apps/web/app/page.tsx`, `components/HealthStatus.tsx`, `lib/api.ts`, `lib/config.ts` | Home page calls `/healthz`, shows loading, "API OK", or a clear error with retry |
| `apps/web/app/{discover,events,explore,chats,profile}/page.tsx` | Placeholder sections, each naming its milestone |
| `apps/web/app/manifest.ts`, `public/icon-*.png`, `app/apple-icon.png`, `app/favicon.ico` | Installable web app manifest and placeholder icons |
| `apps/web/.env.example` | `NEXT_PUBLIC_API_URL` (public, no secrets) |
| `apps/web/vitest.config.mts`, `tests/` | Vitest + React Testing Library |
| `apps/web/playwright.config.ts`, `e2e/` | Playwright on phone and desktop |
| `apps/web/README.md` | Run, check and layout guide |
| `backend/app/core/config.py`, `backend/app/main.py` | `CORS_ALLOWED_ORIGINS` setting and CORS middleware |
| `backend/tests/unit/test_cors.py`, `backend/.env.example` | CORS tests; new setting documented |

## Tests executed (M0b, 2026-10-26, in the cloud workspace)
| Check | Result |
| --- | --- |
| Backend `uv run pytest` | 14 passed (11 from M0a + 3 CORS: parsing, allowed origin, other origin refused) |
| Backend ruff, ruff format, mypy strict | Passed, 18 files |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test` (Vitest) | 6 passed: health loading / ok / API error detail / network error then retry; nav active-state rules |
| `pnpm build` | Passed; all 9 routes prerendered as static |
| `pnpm e2e` (Playwright 1.63, Chromium) | 6 passed (3 tests x phone + desktop): "API OK" from the real API and Postgres; nav position and every section reachable; manifest served |
| `curl` preflight from `http://localhost:3000` | `access-control-allow-origin: http://localhost:3000` |

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
- Icons are simple placeholders (white mountain on teal); swap in the real logo when you have one.
- Not verified here: Safari/iOS and Firefox (e2e runs in Chromium only).
- None in code otherwise. The workspace is temporary: local commits are lost if it is reclaimed before they are pushed.

## Missing credentials or configuration
- None needed for M0a or M0b (local only).
- Needed for M0c: Render account (API hosting), Vercel account (website hosting). Needed for M1: Supabase dev project, Google OAuth client. Details will be given when each is needed.

## Unresolved decisions
- OPEN_QUESTIONS Q1 to Q7 and Q9 (none block M0).

## Next recommended action
Review M0b and ask me to push `m0b-web-skeleton` when ready. Then M0c: GitHub Actions CI (backend and website checks) and staging deploys, which need you to create a Render account (API) and a Vercel account (website).
