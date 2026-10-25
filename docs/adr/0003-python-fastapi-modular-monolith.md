# ADR-0003: Python FastAPI modular monolith for the backend

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** ARPIT (comfortable in Python)

## Context
The backend must enforce authorization, run AI extraction and ranking, and be maintainable by a small team led by a Python developer.

## Options considered
1. **FastAPI modular monolith.** One deployable, clear internal modules, Pydantic validation, strong AI and evaluation ecosystem.
2. **TypeScript backend (NestJS or Node).** One language with the app, but the lead developer is stronger in Python.
3. **Backend-as-a-service only (Supabase with row-level security and edge functions).** Little server code, but complex business rules (eligibility, ranking, moderation) become hard to test and reason about.
4. **Microservices.** Operational overhead with no benefit at this scale.

## Decision
Option 1. Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic migrations, pytest.

Module layout (one package per module, each with `api/` routes, `service/` business logic, `repository/` database access):
identity, profiles, travel_plans, vibe_intelligence, discovery, connections, messaging, events, places, roadmaps, reviews, notifications, trust_safety, admin.

Route handlers stay thin; modules talk to each other only through their service interfaces.

## Consequences
- Two languages in the repo (TypeScript app, Python API). Mitigated by the generated API client.
- Deployed as two processes from one codebase: the web API and a background worker (ADR-0010).

## Revisit when
A single module needs independent scaling or a separate team, which is not expected before significant growth.
