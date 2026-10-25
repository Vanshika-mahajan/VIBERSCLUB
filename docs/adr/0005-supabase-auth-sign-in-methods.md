# ADR-0005: Supabase Auth with Google, Apple, email OTP and phone OTP

- **Status:** Proposed
- **Date:** 2026-10-25

## Context
Users are both Indian and foreign (including visitors from Iran and elsewhere). Phone verification raises the cost of fake accounts, but SMS to international numbers is expensive and unreliable, and some foreign visitors use local SIMs or none.

## Options considered
1. **Phone OTP only.** Strong anti-fake signal for Indian users; poor for foreign users, and SMS costs grow with signups.
2. **Social sign-in plus email OTP, with phone verification as a trust step.** Easy signup for everyone; verification is required only for higher-trust actions.
3. **Clerk or Firebase Auth.** Comparable features, but a separate vendor from the database.

## Decision
Option 2 on Supabase Auth:
- Sign in with Google, Sign in with Apple (required by Apple when offering Google), or email one-time code.
- **Verified Viber** = signed in plus a verified phone number (Indian or international) **or**, for users who cannot receive SMS, a later alternative such as ID verification. Verification is required to send connection requests, message, and host events. Browsing does not require it.
- These rules are for Viber accounts. Business accounts sign in through a separate entry (ADR-0015).
- FastAPI verifies the Supabase JWT on every request and maps it to our own `users` row.

## Consequences
- SMS provider cost is pay-as-you-go and only for verification, not every login.
- Foreign users without SMS can browse and RSVP but not host until an alternative verification exists. This is a known gap; see OPEN_QUESTIONS.md.

## Revisit when
Fake-account reports rise, or foreign users drop off at verification.
