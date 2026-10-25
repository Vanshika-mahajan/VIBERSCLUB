# ADR-0008: Any verified Viber can host events, under community rules

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** ARPIT

## Context
Events solve cold start: they give people a reason to meet. Requiring business verification for every host would starve the event supply.

## Decision
- Any verified Viber (ADR-0005) can create an event, from inside or outside Manali.
- Hosts accept community rules at first event creation (meet in public venues, honest descriptions, no illegal activity).
- Events can be reported; reported events go to the moderation queue and can be hidden.
- New hosts are limited (for example, a small number of upcoming events at once) until they have completed events without reports.
- Business organizers (hostels, cafés, activity providers) get a verified-organizer badge after manual review. That flow is light in MVP and fuller in phase 2.

## Consequences
- Moderation workload rises with event volume; the admin queue is part of MVP.
- Event location must be a public venue or a named meeting point, never a private room address shown publicly.
