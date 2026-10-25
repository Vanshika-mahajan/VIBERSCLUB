# Vibers Club — Product Requirements (MVP)

- **Status:** Draft v0.1, for review
- **Owner:** ARPIT
- **Last updated:** 2026-10-25
- **Source of truth for:** what we build, for whom, and how we know it works. Technical decisions live in [adr/](adr/); open items in [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).

## 1. Summary

Vibers Club is a mobile app for Manali that turns a traveller's own description of the trip they want into matches with compatible people, real events and places, and lets them meet safely. The MVP proves one loop:

> Express intent → see relevant Vibers and events → connect or RSVP → meet in real life → leave feedback.

The MVP must also be strong enough to pitch to investors. That means a polished core loop on real or realistic Manali data, not a long feature list.

## 2. Problem

Travellers in or headed to Manali have no trustworthy way to find people who want the same kind of trip, or small experiences that fit their taste. Today this happens through Instagram, hostel common rooms, WhatsApp groups and chance. Results are noisy, popularity-driven, and risky to act on with strangers.

Hosts (hostels, cafés, activity providers, individual Vibers) have no cheap channel to reach travellers whose interests fit their event.

## 3. Users

| Persona | Who | Main need | MVP? |
| --- | --- | --- | --- |
| **Planner** | Indian or foreign traveller with a Manali trip in the next 1 to 3 months | Find people going at the same time, see what's on, plan | Yes |
| **Visitor** | Currently in Manali for 2 to 14 days, often solo or in a pair, hostel or homestay | Meet compatible people and find something to do this week | Yes (primary) |
| **Local / long-stayer** | Lives in the valley or stays for months (workcation) | Meet newcomers, host small activities | Yes |
| **Host** | Any Viber who creates an event: a traveller planning a sunrise walk, a local, or the owner of a hotel, hostel, homestay, café or activity, from inside or outside Manali | Find the right people for their event | Yes |
| **Alumnus** | Visited before | Share recommendations, plan a return trip | Later |
| **Moderator** | Vibers Club team member | Review reports, remove harmful content, suspend accounts | Yes |

**One kind of account.** Everyone is a Viber ([ADR-0015](adr/0015-everyone-is-a-viber.md)). There are no separate business accounts. A hotel owner, a café owner and a backpacker all sign up the same way, use the same app, and can all create events. A Viber who runs a property can optionally add a property page and link their events to it.

Audience mix: Indian and international travellers, including visitors from Iran and other countries ([ADR-0014](adr/0014-english-ui-multilingual-input.md)). All users are 18+ ([ADR-0012](adr/0012-adults-only.md)).

## 4. MVP scope

### In scope

| Area | What ships |
| --- | --- |
| Accounts | Sign in with Google, Apple or email code; optional phone verification to become a Verified Viber ([ADR-0005](adr/0005-supabase-auth-sign-in-methods.md)) |
| Onboarding | Progressive: travel status, area, rough dates, interests (chips or free-text vibe). Only status is mandatory |
| Profile | Name, photo(s), short bio, vibe text, confirmed interests, travel plan, visibility settings, optional gender for women-only discovery |
| Vibe Intelligence | Free text → extracted interests, intent, area and dates, shown back as editable chips ([ADR-0011](adr/0011-controlled-taxonomy-and-validated-llm-extraction.md)) |
| Discover Vibers | Card stack of eligible Vibers with a "why you match" line; like, pass, save, request to connect |
| Connections and chat | Mutual-acceptance connections; 1:1 text chat between connections ([ADR-0007](adr/0007-messaging-mutual-connections-only.md)) |
| Events | Create (free or paid), discover ranked by fit, RSVP, capacity and waitlist, reminders, attendee list visibility setting ([ADR-0008](adr/0008-any-verified-viber-can-host-events.md), [ADR-0009](adr/0009-paid-events-organizer-collects.md)) |
| Host tools | Manage registrations, mark paid, mark attendance, see simple counts (views, RSVPs, attendance), send updates to registrants, cancel event with notification |
| Properties (optional) | A Viber can add a property they run (hotel, hostel, homestay, cottage, café, activity provider) with photos, area, amenities and interests, and link events to it. Other Vibers can view it, see its upcoming events and save it; booking links out to the property's own channel |
| Explore (curated) | 100 to 200 hand-curated places with area, category, interests; 3 to 5 ready-made roadmaps; save places and roadmaps |
| Feedback | After an attended event: rating plus short review, only for registered attendees |
| Notifications | Push and in-app: connection request and acceptance, new message, event reminder, event changed or cancelled, feedback request. Per-type opt-out |
| Safety | Block, report (user, message, event, review), women-only discovery ([ADR-0013](adr/0013-women-only-discovery-option.md)), area-level location only ([ADR-0006](adr/0006-location-privacy-named-areas.md)), rate limits |
| Moderation | Admin queue of reports; hide content; suspend user; every action audit-logged |
| Account control | Edit or delete account and data; export on request |

