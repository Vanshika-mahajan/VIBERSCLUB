# ADR-0019: Product analytics with PostHog, without personal data

- **Status:** Proposed
- **Date:** 2026-10-25

## Context
The PRD's metrics (onboarding completion, time to first recommendation, conversions) and the investor pitch need event data from the app. Nothing in the design collected it.

## Options considered
1. **Database queries only.** Covers server outcomes (connections, registrations), but misses screens and funnels.
2. **PostHog** (free tier, funnels and retention built in; EU or US cloud, or self-host later).
3. **Firebase Analytics or Mixpanel.** Comparable; PostHog's free tier and open-source option fit the budget best.

## Decision
Option 2 for app events, plus database queries for server outcomes. Events carry only the internal user id and non-personal properties. No names, emails, vibe text or message content.

## Consequences
- An onboarding notice and a settings toggle for analytics consent (to confirm under DPDP in legal review).
- PostHog processes data outside India; listed for the cross-border review in SECURITY_AND_PRIVACY section 10.
