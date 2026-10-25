# ADR-0001: Record decisions as ADRs in this repo

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** ARPIT

## Context
A team of five, two of them technical, will make many product and architecture decisions. Without a record, decisions get re-argued and documents drift apart.

## Options considered
1. Decisions in chat or meeting notes: no single place to look.
2. Decisions inside each spec document: the same decision ends up restated, then contradicted.
3. One short file per decision in `docs/adr/`: easy to find, review in pull requests, and supersede.

## Decision
Option 3. Specs link to ADRs rather than restating them.

## Consequences
Every significant change to stack, data model, safety rules or scope gets an ADR in the same pull request.
