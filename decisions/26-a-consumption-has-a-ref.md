# 26. A consumption has a ref of its own

Date: 2026-09-07

## Status

Accepted

## Current position (2026-10-04)

A consumption's ref is derived from the complete canonical refs of the consumer and consumable: `<consumer ref>/consumes/<encoded full consumable ref>`. The nested consumable ref is one component of the outer identity, so it is JSON-Pointer-escaped once more, including the tildes and slashes already present in it. One consumer may consume one consumable more than once when the exchanges differ; each such consumption names a non-empty, mutually disjoint `by`, `consumption-once` asks for it, and the ref appends `/by/<encoded full first caller ref>` only when the pair is not unique. The full caller ref replaces the former local caller id while preserving the existing discriminator-only-for-a-multiple rule and its named cost: a single ref changes when a second consumption of the pair appears. No legacy flattened ref is an alias (amendment of 2026-10-01).

The decision bullet that every rule judging a consumption reports at its ref no longer holds; see the correction of 2026-09-10: `separate-ways`, `internal-consumable`, `relationship-declared` and the two consumes-inside rules report at the consumer node. A consumption still has no page of its own. Related: a consumption's `consumable` ref is one of four that cannot survive a round trip when it resolves to nothing (decision 29, card 102), and a consumption between a pair with two named relationships names its `relationship` (decision 15, card 107).

Since 2026-10-04 the consumable and first caller a consumption embeds are the refs the consumer's own file writes, qualified by the relative wire path when they are in another file, and escaped as one segment as before; a relationship with an end in another file has a seven or eight segment ref (amendment of 2026-10-04).

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

## Amendment (2026-10-01)

The first implementation flattened a consumable ref by replacing `/` with `~` and, for a repeated pair, appended only the first caller's local id. Neither form was injective once authored ids could contain the chosen delimiters, and the partial caller identity could merge callers with the same id under different owners. A consumption now embeds the complete consumable ref as one JSON Pointer-escaped segment and, where the existing multiplicity rule requires a discriminator, appends `/by/` plus the complete first caller ref escaped the same way. Encoding the full nested ref again is deliberate: it removes exactly one embedding layer when decoded and leaves the nested ref's own segment escapes intact.

Ordinary single-pair semantics and `consumption-once` do not change. The cost is that every consumption ref and bookmark changes from the flattened spelling, and repeated-pair refs carry a longer caller component. The old spelling is not accepted as an alias, so this wire change is part of metamodel version 3.0.0 (decision 29, note of 2026-10-01). Reopening this grammar requires another injective representation of both complete refs while preserving the same multiplicity rule.

## Amendment (2026-10-04)

A consumption's ref is `<consumer ref>/consumes/<encoded consumable ref>`, and the consumable ref it embeds is the one the consumer's own file would write. For a consumable in the consumer's file that is the local pointer, as before. For a consumable in another file it is the qualified ref, the relative wire path of that file written before the pointer, and the whole of it is one JSON Pointer-escaped segment, so the `#` and the slashes of the path are escaped by the same rule as every other nested ref. The same holds for a caller: `/by/<encoded caller ref>` carries the caller as the consumer's file writes it. Two consumptions of one provider by consumers with the same local id in two files are two consumptions with two refs, because the consumer ref and the file that holds it differ. The multiplicity rule and `consumption-once` are unchanged. A relationship's ref has a seven or eight segment form when an end is in another file: `#/relationships/<path>/<source>/<type>/<path>/<target>[/<name>]`, each path relative to the declaring file (`.` for that file) and each part one escaped segment, against five or six for a relationship between contexts of one file (decision 14 and decision 08, amendment of 2026-10-04).
