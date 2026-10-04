# 29. A mistake is a diagnostic, not a crash

Date: 2026-09-09

## Status

Accepted

## Current position (2026-10-04)

Loading never throws on a model mistake and `unresolved-ref` reports the reference at the referencing element; the DSL still throws for a programming error; stable (card 100). The consequence that a bad reference does not survive a round trip no longer holds; see the note of 2026-09-09 (card 102): it survives on every element that can hold one, and the four that cannot, a consumption's `consumable`, a relationship's two ends, a relation's `target`, and `by` recorded at the consumer, are a named cost.

Of the rule gaps the decision lists, two are superseded. `context-invariant-is-checked` allows `precondition` and `postcondition` on a context invariant and refuses only one that names no guard (correction of 2026-09-10; decision 27, card 103). `mud-needs-acl` no longer counts an identity into a big ball of mud; it reads consumptions, and a held key is not one (decision 28's second amendment of 2026-09-10, cards 107 and 108; verified in `packages/core/src/validate.ts`, `mudNeedsAcl`). The others stand: an external context states no internal operations (decision 28), `aggregate-tree` refuses `references` onto a value object, an aggregate does not consume another aggregate's operation in its own context (decision 17), and `separate-ways` covers identity and borrowed-value crossings.

For `separate-ways`, a borrowed-value crossing is every declaration already used to prove that a shared kernel is backed: a foreign value object used by an attribute or as a specialisation parent, and a foreign schema used by an attribute, request, return or rejection. A relationship that permits the borrowing does not cancel the contradictory declaration that the contexts go separate ways (note of 2026-10-01, second).

`odsVersion` is a constant core writes, now `3.0.0`, with an `ods-version` diagnostic on a differing or missing major. Version 3 deliberately replaces the accepted wire grammar for refs: every raw id is encoded as one segment, and answers, relationships and consumptions use the complete segmented grammars recorded in decisions 07, 23, 25 and 26, with no aliases for the former ambiguous forms (note of 2026-10-01). The number is bumped by the decision that breaks the metamodel; the earlier note of 2026-09-10 records why version 2 was introduced and the bumps decisions 01, 02, 03, 08 and 09 promised were never made.

Since then (card 132): `unknown-field` reports unknown keys inside nested objects too, with the path; the `mud-needs-acl` item of the decision list is superseded by decision 28 (correction).

Since 2026-10-04 (decision 08's set; note of 2026-10-04 below): a ref that names another file is an `unresolved-ref` with one of four causes, and in the four lists above an entry whose ref has a path before its `#` is kept raw at its index when it fails, so the named cost now holds only for a local ref that names nothing; the loader still takes a `WorkspaceSchema`, so a host checks the shape of a file before loading and core claims no throw-free handling of arbitrary malformed input; `odsVersion` stays `3.0.0`.

## Context

A workspace written by hand, in the extension or in JSON, will contain typos. Until card 100 the loader threw on the first unresolvable reference, so an author lost every other diagnostic to one bad ref, while the same mistake made through the DSL produced a rule violation. Decision 26 had stated the principle for one field. The sixth architect review reproduced eleven sites where it did not hold.

## Decision

- Loading never throws on a model mistake. Every reference the loader resolves, in `on`, `starts`, `ends`, `from`, `by`, `identifies`, `constrains`, `valueobject`, `schema`, `returns`, `rejects`, `consumable`, `raises`, `then`, `target`, `specialises`, `team`, `subdomains`, `embodiedBy` and relationship ends, that names nothing or the wrong kind leaves the link unset and is recorded; `unresolved-ref` (error) reports it at the referencing element, and every other rule still runs.
- The DSL still throws for a programming error, a wrong type passed where the compiler could not catch it, because that is the author's code, not the model.
- The same review's reproduced rule gaps are closed with it: a context invariant is always a check (`context-invariant-is-checked` refuses `precondition` and `postcondition` on it); an external context states no internal operations; `aggregate-tree` refuses `references` onto a value object; `mud-needs-acl` counts an identity into a big ball of mud; an aggregate does not consume another aggregate's operation in its own context; `separate-ways` covers identity and borrowed-value crossings with its own error.

## Consequences

- A named cost: a bad reference does not survive a round trip. `toSchema` writes the unset link, so opening and saving a file with a typo drops the typo silently; keeping it would mean storing the raw ref on the element (card 102).
- The extension's problems panel shows an unresolved ref where the typo is, which is where an author wants it.

## Note (2026-09-09)

A bad reference now survives a round trip on every element that can hold one (card 102). Four cannot, and that is a named cost: a consumption's `consumable`, a relationship's two ends and a relation's `target` are the pair they join, so nothing exists to hold a reference that resolved to nothing, and a consumption's `by` is recorded at the consumer where the diagnostic belongs. An author fixing one of those four fixes it in the file before the model has a place for it, which is where the problems panel points anyway.

## Correction (2026-09-10)

The decision list above says `context-invariant-is-checked` refuses `precondition` and `postcondition`; decision 27's third amendment allows both on a context invariant and refuses only one that names no guard at all, and the rule does that (card 103). The sentence stands as written on the day and this correction is the record.

## Note (2026-09-10)

Decisions 01, 02, 03, 08 and 09 each promise that `odsVersion` bumps on a breaking change; it has read `1.0.0` since the first commit and nothing compared it, so a file written against an older metamodel failed as `unresolved-ref` or rule errors rather than as what it was. The version is a constant core writes, `2.0.0` for everything since, and a file whose major differs or that has none gets an `ods-version` diagnostic that names the mismatch and still loads what it can; the number is bumped by the decision that breaks it, from here on (card 114, architect's ninth round).

## Correction (2026-09-10, second)

The decision list's `mud-needs-acl` item, counting an identity into a big ball of mud, is superseded: the rule reads consumptions and a held key is not traffic (decision 28, cards 107 and 108). The sentence stands as written on the day.

## Note (2026-09-10, second)

`unknown-field` (card 121) read element-level keys only, so an unknown key inside a `$ref` object, `returns: { $ref, reasons }`, loaded with no diagnostic and was dropped on the round trip in silence, which this record says a mistake never is. Every nested object the loader reads is checked (card 132, architect's fifteenth round).

## Note (2026-10-01)

The canonical ref grammar is part of the workspace wire format. Raw ids had been interpolated into path strings and derived relationship and consumption refs had been flattened with delimiters those identities could also contain. Two admitted identities could therefore write the same ref. Version 3.0.0 replaces those spellings with one JSON-Pointer-escaped segment per raw id and explicit segmented grammars for answers, relationships and consumptions (decisions 07, 23, 25 and 26). The old forms are not aliases: an ambiguous string cannot carry which identity its author intended.

This is the breaking metamodel change the 2026-09-10 note says increments the major. Core writes `odsVersion: "3.0.0"`; a file with version 2 gets the existing `ods-version` diagnostic and still loads what version 3 can read, preserving this decision's diagnostic-not-crash rule. Authors regenerate DSL output or bring hand-written JSON to the version 3 grammar before changing its declared version. Package versions remain independent of the metamodel number.

## Note (2026-10-01, second)

The `separate-ways` rule originally checked a foreign value object only when an attribute named it. That left the same language dependency unreported when it came through value-object specialisation or through a foreign schema in an attribute, request, return or rejection, even though those declarations already backed a shared kernel. The rule now reads that complete declaration inventory and reports the declaration introducing the crossing. It does not infer another crossing from members reached through a specialisation or composition. A shared kernel, conformist role or customer-supplier relationship may permit a borrowing, but it does not erase a simultaneous `separate-ways` declaration; the declarations contradict each other until the borrowing or the separate-ways relationship is removed.

## Note (2026-10-04)

Loading a set follows this rule and states its limits.

- **A file reference is a diagnostic.** A ref that names another file and fails, because its path is invalid, the file is not in the set, the file has no such element or the element is the wrong kind, leaves the link unset and is an `unresolved-ref` at the element that wrote it, with the cause in the message. A workspace loaded alone has no set, so every qualified ref is "no such file". The host's mistakes are diagnostics of the set too: `file-path-invalid` for a path it offered that cannot be accepted or was offered twice, and `workspace-id-unique` for a second file that claims an id.
- **The named cost is scoped, not removed.** The four lists whose entry is the pair it joins, a consumption's `consumable` in a consumer's `consumes`, a relationship's two ends, a relation's `target` and a consumption's `by`, kept nothing for a ref that resolved to nothing. For a ref that has a path before its `#`, whatever happens to that path (invalid, no such file, no such element, the wrong kind), the whole entry is now kept raw, with every key it had, at the index it had in the list (clamped when the list is shorter), and written back untouched. It is not reported as an unknown field, because it is not dropped, and it links again as soon as what it names is there. A local ref in those lists that names nothing keeps exactly the cost this record names: the entry is not kept and a save drops it. An unknown key on an entry that does resolve is still dropped, and still reported by `unknown-field`. Nothing is retained outside the four lists, which already keep an unresolved ref on the element that wrote it.
- **The loader still assumes a shape.** "Loading never throws on a model mistake" is a statement about the model. The loader is typed against `WorkspaceSchema`, and JSON that is not one, however deep (`null` or an array as a file, a context whose `aggregates` hold a number, a relationship entry that is `null`, a `consumes` entry whose `consumable` is a string), can still make it throw. Core does not claim that arbitrary malformed input is survived; a host that reads files checks the shape first, catches what still throws and reports the file as a problem of that file, as the extension does (decision 08, amendment of 2026-10-04, fourth).
- **A hand-edited unknown field survives only where it is kept.** The cost the 2026-09-10 note names for `unknown-field` is unchanged and applies to every file of a set: an owning-file write by the extension drops unknown fields on the entries that resolve, and keeps them on the retained qualified entries.
- **`odsVersion` stays `3.0.0`.** The wire widening of a `$ref` string bumps nothing.

## Note (2026-10-04, second): what a surviving reference carries

"Survives a round trip on every element that can hold one" (note of 2026-09-09 and the Current position's reading of it) means the `$ref`, and only that. An element keeps the raw ref it wrote, so a failing `returns` or `schema` is written back as `{ $ref }` without its `many`, and a failing `rejects` entry without its `many` or `reasons`; a failing `raises` entry is a bare `{ $ref }` already. A key written beside a ref that resolves to nothing has no resolved shape to describe, so it is not retained. Nothing was changed to widen this; it is the boundary of the cost the record names, stated precisely.
