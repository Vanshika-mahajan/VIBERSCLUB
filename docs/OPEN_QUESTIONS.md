# Open questions and working assumptions

Living list. When an item is resolved, move it into an ADR or the PRD and delete it here.

## Answered on 2026-10-25 (by ARPIT)

| Question | Answer | Recorded in |
| --- | --- | --- |
| Team and time | Team of 5, two technical; ARPIT leads most of the build | This file |
| Python or TypeScript | Comfortable in Python | ADR-0003 |
| Web or app | App | ADR-0002 |
| First audience | All traveller types; Indian and foreign (including Iran and other countries) | PRD section 3, ADR-0014 |
| Supply partners | Yes, contacts with hostels/cafés exist | PRD H3 |
| Paid events | Both free and paid; organizer collects in MVP | ADR-0009 |
| Who can host | Any verified Viber with community rules and reporting | ADR-0008 |
| Safety stance | Women-only discovery and mutual-only messaging, validated with users | ADR-0007, ADR-0013 |
| Budget | Free tiers plus pay-as-you-go, low thousands of rupees a month, until funding; MVP must be pitchable | PRD section 9 |
| Where docs live | This repository | ADR-0001 |

## Working assumptions

| # | Assumption | If wrong |
| --- | --- | --- |
| A1 | Year-one scale is hundreds to low thousands of monthly users | Little changes below about 100k users |
| A2 | Launch and pilot in a peak season | Off-season needs Planner features to carry the app |
| A3 | "Recorded visit" means an attended event or a manual "I went here", never inferred from browsing | — |
| A4 | Android is tested first, iOS before public launch | — |

## Open questions

| # | Question | Needed by | Default if unanswered |
| --- | --- | --- | --- |
| Q1 | Who on the team owns the interest taxonomy and curated places dataset? | Phase 2 | ARPIT |
| Q2 | How do foreign users without SMS become Verified Viber? (ID check, host vouching, partner hostel check-in) | Phase 2 | Browse and RSVP only until verified |
| Q3 | Target pilot date and season | Implementation roadmap | Before the next peak season |
| Q4 | Who reviews reports, and how fast? | Before pilot | Team rota, under 24 hours |
| Q5 | LLM and embedding provider | Before the matching feature | Decided by a 50-example evaluation |
| Q6 | Which 5 to 10 partner venues commit to month one? | Before pilot | — |
| Q7 | Legal review: who and when? | Before public launch | — |
