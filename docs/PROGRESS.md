# Progress

**Last updated:** 2026-10-26

## Completed milestones
- Phase 0 to 2: discovery, PRD, blueprint, ADR-0001 to ADR-0019 (all Accepted; ADR-0013 pending user validation).
- **M0a, backend skeleton** (branch `m0a-backend-skeleton`, pushed, no PR).
- Docs updated for the website-first plan, ADR-0020 (branch `docs/web-first`, pushed, no PR).
- **M0b, website skeleton** (local branch `m0b-web-skeleton`, not pushed).
- **Discover design step** (local branch `design/discovery`, on top of M0b, not pushed): ARPIT's Discover design built in the website with sample Vibers. Decision: his look and flow, with like, pass, save and mutual connection; rooms in phase 2 (`docs/design/DISCOVERY_DESIGN.md`).

- **Pitch demo** (local branch `design/discovery`, not pushed, 2026-10-26): the whole website is clickable with sample data, in the Discover look. Home, Events (filters, event page, join or waitlist, host form), Explore (places, day plans, save), Chats (requests, mutual-only threads, report, block), Profile (vibe with live chips, interests, intents, privacy, plans, reset). Discover likes connect to Chats. State lives in the browser (`apps/web/lib/demo/store.ts`); every action names the milestone that makes it real.

## Current milestone
M0 Foundations. **Plan changed on 2026-10-26: website first** ([ADR-0020](adr/0020-mobile-first-website-first.md)). M0a and M0b are done, plus the Discover design step. Next: M0c (CI and staging deploys).

## Files created or modified in the home universe, step 2 (2026-10-26)
- `apps/web/features/discover/sphere.ts`: `pull()` sends cards into the core on accelerating, swinging paths with motion-blur copies and a burst ring as each one lands; `unpull()` and `setBackdrop()` (the universe keeps turning, slower and fainter, behind a room).
- `apps/web/features/universe/sample-rooms.ts`: six sample collective rooms with conversations already in progress, plus `roomFor(thought)`.
- `apps/web/features/universe/RoomView.tsx`: the room the core expands into: messages and photos, a composer (messages stay in the browser), active threads that open in place, the people here (profile panel), other rooms, and back to the universe (also Escape).
- `UniverseScreen.tsx`: Enter, the arrow, or "Step into <room>" starts the pull; the room opens as a circle growing from the core. Calm mode and reduced motion skip the animation.
- Tests: room cases in `tests/unit/universe.test.tsx` and `e2e/universe.spec.ts`.

## Tests executed (home universe step 2, 2026-10-26, in the cloud workspace)
- Vitest: 67 passed. Typecheck and lint clean.
- Playwright (phone and desktop): 26 passed. "API OK" skipped (no API running here).

## Files created or modified in the home universe, step 1 (2026-10-26)
ARPIT asked for the landing page to be one full-screen 3D discovery universe. Decision: collective rooms appear in the demo as sample data only; real rooms with moderation stay in phase 2.
- `apps/web/features/discover/sphere.ts`: new opt-in tier mode (`tiers: true`): a wider camera, inner, middle and outer orbit bands (inner turns fastest), floating thread and photo screens, a swarm of 2,400 tiny decorative profile specks on the outer orbits, and cards that spiral between bands as relevance changes. Discover itself is unchanged.
- `apps/web/features/universe/`: `UniverseScreen.tsx` (the home page, with the thought bar at the centre, chips, a live status line, a list view, calm and pause, a menu, and the profile panel), `tiers.ts` (pure: which orbit each person and conversation rides), `sample-screens.ts` (24 sample threads and 12 sample photos by sample Vibers), `universe.module.css`.
- `apps/web/app/page.tsx` now shows the universe; the old dashboard moved to `apps/web/app/today/page.tsx` (in the sidebar and the universe menu). `AppNav` hides itself on `/`.
- Tests: `tests/unit/universe.test.tsx`, `e2e/universe.spec.ts`; `e2e/home.spec.ts` now starts from `/today`.

## Tests executed (home universe step 1, 2026-10-26, in the cloud workspace)
- Vitest: 64 passed. Typecheck and lint clean.
- Playwright (phone and desktop): 24 passed. The "API OK" test was skipped because the API was not running in this workspace.
- Visual check from screenshots of the running app. Photos are blocked in this workspace, so cards show initials there.

