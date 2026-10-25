# ADR-0018: Lock down Supabase's Data API; the backend is the only data path

- **Status:** Proposed
- **Date:** 2026-10-25

## Context
Supabase automatically offers a REST and GraphQL API over the `public` schema, usable with the public (anon) key that ships inside the app. If our tables were exposed there, anyone could read them, bypassing every rule in the backend.

## Decision
- All application tables live in a dedicated `app` schema that is not exposed to the Data API.
- Row-level security is enabled on every table with no policies, so even an accidental exposure returns nothing.
- The backend connects with its own database role; the service-role key is kept only in the API and worker.
- The app uses the anon key only for Supabase Auth and signed Storage uploads.
- Storage buckets are private; access is through short-lived signed URLs issued by the API.

## Consequences
- We give up Supabase's auto-generated APIs and Realtime on these tables (see ADR-0016).
- A CI check (an integration test against staging) confirms anonymous requests to the Data API return no application data.
