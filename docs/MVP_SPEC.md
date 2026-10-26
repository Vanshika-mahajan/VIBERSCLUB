# Vibers Club — MVP Feature Specification

- **Status:** Draft v0.1, for review
- **Last updated:** 2026-10-25
- **Source of truth for:** how each MVP feature works end to end. User-facing acceptance criteria live in [PRD.md](PRD.md) and are referenced by journey (J1 to J9); this file adds the engineering detail. Endpoints are outlined in [API_SPECIFICATION.md](API_SPECIFICATION.md), tables in [DATABASE_DESIGN.md](DATABASE_DESIGN.md).

The MVP has 15 features. Section 16 lists what must not be built yet.

---

## F1. Sign-in and account creation
- **Problem:** joining must be quick for Indian and foreign travellers.
- **Behaviour:** welcome screen; sign in with Google or an email code; enter name and date of birth; under-18s are stopped.
- **Backend:** verify Supabase JWT (JWKS, cached); `POST /me` creates `users` and `profiles`; reject under 18; suspended check on every request.
- **Data:** `users`, `profiles`.
- **Endpoints:** `POST /me`, `GET /me`.
- **Screens:** Welcome, Sign in, Email code, Name and birthday.
- **Acceptance:** PRD J1 (sign-in, 18+).
- **Tests:** unit for age calculation across time zones and birthdays; integration for JWT valid, expired, wrong audience, wrong signature; `POST /me` idempotent; suspended user gets 403.
- **External:** Supabase Auth, Google OAuth client, email service as SMTP sender for sign-in codes.
- **Failures:** email code not received (resend after 30 s, then suggest Google); JWKS fetch fails (use cached keys, alert); a second `POST /me` returns the existing user.

## F2. Onboarding, profile and travel plan
- **Problem:** we need enough signal to match without making joining tedious.
- **Behaviour:** steps for travel status (required), area, dates and flexibility, intents, photo, interests. Every step except status can be skipped. The profile is editable later.
- **Backend:** validate plan (dates required unless local; end after start); photo upload via signed URL, then register; enforce max 6 photos; profile completeness score for the app's nudge.
- **Data:** `profiles`, `profile_photos`, `travel_plans`, `user_interests`, `areas`, `interests`.
- **Endpoints:** `PATCH /me/profile`, `PUT /me/travel-plan`, `POST /me/photos/upload-url`, `POST /me/photos`, `DELETE /me/photos/{id}`, `PUT /me/interests`, `GET /taxonomy`, `GET /areas`.
- **Screens:** Travel status, Area picker, Dates, Intents, Photo, Interest picker, Profile, Edit profile.
- **Acceptance:** PRD J1.
- **Tests:** validation unit tests for plans; integration for photo registration (missing object, wrong type, too large); interest ids must exist; profile shown to others never includes email or phone.
- **External:** Supabase Storage.
- **Failures:** upload interrupted on patchy network (retry from the app; unregistered objects cleaned up daily); invalid interest id (`422`).

## F3. Vibe extraction
- **Problem:** people describe trips in their own words and languages.
- **Behaviour:** user writes a vibe; within about 10 seconds chips appear; user confirms or edits; if it fails, manual chips are shown.
- **Backend:** save text and enqueue `extract_vibe`; worker calls LLM, validates, maps synonyms, saves suggestions; `ai_calls` logging; circuit breaker and budget guard.
- **Data:** `profiles.vibe_text`, `vibe_status`, `vibe_extractions`, `ai_calls`, `interest_synonyms`.
- **Endpoints:** `PUT /me/vibe`, `GET /me/vibe`, `PUT /me/interests`.
- **Screens:** Vibe composer (inside onboarding and Edit profile), Suggested chips.
- **Acceptance:** PRD J1 (extraction within 10 s, user edits win, failure fallback).
- **Tests:** unit for validation and synonym mapping (fixtures of good, bad and hostile model outputs); integration with a fake LLM adapter (success, invalid then valid, timeout, outage); idempotency (same text twice makes one call); offline eval run.
- **External:** LLM API.
- **Failures:** timeout, invalid output, outage, budget exceeded: all end in manual chips with no error shown beyond "Pick your interests".