## Files created or modified in the pitch demo
| File | Why |
|---|---|
| `apps/web/lib/demo/{data,store,people,useToday}.ts` | Sample events, places, day plans, chats; the demo store (localStorage `vibers.demo.v1`) |
| `apps/web/components/ui.tsx`, `apps/web/app/globals.css` | Shared look: cards, chips, buttons, avatars, toasts, Manrope |
| `apps/web/features/{home,events,explore,chats,profile}/` and their `app/` routes | The pages; `/events/[id]` prerenders sample events |
| `apps/web/features/discover/{adapter,DiscoverScreen,ProfilePanel}.tsx` | Swipes go to the store, blocked people are left out, a mutual like offers a connection request, "Use my vibe" |
| `apps/web/components/AppNav.tsx`, `lib/nav.ts` | Logo, Explore in the sidebar, Chats request badge |
| `apps/web/tests/unit/{demo-store,pages}.test.*`, `apps/web/e2e/demo.spec.ts` | Store rules, page behaviour, the full journey |

## Tests executed (pitch demo, 2026-10-26, in the cloud workspace)
| Command | Result |
|---|---|
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Clean |
| `pnpm test` (Vitest) | 56 passed: sample data integrity, mutual likes, mutual-only messages, block, RSVP and waitlist, host validation, filters, profile vibe |
| `pnpm e2e` (Playwright, phone and desktop) | 20 passed, incl. profile vibe → Discover → like → connect → chat → RSVP → reload, host an event, block |

Not verified: sample photos (the photo CDN is unreachable from this workspace, so pages show initials and gradients).

## Files created or modified in the Discover design step
| File | Purpose |
| --- | --- |
| `docs/design/discovery-prototype.html`, `docs/design/DISCOVERY_DESIGN.md` | ARPIT's prototype, the fit review and the decision |
| `apps/web/lib/taxonomy.ts` | 62 interests, intents and areas with synonyms |
| `apps/web/features/discover/*` | Sphere engine, thought reader, ranking, sample adapter and data, screen, profile panel, styles, calm-mode hook |
| `apps/web/app/discover/page.tsx` | Discover route now shows the screen |
| `apps/web/next.config.ts` | Tailwind loader limited to `globals.css` (it was turning CSS modules into plain CSS) |
| `apps/web/components/AppNav.tsx` | Fixed 56px phone bar height so Discover can fill the screen above it |
| `apps/web/tests/unit/{interpret,rank,DiscoverScreen}.test.*`, `apps/web/e2e/discover.spec.ts` | Tests |
| `docs/MVP_SPEC.md` (F4), `docs/UI_UX_SPECIFICATION.md`, `docs/API_SPECIFICATION.md` | Discover behaviour, screens and the new `POST /discovery/query` |

## Tests executed (Discover design step, 2026-10-26, in the cloud workspace)
| Check | Result |
| --- | --- |
| `pnpm test` (Vitest) | 34 passed: taxonomy (62 ids), thought reading (phrases, plurals, negation, "but", corrections, confidence, explanation), ranking (no overlap excluded, overlap order, intent and host fit, exclusion penalty, area-only, diversity, sample roster validity), screen (chips, formation, remove and bring back, Why these, profile with Like/Save/Escape and focus return, Pass removes, unreadable thought, list view), formation layout |
| `pnpm e2e` (Playwright, Chromium) | 14 passed on phone (Pixel 7) and desktop: Discover thought → cards above the bar; profile like, save, pass; list view, calm mode, about dialog; navigation; plus the M0b tests |
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |

