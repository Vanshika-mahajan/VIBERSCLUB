# ADR-0015: One account type: everyone is a Viber

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** ARPIT ("let everyone be a Viber and then create an event; a Viber can be anyone")

## Context
Events are created by travellers, locals, and owners of hotels, hostels, homestays, cottages, cafés and activities. We considered giving owners a separate interface.

## Options considered
1. **One account type: everyone is a Viber.** One sign-up, one interface, anyone can host. Owners optionally add a property page.
2. **One login with a Viber/business mode switch.** More flexible for owners, but two interfaces in one session and more authorization logic.
3. **Separate Viber and business accounts with separate sign-in.** Clean separation, but two onboarding flows and two interfaces to build.

## Decision
Option 1. There is no `account_type`. Every user has a Viber profile.
- Any verified Viber can create events (ADR-0008), free by default, paid optional (ADR-0009).
- A Viber can optionally create one or more `properties` they manage; an event can link to one of the host's properties. Properties and events stay separate entities.
- A property is a listing, not an account: it cannot sign in, appear in discovery, connect or chat. Its page shows "Managed by" the Viber who created it, and when creating an event that Viber can pick the property as the location. Confirmed by ARPIT on 2026-10-25.
- Owners appear in people discovery like any Viber and follow the same rules: mutual-only messaging (ADR-0007), rate limits, reporting. They can pause discovery if they only want to host.

## Consequences
- Much less to build: one onboarding, one navigation, one set of permissions.
- Risk: owners using connection requests and chat to advertise. Mitigation: community rules forbid unsolicited promotion in messages, connection requests are rate-limited, and "spam or promotion" is a report reason.
- Staff accounts for a property (several people managing one property) are not supported in MVP; a property has one managing Viber.

## Revisit when
Owners ask for shared management or a desktop dashboard, or promotion spam in messages shows up in reports.
