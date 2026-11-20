# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Vibers Club: AI-assisted travel and community discovery for Manali; members are "Vibers". It is a pnpm workspace with a Next.js website in `apps/web` and a FastAPI backend in `backend/`.

The website is currently a clickable pitch demo running on sample data in the browser. The backend only has the M0 skeleton: settings, database, `/healthz` and migrations.

The docs in `docs/` are the source of truth for requirements and decisions:
- `PRD.md`
- `adr/` (every decision, with its alternatives)
- `PROGRESS.md` (where things stand and what each round changed)
- `OPEN_QUESTIONS.md`

Read the relevant ADR before changing product behaviour.

## Commands

### Website (`apps/web`; Node 22+, pnpm 10)

```bash
pnpm install                 # from the repo root
pnpm web:dev                 # root shortcut for `next dev` on :3000
cd apps/web
pnpm lint                    # ESLint
pnpm typecheck               # `next typegen` first, then tsc; plain tsc misses route types
pnpm test                    # Vitest (tests/unit/**/*.test.ts[x], jsdom)
pnpm vitest run tests/unit/<file>.test.ts       # one unit test file
pnpm build && pnpm start     # production build; review motion work here, not in dev
pnpm e2e                     # Playwright, projects "phone" (Pixel 7) and "desktop"
pnpm exec playwright test e2e/home.spec.ts --project=desktop -g "contents"   # one e2e test
```

About e2e:
- Playwright runs `pnpm build && pnpm start` itself and reuses a server already on :3000. A stale server serves old code, so free the port first (`fuser -k 3000/tcp`).
- `home.spec` "API OK" needs the backend on :8000. Without it, that one test is expected to fail.
- `e2e/sweep.spec.ts` visits every route and fails on the following. Keep new UI at WCAG AA contrast.
  - Sideways overflow (phone, tablet and desktop widths).
  - Serious axe violations.
  - Console errors.

### Backend (`backend/`; uv, Python 3.12+, Postgres 16 with pgvector)

```bash
docker compose up -d db                  # from the repo root; creates `vibers` and `vibers_test`
cd backend && uv sync && cp .env.example .env
uv run alembic upgrade head
uv run uvicorn app.main:app --reload     # :8000, GET /healthz
uv run ruff check . && uv run ruff format --check . && uv run mypy app tests migrations
uv run pytest                            # needs TEST_DATABASE_URL; tests/unit needs no database
```

## Website architecture

**Next.js 16, not the version in your training data.**
- `apps/web/AGENTS.md` says to read `node_modules/next/dist/docs/` before using a Next API.
- `cacheComponents` is on and pages prerender statically, so client code that reads `useSearchParams` needs a `<Suspense>` boundary.
- `Date.now()` during render breaks prerendering.
- Pages stay mounted after you leave them, so dialogs must close in effect cleanup.

**Routes:**
- `app/` holds thin route files. Screens live in `features/<area>/`.
- `/` is the entry (`features/entry`) over ARPIT's sunset camp (`features/camp`, built up step by step; `campScene.ts` moves the tree, prayer flags and cloud detail as cut-out layers, from `public/camp/sunset-bg.webp`, `sunset-rig.png` and `sunset-sky.webp`, and plays ARPIT's characters as cut-out videos in front, colour above and mask below, such as `guitar-group.mp4`; ARPIT's paraglider clip waits in the sky and the Take off button flies it at us until the canopy covers the screen, then `/home` opens): the door opens onto the camp. Earlier it moved to `/home` with an in-memory flag (`handoff.ts`) and `EntryOnHome` laid the door over Home; that code is kept but unused by `/`. ARPIT's door is painted, wrapped in vines, into their mountain meadow picture (`backdrop="meadow"`, `public/entry/meadow-door.webp`); only the door itself is cut out (`PAINTED` in `scene.ts`, `door-leaf-painted.webp`, with `door-front.png` keeping grass and vines in front of the doorway) and swings open, with a brown "Unveil What Awaits" button (`features/intro/UnveilButton`, `tone="brown"`); the scenery moves after ThreeUI's Temple Night (`features/entry/scenery.ts`, `alive`: the picture moves in cut-out layers (`layerPicture`: branch, pines, each daisy on its own, grass gusts, valley mist, cloud detail; from `public/entry/meadow-bg.webp`, `meadow-rig.png`, `meadow-sky.webp`, `meadow-flowers.png`), plus haze, pollen, falling leaves, pointer wisps); the button, a tap or Enter swings the door outward and pushes the camera through the doorway into Home, which shows through a transparent portal in the canvas. Review frames at `/entry-demo` too. The earlier clouds version (doorframe, "VIBERS" sign) is still `backdrop="clouds"`, the default. The previous entry ("A World Awaits", `features/intro`) and the old journey (`features/journey`) are no longer routed but kept until ARPIT approves deleting them; Home's opening still reuses the journey's planet.
- `/home` is the club home: the opening scrolls down to Your vibe (with a "Scroll to meet your vibe" line), then a sticky row of tabs I to VII shows one chapter at a time (`features/home/tabs/`). Each chapter after Your vibe opens on one of ARPIT's clips (`public/home/sections/*.mp4`, posters `.webp`) and ends with "More in the club" tiles to the others. The open tab lives in the hash (`/home#events`); the contents send `vc:open-tab`; `html[data-home-tabs=off|on|stuck]` hides the docked contents and turns the top line to paper. `/home-demo` redirects to `/home`.
- Discover, Events and Explore render inline on Home as chapters V to VII (`features/home/HomeMore.tsx`, `only`/`opener` props for the tabs). They also keep their own routes.

