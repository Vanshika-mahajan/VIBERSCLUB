# ADR-0004: PostgreSQL with pgvector, hosted on Supabase

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** ARPIT (approved the Phase 2 blueprint, PR #2)

## Context
We need relational data with strong constraints (connections, RSVPs, capacity), vector similarity for semantic matching, and low cost while the budget is free tiers plus low thousands of rupees a month.

## Options considered
1. **Supabase Postgres with pgvector.** Postgres plus auth, storage and realtime from one vendor, Mumbai region available, generous free tier.
2. **Neon Postgres.** Good serverless Postgres; auth and storage would come from other vendors.
3. **Postgres plus a separate vector database (Pinecone, Qdrant).** Two stores to keep in sync, and permission filters would have to be duplicated. Unnecessary at thousands of rows.

## Decision
Option 1, using Supabase as plain Postgres from FastAPI (SQLAlchemy). The app does not query the database directly; all reads and writes go through the API so authorization lives in one place.

PostGIS is deferred: named areas (ADR-0006) and venue coordinates with simple distance maths are enough for MVP.

## Consequences
- Choose the Mumbai (ap-south-1) region to keep latency low and data in India.
- Use Alembic for every schema change; never edit the schema in the Supabase dashboard.
- Free-tier projects pause when idle; move to the paid tier before any pitch or pilot.

## Revisit when
Vector queries exceed roughly a million rows or need features pgvector lacks.
