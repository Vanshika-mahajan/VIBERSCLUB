# ADR-0010: Postgres-backed job queue, no Redis

- **Status:** Proposed
- **Date:** 2026-10-25

## Context
AI extraction, embeddings, reminders, feedback requests and emails must run in the background with retries.

## Options considered
1. **Postgres-backed queue** (for example the Procrastinate library): jobs are rows, enqueued in the same transaction as the data that triggers them.
2. **Redis with Celery, RQ or arq**: mature, but a second datastore to run and pay for.
3. **Cloud task services**: vendor lock-in and more setup.

## Decision
Option 1, using the **Procrastinate** library (Postgres-backed, async, supports scheduled and periodic jobs). Every job is idempotent (keyed by entity id plus a content hash or schedule key), retried with backoff, and moved to a failed state after a fixed number of attempts, visible to admins. The job list is in SYSTEM_ARCHITECTURE section 5.

## Revisit when
Job volume reaches thousands per minute.