**Demo data (no backend yet):**
- `lib/demo/store.ts` is a single `useSyncExternalStore` store persisted to localStorage.
- Each action there mirrors an API call that a later milestone makes real.
- Sample people, events and places are in `lib/demo/*`.
- Matching is a client-side stand-in for the AI design: `features/discover/interpret.ts` (text into interests) and `rank.ts`.
- `lib/api.ts` is the only real API call (health) and models the API's RFC 9457 problem errors.

**Navigation:**
- `lib/nav.ts` defines the contents list I to VII, roman numerals and active-state helpers.
- `components/contents/Contents.tsx` renders the Shopify-Editions-style contents.
  - It sits centred over the Home opening, then FLIP-animates (Web Animations) to dock in the corner, and back at the top.
  - It underlines the chapter in view with `aria-current="location"` and marks other pages with `"page"`.
  - On phones it becomes a strip along the bottom.
- Text colour switches between ivory and espresso by reading regions marked `data-tone="dark"`. Mark any new dark full-bleed block with that attribute.
- Page column offsets come from the CSS vars `--main-ml` and `--main-pl`; `.vc-bleed` breaks a block out to full width.

**Home opening** (`features/home/Opening.tsx`):
- A sticky 340svh stage, scrubbed by scroll.
- Two cut-out Vibers (`public/home/viber-*.webp`) reach toward each other over `scene.webp`.
- A spark at their fingertips bursts the scene into stardust. The stardust is Canvas 2D (`dust.ts`) and re-forms as the Earth.
- The live three.js planet (`openingPlanet.ts`, reusing `features/journey/world/planet.ts`) loads only when `canUse3D()` allows.

**Discover sphere:** `features/discover/sphere.ts` is a large hand-written canvas renderer. Photos are drawn as sprites and sage-toned at draw time inside `cover()`.

## Styling and design rules

**Tokens:**
- Tailwind 4 tokens are defined in the `@theme` block of `app/globals.css`.
- Never put an apostrophe in a comment inside `@theme`. It silently drops every token after it.
- The Turbopack Tailwind rule must target only `globals.css`, or CSS modules lose their class names.

**Look:** an editorial magazine.
- Fonts: Syne for display, Inter for text.
- Colours:
  - Warm Ivory `#F7F2E8` and Deep Espresso `#2A1B13` dominate.
  - Sage `#879A6B` is for atmosphere and photo toning (luminosity onto `#64754b`).
  - Amber `#D5851F` is for small accents only.
- Use hairlines and square controls. Avoid rounded cards, heavy shadows, glass, gradients and a SaaS look.
- The old journey (door and Earth) keeps Fraunces and Manrope and is deliberately untouched.

**Where styles live:**
- Feature styles are CSS modules.
- `features/club/club.module.css` scopes the editorial overrides under `.issue`.
- The inbox restyle lives under `.vc-inbox` in `globals.css`.

**Formatting:** don't reformat whole existing files with Prettier. Format only new files, so diffs stay reviewable.

## Working agreements (from the project owner)

- Never push or open a PR unless explicitly asked; each push needs a fresh ask. Commit locally after tests pass.
- Never discard, reset, force-push or delete without approval.
- Change only what was asked. Approved checkpoints must not drift.
- Show a demo before integrating visual or motion changes.
- After each milestone, run the tests and update `docs/PROGRESS.md` (what changed, tests run with real results, known issues, next step).
- Keep `.env.example` files sanitized. Only `NEXT_PUBLIC_*` variables reach the browser, and they are baked in at build time.