### Out of scope for MVP (and why)

| Feature | Phase | Reason |
| --- | --- | --- |
| In-app payments, refunds, payouts | 2 | [ADR-0009](adr/0009-paid-events-organizer-collects.md) |
| Public feed and structured post composer | 2 | A feed needs user density; profile vibes carry intent in MVP |
| Separate business accounts or business dashboard | Not planned | Dropped in favour of one account type ([ADR-0015](adr/0015-everyone-is-a-viber.md)) |
| Verified-property badge | 2 | Manual review once properties are common |
| Paid promotion (featured events or properties) | 2 | Needs clear "Promoted" labelling and pricing; MVP promotion is organic ranking plus a property page |
| Advanced business analytics | Future | MVP shows simple counts only |
| AI-generated or editable custom roadmaps | 2 | Needs a reliable places dataset first; never invent places or times |
| Place reviews, travel stories | 2 | Moderation capacity |
| Vibe Circles, group chat | 2 | Group moderation is harder than 1:1 |
| Web admin console and public event share pages | 2 (admin may start as a minimal internal tool) | [ADR-0002](adr/0002-mobile-app-with-expo.md) |
| Live map, achievements, challenges, "worth the hype?" insights, business analytics | Future | Need demand evidence, scale, or a separate safety design |
| Accommodation booking | Not planned | Link out to existing platforms |
| Other destinations | Not planned | Manali only until the loop works |

## 5. Core journeys and acceptance criteria

Each criterion is testable. "Eligible" always means: not blocked in either direction, account active, visibility allows it, women-only filters satisfied, both 18+.

### J1. Join and express intent
A new user gets from install to a first relevant recommendation in under 2 minutes.

- [ ] User can sign in with Google, Apple or an email code.
- [ ] Only travel status (planning, here now, local) is mandatory; every other step can be skipped and completed later.
- [ ] User can type a free-text vibe in any language; within 10 seconds the app shows extracted interests as chips.
- [ ] User can remove or add chips; saved interests are exactly what the user confirmed.
- [ ] If extraction fails or times out, the user can still pick chips manually and continue.
- [ ] Date of birth under 18 blocks signup.

### J2. Discover compatible Vibers
- [ ] The stack shows only eligible Vibers whose travel windows overlap or who are locals/long-stayers.
- [ ] Each card shows a "why you match" line built only from fields both users have made visible (for example shared interests, overlapping dates, same area).
- [ ] No card shows exact location, phone, email or other contact details.
- [ ] Like, pass and save are recorded; a passed Viber does not reappear for 30 days unless their plan changes.
- [ ] Mutual likes are surfaced as suggested connections.
- [ ] Discovery can be paused, which removes the user from others' stacks.

