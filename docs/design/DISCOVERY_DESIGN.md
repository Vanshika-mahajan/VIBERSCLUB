# Discover screen: design direction

- **Status:** Accepted 2026-10-26. ARPIT chose "Your look, keep Like→Connect": the design's look and flow, with like, pass, save and mutual connection; rooms in phase 2.
- **Source:** `discovery-prototype.html`, shared by ARPIT on 2026-10-26 ("discovery page interface should be like this"). It is a self-contained prototype with fictional people; portraits are hot-linked Pexels photos and do not load without internet.

## What the design does

1. **The sphere.** A slowly rotating 3D sphere of portrait cards, places, events and interest tokens, drawn on a 2D canvas (no WebGL). Headline: "Somewhere, someone is thinking like you."
2. **The thought bar.** One input, "What's on your mind?", plus example thoughts to try.
3. **What I understood.** As you type, the text becomes hashtag chips (for example `#Trekking`) with suggested extras (`+ #Mountains`). You can remove a chip or add one. A line says how many people match, how sure it is, and offers "Why these?".
4. **People step out.** The matching people fly out of the sphere into a floating row (desktop) or grid (phone), each labelled with the interest they share.
5. **Pathways.** "One thought, many worlds": interest pairs (Mountains / Trekking, Adventure / Trekking) with how many people sit in each.
6. **Profile peek.** A side panel showing photo, name, role, general area only, a first-person bio, "Shares with your thought", "Into", "Why they're here" (reasons), and rooms they belong to.
7. **Rooms.** Public discussion spaces per place and interest, with threads, replies, join, follow and report.
8. **Comfort and access.** List view (the same results as plain lists; the accessible alternative), calm mode, pause, an info dialog, reduced-motion support, keyboard focus handling, and an 18+ check before any social action.

## How it fits what we already agreed

| Design element | Fit | Proposal |
| --- | --- | --- |
| Sphere, thought bar, chips, people stepping out, list view, calm mode | Fits, and is a stronger take on F4 than a card stack | Adopt as the Discover screen |
| Text becomes interest chips you can correct | Fits F3 and AI_MATCHING_DESIGN (controlled taxonomy, user edits win) | The API turns the thought into chips: synonym rules first (fast, free, like the prototype's lexicon), the LLM only when rules are unsure. Same 62-interest taxonomy |
| "Why these?" reasons, no compatibility percentages | Fits (explanations from visible fields only) | Reasons come from the API's scoring, never from hidden fields |
| General area only, never precise location | Fits ADR-0006 | Keep |
| 18+ check before social actions | Fits (18+ at sign-up) | Covered by sign-up; no extra prompt needed |
| Only eligible people appear | **Gap** in the prototype (it shows everyone) | The sphere and results show only Vibers who pass eligibility: discoverable, not blocked either way, women-only rules, dates |
| No like / pass / save / connect on the profile; "conversations happen in rooms" | **Conflicts** with F4 and F5 (like, mutual like, connection, then 1:1 chat) | Decision needed (see below) |
| Rooms (public group discussions) | **Conflicts** with "must not build yet": group chat and Vibe Circles, public feed | Decision needed |
| Goa, Leh, Rishikesh, Jaipur examples | **Conflicts** with Manali first (ADR-0014) | Manali areas only (Old Manali, Vashisht, Solang, Kasol trips) |
| Places, events and communities on the sphere | Partly: events (F7) and places (Explore, F8) exist; communities do not | Show people and events in MVP; places when Explore lands |
| Typing never leaves the device | Not possible once results are real people | Say plainly: "Your thought is used to find people and is not shown to anyone" |
| Hot-linked Pexels photos | Demo only | Real profile photos from Supabase Storage |

## Decision needed

What happens when you like someone you found?

- **A. Keep the agreed safety model (recommended).** The profile panel gets Like, Pass and Save. A mutual like leads to a connection, then a 1:1 chat. Rooms move to phase 2, after we have moderators and user density.
- **B. Rooms in the MVP.** Public discussion rooms per place and interest, as in the design. This adds group moderation, reporting per message and a new data model, roughly two extra milestones, and reverses the "no group chat" rule.

## Build plan

- Now (design step, no backend needed): build the Discover screen in `apps/web` with the prototype's look, using clearly labelled sample Vibers behind a local data adapter, so it can be reviewed on phone and desktop.
- M5: swap the adapter for `POST /discovery/query` (thought → chips → ranked eligible Vibers with reasons) and Like / Pass / Save.
- M10: semantic ranking with embeddings behind the same endpoint.

## What was built (design step, 2026-10-26)

`apps/web/features/discover/`:

| File | What it does |
| --- | --- |
| `sphere.ts` | The canvas sphere, a TypeScript port of the prototype's engine (room transition left out) |
| `interpret.ts` | Rules-first reading of a thought: synonyms → taxonomy ids, negation ("no clubbing"), plurals, intents, area, corrections, confidence, explanation |
| `rank.ts` | Rules-only ranking (IDF-weighted shared interests, intent fit, area; excluded interests halve the score; diversity cap), template reasons, suggestions, "Narrow it down" |
| `adapter.ts` | `DiscoveryAdapter` interface; the sample adapter runs `interpret` + `rank` in the browser. M5 swaps in an API adapter |
| `sample-data.ts` | 40 fictional Manali Vibers (the prototype's personas, moved to Manali areas and our taxonomy) and 12 event and place cards |
| `DiscoverScreen.tsx`, `ProfilePanel.tsx`, `discover.module.css` | The screen, profile panel and styles |
| `lib/taxonomy.ts` | The 62-interest taxonomy, intents and areas, with synonyms |

`interpret.ts` and `rank.ts` are also the reference for the API's rules (M5): port them to Python with the same tests.

Differences from the prototype: Manali only; people only become buttons once their card lands; the line under the bar no longer claims "nothing leaves this device", because in M5 the thought goes to our API; no rooms, so the profile shows Like, Pass and Save instead of "Rooms they're part of".
