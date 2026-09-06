# 26. A consumption has a ref of its own

Date: 2026-09-07

## Status

Accepted

## Current position (2026-09-10)

A consumption's ref is derived from consumer and consumable and round-trips because it is computed; stable. Two qualifications since. One consumer may consume one consumable more than once when the exchanges differ; each such consumption names a non-empty, mutually disjoint `by`, `consumption-once` asks for it, and the ref appends the first caller's id only when the pair is not unique, so the ref changes when a second consumption of the pair appears, a named cost (amendment of 2026-09-08, card 89; correction of 2026-09-10). The decision bullet that every rule judging a consumption reports at its ref no longer holds; see the correction of 2026-09-10: `separate-ways`, `internal-consumable`, `relationship-declared` and the two consumes-inside rules report at the consumer node. A consumption still has no page of its own. Related: a consumption's `consumable` ref is one of four that cannot survive a round trip when it resolves to nothing (decision 29, card 102), and a consumption between a pair with two named relationships names its `relationship` (decision 15, card 107).

## Context

A consumption is a strategic intent: it carries a pattern, comments and a disposition, and four rules judge it (`role-coherence`, `mud-needs-acl`, `disposition-needs-comment`, `consumption-by-resolves`). It is the one element without a ref, so every one of those rules reports at the consumer node, and a reader with three consumptions on one service cannot tell which the diagnostic means. Two cards flagged it in passing.

## Decision

- A consumption's ref is derived from the pair it joins, consumer and consumable, in the existing ref grammar, so it is stable across edits and never an array index. The exact form is the implementer's, written in the ref grammar reference, and round-trips through `toSchema`/`fromSchema` unchanged because it is computed, not stored.
- Every rule that judges a consumption reports at that ref. The extension maps the ref to the consumption's position in the JSON file, as it maps every other ref.
- A consumption has no page of its own; the ref resolves to the consumer's page, anchored at the consumption's row, the same as an attribute resolves to its owner.

## Consequences

- Core: `Consumption.ref`, the lookup by ref, the four rules' `ref`, tests. Extension: ref-to-position for array elements under `consumes`. Pages: the row anchor and the flash on arrival that other leaf refs already have. Skill reference: the grammar line.
- No schema change; a `feat`, not `feat!`.

## Amendment (2026-09-08)

One consumer may consume one consumable more than once when the exchanges differ, an archive that takes a provider's response as it is and a decision that translates it through an anti-corruption layer, each with its own pattern and disposition. The pair alone then no longer identifies a consumption: every such consumption names a non-empty, mutually disjoint `by`, `consumption-once` asks for exactly that, and the ref appends the first caller's id only when the pair is not unique, so the single-consumption ref stays as it was (card 89).

## Correction (2026-09-10)

Not every rule that judges a consumption reports at its ref: `separate-ways`, `internal-consumable`, `relationship-declared` and the two consumes-inside rules report at the consumer node, because their subject is the consumer's position rather than one exchange. And a consumption's ref changes when a second consumption of the same pair appears, since only then does it need the caller's name; that is a named cost of deriving the ref from the pair.
