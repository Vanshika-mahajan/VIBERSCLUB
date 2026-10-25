# ADR-0011: Controlled interest taxonomy with schema-validated LLM extraction

- **Status:** Proposed
- **Date:** 2026-10-25

## Context
Users describe trips in their own words ("slow village life in Old Manali"). Matching needs consistent structured attributes. LLM output cannot be trusted blindly, and hashtags alone are too noisy to match on.

## Decision
- A versioned, two-level interest taxonomy (around 60 to 100 canonical interests under about 10 categories such as Nature and Treks, Local Culture, Food and Cafés, Nightlife, Wellness, Adventure Sports, Work and Wi-Fi, Photography) lives in code and is seeded into the database.
- The LLM receives the text plus the taxonomy and must return JSON matching a Pydantic schema: intent, interest ids, area, date hints, social preference, display hashtags, confidence. Unknown ids are dropped; free-text synonyms map through a deterministic table.
- Extracted interests are shown to the user as editable chips. User edits always override the model.
- The extraction model has no tools and no access to other users' data, which limits prompt-injection impact.
- The LLM never decides eligibility or permissions. Those are SQL rules.
- One embedding per profile vibe, post and event is stored for semantic similarity, used as one ranking signal among several.
- Every extraction is logged (input hash, model, version, cost, outcome) for evaluation.

LLM and embedding provider: chosen after a 50-example evaluation covering English, Hinglish and other languages users write in (ADR to follow).

## Consequences
- The taxonomy is a product asset and needs an owner.
- A labelled evaluation set is built before the matching feature ships.
