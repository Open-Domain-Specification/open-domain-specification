---
name: sprint-plan
description: Plan a sprint goal and refine candidate issues into dispatchable user stories with Gherkin criteria and a sprint label. Complete before sprint-start.
---

# Sprint Plan

## Write boundaries — default deny

Planning permits only these external writes, within the user's authorization:

- Create `sprint::<goal-slug>` if absent; apply or remove it on candidate issues.
- Rewrite candidate descriptions after preserving the originals as issue notes.
- Create issues only for scenario splits or decisions extracted from a candidate.
- Retitle only the original issue of a split, to its narrowed scope.
- Post issue notes; do not mention yourself.

Everything else requires operator authorization. Do not create the tracking issue, close/delete issues, apply `workflow::*` labels, choose design/scope options for the operator, or edit repository files, commit, or push. Read-only inspection is permitted. Draft in a unique scratch directory outside the repository; remove it during the same session and never commit it.

## 1. Establish the goal

Obtain an explicit, testable, one-sentence goal in the operator's words; do not infer it. Obtain the tracking issue and record the goal verbatim there. If none exists, ask the operator to create one; do not proceed without it. Reuse answers already supplied.

Derive `sprint::<goal-slug>`. Inspect open issues and existing labels using the repository's tracker. Include work and prerequisites needed for the goal; identify adjacent work excluded from this sprint.

## 2. Refine candidates

Each selected story must have:

1. A beneficiary, desired capability and reason: “As a …, I want …, so that …”.
2. At least one named Gherkin `Scenario:` with concrete `Given`, one `When`, and an externally observable `Then`. Cover relevant failure paths and boundaries.
3. No unresolved implementation decisions or unverified assumptions.
4. An expected file footprint sufficient to identify overlaps and dependencies.
5. `sprint::<goal-slug>`, applied only after the other checks pass.

Write the refined story in the **issue description**, with Story, Acceptance criteria, Out of scope and Footprint sections. First post the complete original description as a preservation note and confirm success before replacing it.

Verify assumptions and record evidence. Define ambiguous terms and required limits, timeouts or thresholds. Bring design/scope choices and their costs to the operator; record both the ambiguity and their resolution. A decision may be extracted into a prerequisite issue, but dependent work stays unlabelled until resolved. Record dependencies in both descriptions, file overlaps, and choices that could invalidate other stories. `sprint-start` owns dispatch sequencing.

## 3. Split oversized stories

Size a story for one agent, one dispatch and one merge request. Split by observable scenario, never by technical layer. Each child gets its own scenarios, narrowed footprint and explicit directional dependencies in both issue descriptions (`blocks #N` / `blocked by #N`); tracker links alone may not preserve direction. Label only children that pass the readiness bar.

Either narrow the original into one child, preserving its number and history, or leave it unlabelled with a note linking its replacements. Never label both a parent and its children. Before retitling a narrowed original, record its old title and sibling links in a split note; preserve its original description before rewriting.

## 4. Label and hand over

Apply the sprint label only to ready stories; remove it from candidates that fail the bar and note what they need. Post one tracking-issue note containing the verbatim goal, ready story count and links, plus excluded/unready work with failed checks and required resolutions.

Hand over: `<N> stories · sprint::<goal-slug> · goal on #<tracking-issue>`.
