# Vibers Club — Testing Strategy

- **Status:** Draft v0.1, for review
- **Last updated:** 2026-10-25

Most of the risk in Vibers Club sits in the backend rules: who can see whom, capacity, blocks. So most tests live there, and they run against a real Postgres. The app gets fewer but focused tests. AI quality is measured by an evaluation harness, not by unit tests.

## Test layers

| Layer | Tool | What it covers | Runs |
| --- | --- | --- | --- |
| Backend unit | pytest | Pure functions: scoring signals, eligibility predicates built in Python, date maths, validation, synonym mapping, explanation templates | Every push |
| Backend integration | pytest + real Postgres with pgvector (Docker locally, service container in CI); FastAPI `TestClient`; test JWTs signed by a local key | Every endpoint's happy path, validation errors, and **authorization negatives**; transactions and constraints; capacity concurrency; job idempotency | Every push |
| Worker jobs | pytest with Procrastinate's in-memory connector plus real DB | Each job runs twice safely; retries; final failure states | Every push |
| AI adapter | pytest with a fake LLM adapter returning recorded fixtures (valid, invalid, hostile, timeout) | Pipeline behaviour, never real model quality | Every push |
| AI evaluation | `eval/run_eval.py` against real providers | Extraction F1, intent and area accuracy, matching AUC and NDCG | Manually, and required before changing model, prompt, taxonomy or weights |
| Migrations | `alembic upgrade head` then `downgrade -1` then `upgrade head` on an empty database; plus upgrade against a copy of seeded data | Every migration reversible and applies cleanly | Every push |
| Website unit and component | Vitest + React Testing Library | Form validation, state handling, rendering of API error codes, analytics has no PII | Every push |
| Website end to end | Playwright in Chromium with a phone-sized viewport (and one desktop run), against a local stack or staging | The required journey below, then connect, chat, RSVP | Every pull request once the journey exists (from M4) |
| Contract | Regenerate the TypeScript client from OpenAPI in CI and fail if the committed client differs | App and API agree | Every push |

## Required end-to-end journey

The minimum journey every release must pass (ARPIT, 2026-10-25):

> Sign up → complete onboarding → select interests → write a vibe (in the MVP, the profile vibe is the "post"; real posts are phase 2) → the vibe's intent is extracted → discover relevant Vibers.

It is first covered as a backend API test (from M4, using a fake LLM adapter), then as a Playwright test in a real browser. Connections, events and other features are added to the journey as their milestones land.

## Rules

- **Every endpoint has a negative authorization test.** A shared fixture creates: a normal Viber, an unverified Viber, a blocked pair, a host, a moderator and a suspended user. Each route is called as each relevant role.
- **No mocking the database.** Integration tests use the real schema created by migrations, rolled back per test (transaction per test) or truncated.
- **Deterministic time.** A `clock` dependency is injected so tests can freeze "now" (needed for dates, reminders, 18+ checks).
- **Concurrency tests** for registrations (20 parallel requests for 5 seats), connection requests from both sides, and double-submitted messages.
- **Never skip or disable a failing test to get green.** Fix it or open an issue and fix it before the milestone closes.
- **Coverage** is reported but not a target; the authorization and eligibility suites are required to be complete.

## Test data

- `backend/tests/factories.py` builds users, plans, events with sensible defaults.
- `data/seed/` is loaded in integration tests that need taxonomy and areas.
- Demo seed (`python -m app.seed --demo`) creates clearly labelled test Vibers and events for staging and the pitch; it refuses to run against production.

## CI pipeline (GitHub Actions)

1. Backend: `uv sync`, `ruff check`, `ruff format --check`, `mypy`, `pytest` (with a Postgres + pgvector service container), migration round-trip.
2. Website: `pnpm install`, `eslint`, `tsc --noEmit`, `vitest`, `next build`; Playwright end to end.
3. Contract: regenerate API client and diff.
4. Security: gitleaks, `pip-audit`, `pnpm audit --audit-level high`.

A pull request merges only when all four are green.

## What "verified" means in our updates

When reporting progress, "tested" means the command was run and passed in this environment, with the output available. Anything not run is reported as untested.