## F4. Viber discovery
- **Problem:** find compatible people for this trip.
- **Behaviour:** card stack; each card shows photos, name, area, shared interests, explanation; like, pass, save; mutual like prompts a connection request; discovery can be paused.
- **Backend:** eligibility SQL, scoring (AI_MATCHING_DESIGN section 7), explanations, batch cache, swipe upsert, mutual detection.
- **Data:** `travel_plans`, `user_interests`, `profiles`, `blocks`, `swipes`, `connections`, `discovery_batches`, `embeddings` (from M10).
- **Endpoints:** `GET /discovery/vibers`, `POST /discovery/swipes`, `GET /discovery/saved`, `GET /vibers/{id}`.
- **Screens:** Discover (stack), Viber profile, Saved Vibers, Empty state ("No Vibers match your dates yet, see events instead").
- **Acceptance:** PRD J2.
- **Tests:** unit tests per signal with hand-computed scores; eligibility tests for each filter (block either way, women-only both directions, paused, date windows, flexible dates, local vs visitor, passed within 30 days); explanation never uses hidden fields; batch invalidation.
- **External:** none (embeddings from M10).
- **Failures:** empty pool (empty state that points to events); stale batch (invalidated on change); slow query (limit 500 before scoring, indexes).

## F5. Connections
- **Problem:** a safe, explicit step before chatting.
- **Behaviour:** send a request with an optional note; recipient accepts or declines; accepted creates a chat; either side can remove.
- **Backend:** verified check, daily limit, block check, single row per pair, notifications.
- **Data:** `connections`, `conversations`, `rate_limit_counters`, `notifications`.
- **Endpoints:** `POST /connections`, `GET /connections`, `POST /connections/{id}/accept`, `POST /connections/{id}/decline`, `DELETE /connections/{id}`.
- **Screens:** Request sheet, Requests inbox, Connections list.
- **Acceptance:** PRD J3.
- **Tests:** unverified user blocked; duplicate request returns 409; reverse request while one is pending auto-accepts; limit reached returns 429; blocked pair cannot request; only addressee can accept.
- **External:** email service.
- **Failures:** concurrent requests from both sides (unique pair row; second becomes accept); email failure (in-app notification remains).

## F6. Messaging
- **Problem:** connected Vibers need to plan the meetup.
- **Behaviour:** 1:1 text chat; unread counts and badge; polling every 3 s while open; an email digest if a message stays unread for 30 minutes.
- **Backend:** connection and block check on every send; store message; schedule unread digest; read markers.
- **Data:** `conversations`, `messages`, `conversation_reads`.
- **Endpoints:** `GET /conversations`, `GET /conversations/{id}/messages`, `POST /conversations/{id}/messages`, `POST /conversations/{id}/read`.
- **Screens:** Chats list, Chat.
- **Acceptance:** PRD J3 (messages only between connections, block from chat).
- **Tests:** non-participant gets 404; after block, send gets 403; pagination with `after`; message length limits; unread counts.
- **External:** email service (digests).
- **Failures:** offline send (app keeps it as "sending", retries with the same Idempotency-Key); polling stops when the tab is hidden, to save battery and data.

## F7. Blocks and reports
- **Problem:** users must be able to stop and flag bad behaviour instantly.
- **Behaviour:** block and report from profile, chat, event, review, property; blocked users disappear from each other everywhere.
- **Backend:** block removes connection in the same transaction; all eligibility queries exclude blocks; reports create queue items; daily report limit to stop abuse.
- **Data:** `blocks`, `reports`.
- **Endpoints:** `POST /blocks`, `DELETE /blocks/{user_id}`, `GET /blocks`, `POST /reports`.
- **Screens:** Block confirm, Report sheet, Blocked users (settings).
- **Acceptance:** PRD J3, J8.
- **Tests:** after block, the other user is absent from discovery, chats, event attendee lists and profile view, in both directions; report target validation.
- **External:** none.
- **Failures:** reporting a deleted target (accepted and marked for review); repeated reports (deduplicated per reporter and target).

