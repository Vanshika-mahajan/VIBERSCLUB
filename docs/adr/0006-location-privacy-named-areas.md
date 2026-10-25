# ADR-0006: Users are placed by named area, never live GPS

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** ARPIT (accepted safety defaults)

## Context
Showing strangers where a traveller is right now creates stalking and harassment risk. Matching only needs to know that two people are in the same part of Manali at overlapping times.

## Options considered
1. Exact GPS, shared live: highest risk, little extra matching value.
2. Approximate GPS (fuzzed radius): can be de-fuzzed with repeated queries.
3. Named areas chosen by the user: Old Manali, Vashisht, Mall Road and Model Town, Aleo and Prini, Jagatsukh, Solang and Palchan, Naggar, plus "Elsewhere in Kullu valley" and "Not in Manali yet".

## Decision
Option 3. Users pick an area; the app never reads device location for other users to see. Venues (places, properties, event locations) have exact coordinates because they are public businesses or meeting points.

## Consequences
- No PostGIS needed for MVP.
- The area list lives in one table, editable by admins.
- A future live map (if ever built) needs its own safety ADR.
