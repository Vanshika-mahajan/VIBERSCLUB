# Architecture Decision Records

Each file records one decision: its context, the options considered, what we chose and why, and what follows from it. ADRs are the source of truth for decisions. Other documents link here instead of restating them.

**Status values**
- **Proposed**: recommended, not yet confirmed by the product owner.
- **Accepted**: confirmed. Record who confirmed it and when.
- **Superseded by ADR-NNNN**: replaced. Never delete an ADR; add a new one.

To add one, copy `0000-template.md`, take the next number, and add a line to the index below.

## Index

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-record-decisions-in-adrs.md) | Record decisions as ADRs in this repo | Accepted |
| [0002](0002-mobile-app-with-expo.md) | Native mobile app built with React Native and Expo | Accepted |
| [0003](0003-python-fastapi-modular-monolith.md) | Python FastAPI modular monolith for the backend | Accepted |
| [0004](0004-postgres-pgvector-on-supabase.md) | PostgreSQL with pgvector, hosted on Supabase | Proposed |
| [0005](0005-supabase-auth-sign-in-methods.md) | Supabase Auth with Google, Apple, email OTP and phone OTP | Proposed |
| [0006](0006-location-privacy-named-areas.md) | Users are placed by named area, never live GPS | Accepted |
| [0007](0007-messaging-mutual-connections-only.md) | Messaging only between mutual connections | Accepted |
| [0008](0008-any-verified-viber-can-host-events.md) | Any verified Viber can host events, under community rules | Accepted |
| [0009](0009-paid-events-organizer-collects.md) | Paid events show price; organizer collects payment in MVP | Accepted |
| [0010](0010-postgres-backed-job-queue.md) | Postgres-backed job queue (Procrastinate), no Redis | Proposed |
| [0011](0011-controlled-taxonomy-and-validated-llm-extraction.md) | Controlled interest taxonomy with schema-validated LLM extraction | Proposed |
| [0012](0012-adults-only.md) | 18+ only | Proposed |
| [0013](0013-women-only-discovery-option.md) | Opt-in women-only discovery | Accepted, pending user validation |
| [0014](0014-english-ui-multilingual-input.md) | English UI in MVP; free text accepted in any language | Proposed |
| [0015](0015-everyone-is-a-viber.md) | One account type: everyone is a Viber | Accepted |
| [0016](0016-chat-over-rest-polling-and-push.md) | Chat over REST, with push notifications and polling | Proposed |
| [0017](0017-moderation-inside-the-app.md) | Moderation tools inside the app, role-gated | Proposed |
| [0018](0018-lock-down-supabase-data-api.md) | Lock down Supabase's Data API; the backend is the only data path | Proposed |
| [0019](0019-product-analytics-with-posthog.md) | Product analytics with PostHog, without personal data | Proposed |