**Not verified here:** sample photos (the workspace can't reach the Pexels photo CDN, so cards show initials; on a normal connection the portraits load); Safari and Firefox; real-device performance of the sphere (it lowers its own detail on slow devices).

## Files created or modified in M0b
| File | Purpose |
| --- | --- |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | pnpm workspace at the root (`apps/*`), shortcuts `pnpm web:dev`, `web:test`, `web:e2e` |
| `apps/web/` | Next.js 16.4.3 + React 19.3 + Tailwind v4 app, created with `create-next-app` |
| `apps/web/app/layout.tsx` | Shell: navigation plus page area; title template, theme colour |
| `apps/web/components/AppNav.tsx`, `lib/nav.ts` | Bottom bar on phones, sidebar on wide screens; active-section logic |
| `apps/web/app/page.tsx`, `components/HealthStatus.tsx`, `lib/api.ts`, `lib/config.ts` | Home page calls `/healthz`, shows loading, "API OK", or a clear error with retry |
| `apps/web/app/{discover,events,explore,chats,profile}/page.tsx` | Placeholder sections, each naming its milestone |
| `apps/web/app/manifest.ts`, `public/icon-*.png`, `app/apple-icon.png`, `app/favicon.ico` | Installable web app manifest and placeholder icons |
| `apps/web/.env.example` | `NEXT_PUBLIC_API_URL` (public, no secrets) |
| `apps/web/vitest.config.mts`, `tests/` | Vitest + React Testing Library |
| `apps/web/playwright.config.ts`, `e2e/` | Playwright on phone and desktop |
| `apps/web/README.md` | Run, check and layout guide |
| `backend/app/core/config.py`, `backend/app/main.py` | `CORS_ALLOWED_ORIGINS` setting and CORS middleware |
| `backend/tests/unit/test_cors.py`, `backend/.env.example` | CORS tests; new setting documented |

## Tests executed (M0b, 2026-10-26, in the cloud workspace)
| Check | Result |
| --- | --- |
| Backend `uv run pytest` | 14 passed (11 from M0a + 3 CORS: parsing, allowed origin, other origin refused) |
| Backend ruff, ruff format, mypy strict | Passed, 18 files |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test` (Vitest) | 6 passed: health loading / ok / API error detail / network error then retry; nav active-state rules |
| `pnpm build` | Passed; all 9 routes prerendered as static |
| `pnpm e2e` (Playwright 1.63, Chromium) | 6 passed (3 tests x phone + desktop): "API OK" from the real API and Postgres; nav position and every section reachable; manifest served |
| `curl` preflight from `http://localhost:3000` | `access-control-allow-origin: http://localhost:3000` |

## Files created or modified in M0a
| File | Purpose |
| --- | --- |
| `backend/pyproject.toml`, `backend/uv.lock` | Python project, pinned dependencies, ruff, mypy and pytest settings |
| `backend/app/main.py` | FastAPI app factory |
| `backend/app/core/config.py` | Settings from environment variables, with validation |
| `backend/app/core/db.py` | Async database engine and session dependency |
| `backend/app/core/errors.py` | Problem-details error format for every error |
| `backend/app/core/health.py` | `GET /healthz` with a database check |
| `backend/alembic.ini`, `backend/migrations/` | Alembic setup; migration 0001 creates the `app` schema and the `vector` and `citext` extensions |
| `backend/tests/` | Unit, API and integration tests |
| `backend/.env.example` | Sanitized settings template (no secrets) |
| `backend/README.md` | How to run, check and troubleshoot |
| `docker-compose.yml`, `docker/postgres-init/` | Local Postgres 16 with pgvector, plus a test database |
| `docs/TESTING_STRATEGY.md` | Added the required end-to-end journey |
| `docs/IMPLEMENTATION_ROADMAP.md` | M0 split into M0a, M0b, M0c |

## Tests executed (M0a, 2026-10-25, in the cloud workspace)
| Check | Result |
| --- | --- |
| `uv run pytest` | 11 passed (4 config, 4 error-format, 2 health check, 1 migration round-trip), also with deprecation warnings treated as errors |
| `uv run ruff check .` / `ruff format --check .` | Passed |
| `uv run mypy app tests migrations` (strict) | Passed, 17 files |
| `alembic upgrade head` from the command line | Applied 0001 |
| `uvicorn` + `curl /healthz` | `200 {"status":"ok","database":"ok"}`; unknown route returns problem JSON 404 |

Tests ran against Postgres 16.15 with pgvector 0.6.0 installed natively in the workspace. **Not verified here:** `docker-compose.yml` (Docker cannot run in this workspace). Please run `docker compose up -d db` once on your machine to confirm.

## Known issues
- Discover runs on sample Vibers in the browser until M5 connects `POST /discovery/query`.
- The pitch demo keeps everything in one browser; nothing is shared between people until the matching milestone (M2 profiles, M5 discovery, M6 chats, M7 events, M8 places).
- Formed cards become clickable once they land (about a second after the thought settles).
- Icons are simple placeholders (white mountain on teal); swap in the real logo when you have one.
- Not verified here: Safari/iOS and Firefox (e2e runs in Chromium only).
- None in code otherwise. The workspace is temporary: local commits are lost if it is reclaimed before they are pushed.

## Missing credentials or configuration
- None needed for M0a or M0b (local only).
- Needed for M0c: Render account (API hosting), Vercel account (website hosting). Needed for M1: Supabase dev project, Google OAuth client. Details will be given when each is needed.

## Unresolved decisions
- OPEN_QUESTIONS Q1 to Q7 and Q9 (none block M0).

## Next recommended action
Review M0b and ask me to push `m0b-web-skeleton` when ready. Then M0c: GitHub Actions CI (backend and website checks) and staging deploys, which need you to create a Render account (API) and a Vercel account (website).
