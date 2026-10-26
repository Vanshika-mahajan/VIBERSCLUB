# ADR-0017: Moderation tools inside the app, role-gated

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** ARPIT (approved the Phase 2 blueprint, PR #2)

## Context
ADR-0002 defers any web surface, but moderators need a way to handle reports from day one of a pilot.

## Options considered
1. **Web admin console (Next.js).** Best for heavy use; a second frontend to build.
2. **Generic admin panel on the backend (for example SQLAdmin).** Fast, but edits tables directly and bypasses business rules and the audit log.
3. **Moderation section inside the product's own frontend** (since ADR-0020, role-gated `/mod` pages in the website), visible only to users with the moderator role, calling `/v1/mod` endpoints.

## Decision
Option 3. All actions go through the same service layer and write `moderation_actions`.

## Consequences
- No extra deploy; moderators use their phones.
- With the website (ADR-0020), moderators can work from a laptop; a separate admin console is not needed for MVP.