### J3. Connect and message
- [ ] Only Verified Vibers can send connection requests, with an optional note up to 200 characters.
- [ ] Requests are rate-limited per user per day.
- [ ] Messaging is possible only after acceptance; the API rejects messages between non-connected users.
- [ ] Block is available from the profile and every chat; blocking removes the connection and hides both users from each other everywhere, including events' attendee lists.
- [ ] Report is available on profiles and messages and creates a moderation item.

### J4. Find and join an event
- [ ] Event list shows upcoming events only, ranked by interest fit, time fit and area.
- [ ] Each event shows host, time, area and meeting point, price (or Free), seats left, minimum age, and interests.
- [ ] RSVP to a free event confirms immediately if seats remain; otherwise the user joins the waitlist.
- [ ] RSVP to a paid event creates a pending registration and shows the host's payment instructions and a clear note that Vibers Club does not handle payment or refunds.
- [ ] Confirmed registrations never exceed capacity, including under simultaneous RSVPs.
- [ ] Reminder notification 24 hours and 2 hours before the start (each can be switched off).
- [ ] User can cancel their RSVP; the first waitlisted user is offered the seat.

### J5. Host an event
- [ ] Only Verified Vibers can create events, and they accept community rules the first time.
- [ ] Required fields: title, description, category, start and end time, area, meeting point (public venue), capacity, pricing type (defaults to Free; Paid is optional). Interests are suggested from the description and confirmed by the host.
- [ ] Hosts can create events from anywhere; times are stored with the Asia/Kolkata time zone and shown in it.
- [ ] Hosts see registrations, mark paid, mark attended, and message all registrants about changes.
- [ ] Editing time or place, or cancelling, notifies every registrant.
- [ ] New hosts can have at most 3 upcoming events until they complete one without upheld reports.

### J5b. Add a property (optional)
- [ ] Any Viber can add one or more properties from their profile. Properties and events are separate records; an event can optionally link to a property the host manages.
- [ ] A property page shows its details, its upcoming events, and the Viber who manages it.
- [ ] Hosts see registrants' name, photo and registration status for their own events only.
- [ ] Event updates from a host go only to that event's registrants, who can turn them off.

### J6. Feedback after an event
- [ ] Two hours after an event ends, registered attendees get a feedback request (if enabled).
- [ ] Only users with a confirmed registration can review; a host cannot review their own event.
- [ ] Reviews are a 1 to 5 rating plus optional text; text can be reported and hidden by moderators.
- [ ] Event pages show the average rating only after at least 3 reviews.

### J7. Explore Manali (curated)
- [ ] Places list filtered by area, category and interest, ranked by the user's interests.
- [ ] Every place comes from the curated dataset; the app never shows AI-invented places, opening hours or prices.
- [ ] User can view 3 to 5 ready-made roadmaps (for example 3 days in Old Manali, the slow way) and save them.
- [ ] Saved places and roadmaps appear in the profile's Saved tab.

### J8. Moderate a report
- [ ] Moderators see a queue of open reports with the reported content and reporter's note.
- [ ] Actions: dismiss, hide content, warn user, suspend user. Each records moderator, time, reason.
- [ ] A suspended user cannot sign in to an active session, and their profile and events disappear from discovery.
- [ ] Reporter is notified that the report was reviewed (without details of the action).

### J9. Control my data
- [ ] User can change visibility for profile, travel dates, and attendee-list appearance.
- [ ] User can delete their account; personal data is deleted or anonymised within 30 days, except what the law requires us to keep (to confirm with legal review).

## 6. Recommendation rules (product level)

Different matches are different problems; each has its own eligibility and ranking. Detailed design goes in AI_MATCHING_DESIGN.md.

| Recommendation | Hard eligibility (rules, never AI) | Ranking signals |
| --- | --- | --- |
| Viber → Viber | Eligible (above); travel windows overlap, or the other is a local/long-stayer; discovery not paused | Shared canonical interests, date overlap, same or nearby area, compatible intent (companion, activity buddy, local tips), semantic similarity of vibes, recent activity |
| Viber → Event | Event upcoming, not cancelled, not hidden; seats or waitlist open; user meets minimum age; host not blocked | Interest match, time fits the user's dates, area, semantic similarity, host's track record |
| Viber → Place | Place active in curated data | Interest match, area, similarity to saved places |

