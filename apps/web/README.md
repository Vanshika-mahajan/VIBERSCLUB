# Vibers Club website

Mobile-first Next.js website (ADR-0020). It talks only to our API; it never reads the database directly.

## Run locally

Needs Node 22+ and pnpm 10 (`corepack enable`). From the repository root:

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # NEXT_PUBLIC_API_URL, defaults to http://localhost:8000
pnpm web:dev                                   # http://localhost:3000
```

Start the API too (see `backend/README.md`), otherwise the home page shows "API unavailable".
The API must list `http://localhost:3000` in `CORS_ALLOWED_ORIGINS` (the default).

## Checks

Run inside `apps/web`:

| Command | What it does |
| --- | --- |
| `pnpm lint` | ESLint (Next.js rules) |
| `pnpm typecheck` | Generates route types, then `tsc --noEmit` |
| `pnpm test` | Vitest + React Testing Library (component and unit tests, no network) |
| `pnpm build` | Production build |
| `pnpm e2e` | Playwright on a phone (Pixel 7) and a desktop; builds and starts the site itself, **needs the API running on :8000** |

First time on your machine, Playwright needs a browser: `pnpm exec playwright install chromium`.

## Layout

```
app/            routes: / (home), /discover, /events, /explore, /chats, /profile; manifest.ts
components/     AppNav (bottom bar on phones, sidebar from md up), HealthStatus, Placeholder
lib/            config.ts (public settings), api.ts (API calls, problem errors), nav.ts
tests/unit/     Vitest tests
e2e/            Playwright tests
```

## Rules

- Only `NEXT_PUBLIC_*` variables reach the browser, and they are baked in at build time. Never put a secret in one.
- Read `node_modules/next/dist/docs/` before using a Next.js API: this is Next 16, which differs from older tutorials.
