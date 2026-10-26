# ADR-0020: Build a mobile-first website first; native app later

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** ARPIT ("change of plan, let's build a website first")
- **Supersedes:** ADR-0002 (native app with Expo first)

## Context
ADR-0002 chose a native app. ARPIT changed the plan: the first product is a website. Most Vibers will still use it on a phone, often on patchy mountain networks, so the website must be designed for phones first.

## Options considered
1. **Next.js (React, TypeScript, Tailwind), mobile-first and installable as a PWA.** Matches the Phase 0 proposal, one codebase for phone and desktop browsers, no app-store review, easy to share links (an event link opens directly), large ecosystem.
2. **React single-page app (Vite) with no server rendering.** Simpler build, but no server-rendered pages for shared links and search engines later.
3. **Expo with React Native Web.** Keeps the option of native apps from one codebase, but web output is weaker and harder to style than a normal website.

## Decision
Option 1.
- Next.js App Router, TypeScript, Tailwind CSS, in `apps/web/`.
- Mobile-first layouts: bottom navigation on phones, sidebar on wide screens.
- Installable as a Progressive Web App (home-screen icon, app-like window).
- The browser calls the FastAPI backend directly with the Supabase access token. Next.js does not hold business logic or talk to the database. All rules stay in the API (ADR-0003, ADR-0018).
- A native app (Expo) can come later and reuse the same API unchanged.

## Consequences
- **Sign-in:** Google and email code. Sign in with Apple is no longer required (that was an App Store rule) and can be added later (ADR-0005).
- **Notifications:** mobile browsers limit push notifications (on iPhones only for sites added to the Home Screen). MVP notifications are in-app (with an unread badge) plus email for time-sensitive items: event reminders, connection requests and acceptances, feedback requests, event changes. Web push is optional in M8. This brings back a transactional email service (for example Resend or Postmark).
- **Chat:** unchanged (ADR-0016). Polling while a chat is open; email digest for unread messages instead of a push per message.
- **Moderation:** role-gated `/mod` pages in the same website (ADR-0017), which is easier to use on a laptop than in a phone app.
- **Hosting:** the website needs its own host (Vercel is the default for Next.js; Render also works). See DEPLOYMENT_GUIDE.
- **Testing:** Vitest and React Testing Library for components; Playwright for end-to-end journeys in a real browser.
- **No store accounts needed** for the MVP (no Apple Developer Program or Google Play fees).
- Backend work already done (M0a) is unaffected.

## Revisit when
Retention data shows users want a native app (for reliable push notifications), or the pitch needs store presence.