Explanations ("why you match") are generated from structured overlaps, not free LLM text.

## 7. Success metrics

No benchmarks are assumed; targets are set after the first pilot.

| Metric | Definition | What it tells us |
| --- | --- | --- |
| Onboarding completion | Share of signups that reach the first discovery screen | Is joining easy? |
| Meaningful profile rate | Share of users with a photo plus at least 3 confirmed interests and a travel status | Do we have enough signal to match? |
| Time to first relevant recommendation | Median time from install to first like, save or RSVP | Does the first session deliver value? |
| Connection acceptance rate | Accepted / sent requests | Are matches actually compatible? |
| Discovery → RSVP conversion | Users who RSVP after viewing events / users who viewed events | Are events relevant? |
| Show-up rate | Attended / confirmed registrations | Are RSVPs real? |
| Feedback rate and average rating | Reviews / attendances, mean rating | Experience quality |
| Week-1 and trip-length retention | Users active on 3 or more days during their stated trip | Habit during a trip |
| Repeat hosts | Hosts with a second event within 30 days, split by hosts with and without a property | Is supply sustainable? |
| Property-linked events | Share of events linked to a property | Are owners using Vibers Club to promote? |
| Safety | Reports per 1,000 active users; median time to resolve | Is the community safe? |
| AI cost per meaningful interaction | AI spend / (connections + RSVPs) | Is AI earning its cost? |

## 8. Hypotheses to validate

| # | Hypothesis | Cheapest test (before or alongside the build) |
| --- | --- | --- |
| H1 | Travellers will describe their trip in free text if it gets them better matches | Concierge test: a form plus WhatsApp; the team matches 20 to 30 travellers by hand; measure how many meet |
| H2 | Interest-plus-date matching produces connections people accept | Acceptance rate in the concierge test and the pilot |
| H3 | Hostels and cafés will post events weekly | Commit 5 to 10 partners for the first month (you have contacts) |
| H4 | Paid events work with organizer-side collection | Show-up rate and complaints on paid events in the pilot |
| H5 | Women-only discovery increases women's willingness to use the app | Five interviews before building; usage of the setting after |

## 9. Pitch demo requirements

The MVP doubles as the investor demo, so:

- Seed data: realistic (clearly labelled test) profiles, 15 to 30 real or partner events, and the curated places dataset.
- A scripted 3-minute path: sign up with a free-text vibe, see extracted interests, get matched with a "why you match" reason, connect, RSVP to a paid event, receive a reminder.
- Analytics events for every metric in section 7 from day one, so the pitch can show real pilot numbers.
- Android and iOS builds installable via TestFlight and Play internal testing.

## 10. Non-functional requirements

- **Privacy:** no exact user location; contact details never shown; DPDP-compliant consent and deletion (legal review required).
- **Security:** all authorization in the API; secrets only in the hosting provider's secret store; uploads type- and size-checked.
- **Performance:** discovery stack and event list load in under 2 seconds on a 4G connection.
- **Reliability:** background jobs retry and are idempotent; a failed extraction never blocks the user.
- **Cost:** within free tiers plus pay-as-you-go, low thousands of rupees per month, until funding.
- **Offline tolerance:** Manali has patchy connectivity; the app shows cached data and queues messages briefly rather than crashing.

## 11. Legal items for professional review before launch

Not legal advice; these need a lawyer:

- Digital Personal Data Protection Act 2023 and Rules: notice, consent, children's data, erasure, breach reporting.
- IT Act 2000 and Intermediary Guidelines 2021: grievance officer, takedown timelines, user agreement.
- Consumer protection rules if we later handle payments for events.
- Minimum age for alcohol-related events in Himachal Pradesh.
- Terms for hosts, including liability for events they run.
