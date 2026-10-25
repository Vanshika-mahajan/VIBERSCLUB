# ADR-0007: Messaging only between mutual connections

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** ARPIT

## Context
Unsolicited messages are the main harassment channel in social discovery apps.

## Decision
A user can message another user only after a connection request is accepted. Requests carry an optional short note (limited length, rate-limited per day). Blocking ends the connection and hides each user from the other everywhere.

Event group chats are out of scope for MVP.

## Consequences
- Messaging needs a connections check on every send, enforced in the API, not the app.
- Realtime delivery uses a managed service (Supabase Realtime) for MVP.
