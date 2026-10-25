# ADR-0015: Separate Viber and business interfaces in one app

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** ARPIT ("owners are only interested in creating events or promotion, but a Viber is part of the community")

## Context
Events can be created by Vibers and by hotel, hostel, homestay, cottage, café and activity owners. Owners want to create events and promote their property; they are not part of the community and should not appear as people to match with. A single owner may manage several properties, and may also travel as a Viber.

## Options considered
1. **One account type with a "business" flag on the profile.** Simple, but businesses would leak into people discovery and messaging, and one profile can't represent several properties or staff.
2. **Separate business app or web portal.** Clean separation, but a second product to build and ship.
3. **One app, two modes.** A person (`user`) can have a Viber profile and can belong to one or more businesses (`organization`, with members and roles). The app switches between Viber mode and business mode.

## Decision
Option 3.
- Data: `users` → `viber_profiles` (one per user) and `organizations` → `organization_members` (user, role: owner or staff) → `properties`. Events have either a Viber host or an organization host (exactly one), and an optional `property_id`.
- Business mode shows a dashboard: properties, events, registrations, simple stats, updates to registrants.
- Businesses are excluded from people discovery, connections and one-to-one messaging by eligibility rules in the API.
- A web dashboard for businesses may be added later (ADR-0002); the API is the same.

## Consequences
- Authorization must check organization membership and role for every business action.
- Ranking treats business and community events with the same rules; any paid promotion later must be labelled "Promoted".
- Verification is per organization (Verified Business badge), separate from Viber phone verification.
