# ADR-0015: Separate Viber and business accounts, with separate sign-in

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** ARPIT ("owners are only interested in creating events or promotion, but a Viber is part of the community"; "the login should be different for a Viber and for a property/hotel owner, as the interface will differ hugely")

## Context
Events can be created by Vibers and by hotel, hostel, homestay, cottage, café and activity owners. Owners want to create events and promote their property; they are not part of the community and should not appear as people to match with. A single business may manage several properties and have staff. The two interfaces differ substantially.

## Options considered
1. **One account type with a "business" flag on the profile.** Businesses would leak into people discovery and messaging; one profile can't represent several properties or staff.
2. **One login with a Viber/business mode switch.** Convenient for owners who also travel, but mixes two very different products in one session and complicates authorization.
3. **Separate account types with separate sign-in, in the same app.** The welcome screen offers "Join as a Viber" or "Sign in as a business". Each account type has its own onboarding and its own interface.
4. **A separate business app or web portal.** Cleanest separation, but a second product to build, ship and get through store review.

## Decision
Option 3.
- Every account has an `account_type` set at sign-up: `viber` or `business`. It never changes. The JWT carries it, and every API route checks it.
- Viber accounts → `viber_profiles`. Business accounts → membership in an `organization` (`organization_members`: role owner or staff) → `properties`.
- Events have exactly one host: a Viber or an organization. An event can optionally link to a property.
- Businesses are excluded from people discovery, connections and one-to-one messaging.
- Business sign-in uses email code or Google (Apple also offered on iOS). Trust comes from the Verified Business review, not Viber phone verification.
- An owner who also wants to be a Viber creates a second account with a different email.

## Consequences
- Two onboarding flows and two navigation trees in one Expo app; shared design system and API client.
- Authorization is simpler: a request is either a Viber request or a business request.
- Ranking treats business and community events with the same rules; any paid promotion later must be labelled "Promoted".
- If the business interface outgrows the phone, a web dashboard can use the same API and business accounts (Option 4 later).

## Revisit when
Owners frequently ask to use one account for both, or the business side needs desktop-scale tools.
