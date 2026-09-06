---
name: requirements-review
description: Review requirements, user stories and acceptance criteria for buildability across seven dimensions, with parallel reviewers for larger audits.
---

# Requirements Review

Judge whether a competent engineer can build the requirements without asking the author. Requirements state value to a person; include mechanisms only where their omission permits different implementations. Mark those exceptions `Decided` and treat them as binding.

## Scope

Read the whole requirement set, including for a one-line change: contradictions, overlap and dependencies cross files. For a whole-set audit, new slice or more than five changed requirement files, launch one reviewer per dimension in parallel; each reads the whole set. For smaller changes, review all seven dimensions yourself.

## Seven dimensions

1. **Language (ASD-STE100):** consistent terms and approved meanings, active voice, present tense, noun clusters of at most three words, and verbs instead of unnecessary `-ing` forms. Apply the 25-word sentence and six-sentence paragraph limits only to Gherkin steps and each story clause individually, not explanatory prose. For terminology drift, quote both uses and recommend one meaning.
2. **Stories:** name a real, declared person rather than “the system” or generic “user”; the `so that` expresses felt value, not a repeated `I want` or component mechanism.
3. **Gherkin:** scenarios must be executable tests of our behavior. Flag circular `Given` steps, unobservable `Then` steps, unbounded negatives, universal properties disguised as examples, assertions about another system, missing `When`, and requirements with no scenario that fails when unbuilt.
4. **Contradiction:** quote both incompatible statements. Check capability grants/denials, prose versus scenarios, scenarios against each other, `Decided` rows, and counts/indexes against actual content.
5. **Overlap:** identify duplicate ownership, scenarios or rules, coupled edits for one behavior, and requirements whose value is already covered. Propose which requirement keeps ownership and what the other becomes.
6. **Ambiguity:** describe two different systems competent engineers could build and substantiate both readings. Drop findings where only one reading survives careful reading. Prioritize undefined acceptance terms, missing thresholds or surfaces, and purposes with no observable meaning.
7. **Ordering and completeness:** establish the base case before exceptions; check dependencies on later slices, missing requirements needed by earlier slices, and forward references that do not support their claims.

## Evidence and report

- Quote exact sentences with file locations; paraphrase is not evidence. Include both sides for contradictions and both defensible readings for ambiguities.
- Score severity from 0–1: implementation-changing findings **> 0.5**, wording findings **≤ 0.5**. Rank blockers first; report wording separately as nonblocking.
- Exclude personal preferences, invented scope, stated non-goals, declared external dependencies and acknowledged gaps. Prefer consequential findings over nitpicks.
- Consolidate findings for the author. This is a read-only review: do not edit requirements or insert inline markers.
- End with `VERDICT: ACCEPT` or `VERDICT: REJECT — N blocking`. Accept a buildable set even when wording improvements remain.

## Stop divergence

If findings rise for two rounds, stop iterating. Recommend which remedy fits: relax the mechanism restriction, move mechanism into a design document, or freeze the buildable slice and mark the rest as intent.
