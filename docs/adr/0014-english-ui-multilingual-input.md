# ADR-0014: English UI in MVP; free text accepted in any language

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** ARPIT (approved the Phase 2 blueprint, PR #2)

## Context
Users include Indian and foreign travellers (for example from Iran). Translating the interface into several languages, including right-to-left Farsi, multiplies design and testing work.

## Decision
The interface is English for MVP, built with an internationalisation library from day one so strings are not hard-coded. Users may write vibes and posts in any language; extraction maps them to the same taxonomy. Hindi and other languages are added based on usage data.

## Consequences
Right-to-left layout is not tested in MVP.
