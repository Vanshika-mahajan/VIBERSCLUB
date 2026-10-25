# ADR-0016: Chat over REST, with push notifications and polling

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** ARPIT (approved the Phase 2 blueprint, PR #2)

## Context
Phase 0 suggested Supabase Realtime for chat. Realtime delivers database changes to the app directly, which requires the app to read tables under row-level security policies. ADR-0004 and ADR-0018 keep all data access in the backend so authorization lives in one place. Chat volume in the MVP is small.

## Options considered
1. **Supabase Realtime.** Instant delivery; but splits authorization between the API and database policies.
2. **Own WebSocket endpoint in FastAPI.** Instant; but needs sticky connections and more operational care.
3. **REST plus push plus polling.** Messages sent and read through the API; push notifications when the app is in the background; the open chat polls every 3 seconds.

## Decision
Option 3 for MVP.

## Consequences
- Up to about 3 seconds of delay in an open chat, which is acceptable for planning meetups.
- Polling costs a few requests per minute per open chat; it stops when the chat closes or the app is backgrounded.
- Moving to WebSockets later changes only the delivery path, not the data model or API for sending.

## Revisit when
Users complain about delay, or polling load becomes significant.
