# Vibers Club — Environments and Deployment Plan

- **Status:** Plan only (Phase 2). The step-by-step guide is written in Phase 6, once there is something to deploy.
- **Last updated:** 2026-10-25

## 1. Environments

| Environment | Purpose | Backend | Database and auth | App build |
| --- | --- | --- | --- | --- |
| Local | Development and tests | `uvicorn` and worker on the developer's machine | Docker Postgres with pgvector for tests; a shared **dev** Supabase project for auth | `next dev` on the developer's machine, opened in a desktop browser and on a phone on the same Wi-Fi |
| Staging | Team testing, demos, the pitch | API and worker on the host's staging service | Separate Supabase project, demo seed data | Website preview deploy (a staging URL) |
| Production | Real users | API and worker, production service | Separate Supabase project, Mumbai region, paid tier before launch | Website production deploy on our own domain |

Staging and production never share keys, buckets or databases.

## 2. Deployment architecture

```mermaid
flowchart LR
    Dev["Developer"] -- "pull request" --> GH["GitHub"]
    GH -- "CI: lint, types, tests" --> GH
    GH -- "merge to main: auto-deploy" --> Stg["Staging: API + worker"]
    GH -- "tag vX.Y.Z: deploy" --> Prod["Production: API + worker"]
    GH -- "every pull request: preview" --> WebPrev["Website preview URL"]
    GH -- "merge to main" --> WebStg["Website staging"]
    GH -- "tag vX.Y.Z" --> WebProd["Website production"]
    WebStg --> Stg
    WebProd --> Prod
    Stg --> SupaS[("Supabase staging")]
    Prod --> SupaP[("Supabase production, Mumbai")]
```

- **API host:** a platform service such as Render, Railway or Fly.io, running two processes from one Docker image: `web` (`uvicorn`) and `worker` (`procrastinate worker`). Choose the region closest to Mumbai the provider offers. Chosen: **Render** (approved with the blueprint); Railway or Fly.io remain fallbacks.
- **Migrations:** run as a release step before the new web process starts (`alembic upgrade head`). Migrations are backwards-compatible (DATABASE_DESIGN), so the old version keeps working during deploy.
- **Website host:** Vercel by default (built for Next.js; a preview URL for every pull request). Its free Hobby plan is meant for non-commercial use, so check the current terms and move to a paid plan before a commercial launch. Render can host the website too if we want one vendor.
- **Website updates:** every deploy is live immediately; there is no store review.
- **Rollback:** API: redeploy the previous image (the host keeps previous deploys). Database: forward-fix migrations; point-in-time restore only for disasters. Website: promote the previous deployment (one click on Vercel).

## 3. Configuration plan

These are the planned variable names. They do not exist yet; values come from each service's dashboard when the accounts are created. Real values never go in the repository; `.env.example` holds names only.

### Backend (API and worker)

| Variable | Purpose | Secret? |
| --- | --- | --- |
| `APP_ENV` | `local`, `staging` or `production` | No |
| `DATABASE_URL` | Postgres connection string for the backend role (pooled, via Supabase's connection pooler) | Yes |
| `SUPABASE_URL` | Project URL (JWKS, Storage, Auth admin) | No |
| `SUPABASE_JWT_AUDIENCE` | Expected `aud` claim | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Storage signed URLs and Auth admin calls (phone status, user deletion) | Yes |
| `STORAGE_BUCKET_PHOTOS` | Private bucket name | No |
| `LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY` | Extraction model | Key: yes |
| `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `EMBEDDING_API_KEY` | Embeddings (from M10) | Key: yes |
| `AI_MONTHLY_BUDGET_USD` | Budget guard | No |
| `EMAIL_API_KEY` | Transactional email service (reminders, digests) | Yes |
| `EMAIL_FROM` | Sender address on our verified domain | No |
| `CORS_ALLOWED_ORIGINS` | Website origins allowed to call the API | No |
| `SENTRY_DSN` | Error reporting | No (but keep private) |
| `RATE_LIMITS_CONFIG` | Optional override of default limits | No |

### Website (public by nature: anything sent to the browser can be read by users)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key, safe only because the Data API is locked down (ADR-0018) |
| `NEXT_PUBLIC_SENTRY_DSN` | App error reporting |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics project key |

Only `NEXT_PUBLIC_` variables reach the browser. The website must never contain the service-role key, the email key or any AI provider key.

## 4. Accounts the team will need

| Service | Needed by | Cost note |
| --- | --- | --- |
| GitHub (existing) | M0 | Free |
| Supabase (dev, staging; production later) | M1 | Free tier for dev and staging; paid tier for production before pilot |
| Vercel (website hosting) | M0c | Free Hobby plan for development; paid plan before commercial launch |
| Google Cloud (OAuth client) | M1 | Free |
| Domain name | Before pilot | Yearly fee |
| LLM and embedding provider | M3 | Pay as you go |
| API host | M0 (staging) | Free or low tier initially |
| Sentry, PostHog | M0 / M12 | Free tiers |
| Transactional email service (also Supabase's SMTP sender) | M1 (sign-in codes), M8 (notifications) | Free tier to start |
| SMS for phone OTP (via Supabase's provider integration) | M5 | Pay per SMS |

## 5. Operations basics (detailed in Phase 6)

- Backups: Supabase daily backups on paid tier; test a restore into staging before launch.
- Monitoring: Sentry for errors; host metrics for CPU and memory; a daily check of failed jobs and report queue age.
- Health check: `/healthz` used by the host to restart unhealthy instances.
