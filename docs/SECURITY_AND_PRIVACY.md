# Vibers Club — Security and Privacy

- **Status:** Draft v0.1, for review
- **Last updated:** 2026-10-25
- **Source of truth for:** the threat model, privacy defaults and the pre-launch checklist. Not legal advice; items marked **Legal** need a lawyer.

## 1. What we protect, and from whom

| Asset | Main threats | Main controls |
| --- | --- | --- |
| A Viber's physical safety | Stalking, harassment, unsafe meetups | Area-only location, mutual-only messaging, hidden dates option, block and report everywhere, women-only discovery, public-venue rule for events |
| Personal data (email, phone, birth date, photos, messages) | Data leaks, scraping, over-sharing between users | Backend-only database access, field-level response schemas, row-level security deny-all, encryption in transit and at rest (Supabase) |
| Accounts | Takeover, fake accounts, spam | Managed auth, phone verification for social actions, rate limits, reporting |
| Platform integrity | Fake or fraudulent events, promotion spam, review manipulation | Host limits, attendee-only reviews, moderation and audit |
| Secrets and infrastructure | Leaked keys, misconfiguration | Secrets only in host secret stores, least-privilege database role, CI secret scanning |

## 2. Privacy defaults

- Other users never see: email, phone, date of birth (only "18+"), exact location, gender (unless used by women-only filter, and even then not displayed), registration history.
- Travel dates are visible as a range by default; `show_dates = false` changes cards to "Our trips overlap".
- Attendee lists show only Vibers who allow it, and only to registrants and the host.
- Device location is not collected in MVP.
- Analytics events carry only the internal user id, never names, emails, vibe text or messages.
- AI calls receive only the text being extracted, never names, emails or other users' data. Choose a provider whose API terms do not use inputs for training.

## 3. Authentication and sessions

- [ ] Supabase Auth handles sign-in; tokens are short-lived JWTs refreshed by the Supabase client. The website keeps the session in cookies through Supabase's server-side helpers, not in hand-written localStorage code.
- [ ] The API verifies every JWT's signature (JWKS), expiry, issuer and audience, and rejects tokens for users whose status is suspended.
- [ ] Phone verification status is read from Supabase server-side (`/me/verification/sync`), never trusted from the app.
- [ ] Website security headers: a Content Security Policy that allows scripts only from our own origin and named services, `X-Frame-Options: DENY`, HTTPS only (HSTS).
- [ ] CORS on the API allows only the website's origins; tokens are sent as `Authorization` headers, so cross-site form posts cannot act as the user.
- [ ] No `dangerouslySetInnerHTML` with user content; React escapes text by default.
- [ ] Only `NEXT_PUBLIC_` variables reach the browser, and none of them is a secret.

## 4. Authorization

- [ ] Every rule lives in the service layer. Route handlers never query tables directly.
- [ ] Every endpoint has at least one negative authorization test (wrong user, blocked user, unverified user, non-host, non-moderator).
- [ ] Object ids in URLs are always checked against the caller (no "guess the uuid" access).
- [ ] The LLM never makes or influences an authorization decision.
- [ ] Moderator and admin roles are set only by a database migration or a CLI command, never through the API.

## 5. Supabase hardening ([ADR-0018](adr/0018-lock-down-supabase-data-api.md))

- [ ] All tables live in the `app` schema, which is **not** exposed to Supabase's Data API.
- [ ] Row-level security is enabled on every table with no policies, as a second line of defence.
- [ ] The app holds only the Supabase public (anon) key, used for auth and signed uploads. The service-role key exists only in the API and worker.
- [ ] Storage buckets are private. Uploads use signed URLs from the API, limited to `image/jpeg`, `image/png`, `image/webp` and 5 MB. Downloads use short-lived signed URLs.
- [ ] The API checks each uploaded object's real type and size before registering it, and strips EXIF metadata (which can contain GPS coordinates) by re-encoding images in the worker.

## 6. Input validation and abuse

- [ ] Every request body is a Pydantic model with length limits and `extra="forbid"`.
- [ ] Free text is stored as plain text and rendered as text in the app (no HTML rendering).
- [ ] Rate limits: per-IP burst limits on all routes; per-user daily limits on connection requests (20), messages to new conversations, events created (new hosts: 3 upcoming), reports (20), event updates (5 per event per day). Values are config, tuned in the pilot.
- [ ] Links in bios and messages are not clickable in MVP, which reduces phishing and promotion spam.
- [ ] Prompt injection: covered in AI_MATCHING_DESIGN section 4.

## 7. Secrets and configuration

- [ ] Secrets live only in the hosting provider's secret store and in local `.env` files that are git-ignored. `.env.example` lists names with no values.
- [ ] Nobody pastes production secrets into chat, tickets or documents.
- [ ] CI runs a secret scanner (gitleaks) on every pull request.
- [ ] Separate Supabase projects and keys for staging and production.
- [ ] Rotate keys when a team member leaves, and at least yearly.

## 8. Logging, audit and monitoring

- [ ] Application logs never contain message bodies, vibe text, tokens, emails or phone numbers. Log user ids only.
- [ ] Sentry scrubs request bodies and auth headers.
- [ ] `moderation_actions` is append-only and records who did what, when and why.
- [ ] Alerts: error spikes, job failure rate, AI budget at 80%, report queue older than 24 hours.

## 9. Data retention and deletion

| Data | Retention |
| --- | --- |
| Account and profile | Until deletion; deleted 7 days after request (grace period to cancel) |
| Photos | Deleted with the account, or immediately when removed |
| Messages | Deleted with the account for the deleting user's side; the other participant sees "Deleted Viber" |
| Registrations and reviews | Anonymised on deletion so hosts' counts and ratings stay accurate |
| Reports and moderation actions | Kept for safety and legal reasons, with the reporter anonymised after **Legal** confirms the period |
| `ai_calls` | 12 months (no user text stored) |
| `vibe_extractions.raw_output` | Deleted with the account; otherwise 90 days |
| Backups | Supabase point-in-time backups expire on their own schedule; deletion requests are re-applied after any restore |

## 10. Indian legal and compliance items (**Legal**)

- Digital Personal Data Protection Act 2023 and its Rules: notice and consent at signup; purpose limitation; correction and erasure; grievance redressal; breach notification to the Data Protection Board and affected users; whether Vibers Club could be classified as a Significant Data Fiduciary later.
- Children's data: the 18+ rule avoids verifiable parental consent, but age is self-declared; agree on what checks are reasonable.
- IT Act 2000 and the Intermediary Guidelines 2021: published terms and privacy policy, grievance officer, takedown timelines for reported content, cooperation with lawful requests.
- Cross-border transfers: Supabase in Mumbai keeps the database in India; confirm the position for AI providers, Sentry and PostHog that process data outside India.
- Events: liability for user-hosted events, especially nightlife and adventure activities; minimum age for alcohol-related events in Himachal Pradesh.
- Foreign users: confirm whether any user-facing feature creates obligations for visitors from sanctioned countries (for example Iran). We never take payments in MVP, which avoids most of this.

## 11. Pre-launch checklist

- [ ] Every item in sections 3 to 8 checked.
- [ ] Authorization test suite green; manual check of each permission in the matrix in API_SPECIFICATION.
- [ ] Dependency audit (`pip-audit`, `npm audit`) with no high-severity issues open.
- [ ] Staging penetration-style review of the top 10 endpoints by a second person.
- [ ] Privacy policy, terms and community rules published and linked in the app.
- [ ] Moderation rota and response targets agreed.
- [ ] Incident plan: who is called, how to suspend a user, how to take an event down, how to rotate keys.
- [ ] Legal review complete.
