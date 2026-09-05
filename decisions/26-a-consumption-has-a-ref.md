# 26. A consumption has a ref of its own

Date: 2026-09-07

## Status

Accepted

## Context

A consumption is a strategic intent: it carries a pattern, comments and a disposition, and four rules judge it (`role-coherence`, `mud-needs-acl`, `disposition-needs-comment`, `consumption-by-resolves`). It is the one element without a ref, so every one of those rules reports at the consumer node, and a reader with three consumptions on one service cannot tell which the diagnostic means. Two cards flagged it in passing.

## Decision

- A consumption's ref is derived from the pair it joins, consumer and consumable, in the existing ref grammar, so it is stable across edits and never an array index. The exact form is the implementer's, written in the ref grammar reference, and round-trips through `toSchema`/`fromSchema` unchanged because it is computed, not stored.
- Every rule that judges a consumption reports at that ref. The extension maps the ref to the consumption's position in the JSON file, as it maps every other ref.
- A consumption has no page of its own; the ref resolves to the consumer's page, anchored at the consumption's row, the same as an attribute resolves to its owner.

## Consequences

- Core: `Consumption.ref`, the lookup by ref, the four rules' `ref`, tests. Extension: ref-to-position for array elements under `consumes`. Pages: the row anchor and the flash on arrival that other leaf refs already have. Skill reference: the grammar line.
- No schema change; a `feat`, not `feat!`.