## F8. Events
- **Problem:** give Vibers a reason to meet, and give hosts the right attendees.
- **Behaviour:** create (free default, paid optional with payment instructions); browse and recommended lists; register or join waitlist; cancel; host manages registrants, payment status, attendance, updates, cancellation.
- **Backend:** host rules (verified, community rules, new-host limit, property ownership); interest suggestion via extraction; capacity with row lock; waitlist promotion; reminder and feedback scheduling; ranking.
- **Data:** `events`, `event_interests`, `event_photos`, `registrations`, `properties`.
- **Endpoints:** events section of the API outline.
- **Screens:** Events list, Recommended, Event detail, Create event (multi-step), Edit event, My events (hosting and attending), Registrant list, Send update.
- **Acceptance:** PRD J4, J5.
- **Tests:** 20 concurrent registrations for 5 seats give exactly 5 confirmed; waitlist order; cancellation promotes the next; paid events create `pending` payment; capacity cannot be reduced below confirmed; host cannot register; min age enforced; editing time notifies registrants; Asia/Kolkata display.
- **External:** email service, LLM (interest suggestions).
- **Failures:** host deletes account with upcoming events (events cancelled, registrants notified); event in the past cannot be registered; duplicate taps (Idempotency-Key).

## F9. Properties (listings)
- **Problem:** owners want to show off their place; events need a venue.
- **Behaviour:** a Viber adds a property (name, type, area, address, photos, amenities, links); links events to it; others view and save it.
- **Backend:** manager-only edits; property must belong to the host to be linked; report and hide.
- **Data:** `properties`, `property_photos`, `saved_properties`.
- **Endpoints:** properties section.
- **Screens:** Add property, Property page, My properties.
- **Acceptance:** PRD J5b.
- **Tests:** non-manager edit returns 403; linking someone else's property returns 403; hidden property not shown.
- **External:** Supabase Storage.
- **Failures:** misleading listing (report reason, moderator hides).

## F10. Explore: places, roadmaps, saves
- **Problem:** useful content on day one, before many users exist.
- **Behaviour:** browse curated places by area, category, interest; view 3 to 5 roadmaps; save places, roadmaps, properties.
- **Backend:** seed loader; ranking by interests; saves.
- **Data:** `places`, `place_interests`, `roadmaps`, `roadmap_items`, saved tables.
- **Endpoints:** places, roadmaps, saves.
- **Screens:** Explore home, Place detail, Roadmap detail, Saved.
- **Acceptance:** PRD J7.
- **Tests:** seed loader idempotent and rejects unknown interests or areas; no endpoint can return a place not in the curated data.
- **External:** none (OpenStreetMap only for curators' reference).
- **Failures:** a place closes (curators mark `status = closed`; users can report "This place is closed").

## F11. Notifications and reminders
- **Problem:** time-sensitive moments (requests, messages, reminders) need to reach people.
- **Behaviour:** in-app list with unread badge, plus email for time-sensitive types; per-type opt-out. Web push is optional and only after email works.
- **Backend:** notification records; `send_email_notification` and `send_unread_digest` jobs; bounce handling; reminders at 24 h and 2 h.
- **Data:** `notifications`, `notification_preferences`.
- **Endpoints:** notifications, preferences.
- **Screens:** Notifications, Notification settings.
- **Acceptance:** PRD J4 (reminders), J3, J6.
- **Tests:** opt-out respected; job idempotent (no duplicate email); reminder for cancelled event not sent; digest sent once per window.
- **External:** transactional email service.
- **Failures:** email bounces (mark address, show a banner to fix it); email provider outage (retries, then in-app only).

## F12. Feedback and reviews
- **Problem:** build trust data from real experiences only.
- **Behaviour:** 2 hours after the end, attendees get a prompt; 1 to 5 rating plus optional text.
- **Backend:** scheduled job; review eligibility; average shown at 3 or more reviews.
- **Data:** `reviews`, `registrations`.
- **Endpoints:** reviews section.
- **Screens:** Rate event, Event reviews.
- **Acceptance:** PRD J6.
- **Tests:** non-attendee 403; host 403; duplicate review 409; average hidden below 3.
- **External:** email service.
- **Failures:** host marks everyone no-show to block reviews (registrants with `unknown` attendance can still review; abuse is reportable).

## F13. Moderation
- **Problem:** the team must act on reports quickly.
- **Behaviour:** moderators see a Moderation tab with the queue; actions hide, warn, suspend, dismiss.
- **Backend:** role check; actions in a transaction with `moderation_actions`; suspension enforced on next request; reporter notified.
- **Data:** `reports`, `moderation_actions`, `users.status`.
- **Endpoints:** moderation section.
- **Screens:** Moderation queue, Report detail, User summary.
- **Acceptance:** PRD J8.
- **Tests:** non-moderator gets 403 on every `/mod` route; every action writes an audit row; hidden content excluded from all lists.
- **External:** none.
- **Failures:** moderator error (unhide and unsuspend actions exist, both logged).

## F14. Privacy settings and account control
- **Problem:** users must control what others see and be able to leave.
- **Behaviour:** settings for discoverable, show dates, show in attendee lists, women-only discovery; delete account; export data.
- **Backend:** settings respected in every query; deletion with grace period and `delete_account` job.
- **Data:** `profiles` settings, `users.deletion_requested_at`.
- **Endpoints:** `PATCH /me/profile`, `DELETE /me`, `GET /me/export`.
- **Screens:** Privacy settings, Delete account.
- **Acceptance:** PRD J9.
- **Tests:** each setting changes the output of discovery, profile and attendee endpoints; deletion job removes photos and personal fields, keeps anonymised moderation records.
- **External:** Supabase Auth admin API (delete auth user), Storage.
- **Failures:** deletion job fails midway (idempotent; resumes on retry).

## F15. Product analytics (internal)
- **Problem:** the pitch and product decisions need real numbers (PRD section 7).
- **Behaviour:** none visible beyond a consent notice in onboarding.
- **Backend:** server-side metric queries for connections, registrations, reviews; app sends screen and action events to PostHog with the internal user id only (no names, emails or text).
- **Data:** PostHog; database counts.
- **Screens:** none.
- **Tests:** an event schema list in `apps/web/lib/analytics.ts` with unit tests that no PII field is sent.
- **External:** PostHog.
- **Failures:** PostHog unavailable (events dropped, app unaffected).

---

## 16. Must not be built yet

| Feature | Why not now |
| --- | --- |
| In-app payments, refunds, payouts | ADR-0009 |
| Public feed and post composer | Needs user density; vibes carry intent |
| AI-generated or editable roadmaps | Needs reliable place data; risk of invented facts |
| Place reviews and travel stories | Moderation capacity |
| Group chat and Vibe Circles | Harder moderation |
| Live map or any live location | Safety (ADR-0006) |
| Native mobile app (Expo), web push as the main channel, public event share pages | ADR-0020 |
| Business accounts or staff access to properties | ADR-0015 |
| Promoted or featured placement | Needs labelling and pricing rules |
| Achievements, challenges, "worth the hype?" | Engagement before retention is proven |
| Multiple destinations, multiple languages in the interface | Manali first; ADR-0014 |
| Real-time sockets, Redis, microservices, Kubernetes | Not needed at this scale |
