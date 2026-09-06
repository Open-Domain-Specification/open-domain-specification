# 29. A mistake is a diagnostic, not a crash

Date: 2026-09-09

## Status

Accepted

## Current position (2026-09-10)

Loading never throws on a model mistake and `unresolved-ref` reports the reference at the referencing element; the DSL still throws for a programming error; stable (card 100). The consequence that a bad reference does not survive a round trip no longer holds; see the note of 2026-09-09 (card 102): it survives on every element that can hold one, and the four that cannot, a consumption's `consumable`, a relationship's two ends, a relation's `target`, and `by` recorded at the consumer, are a named cost.

Of the rule gaps the decision lists, two are superseded. `context-invariant-is-checked` allows `precondition` and `postcondition` on a context invariant and refuses only one that names no guard (correction of 2026-09-10; decision 27, card 103). `mud-needs-acl` no longer counts an identity into a big ball of mud; it reads consumptions, and a held key is not one (decision 28's second amendment of 2026-09-10, cards 107 and 108; verified in `packages/core/src/validate.ts`, `mudNeedsAcl`). This record has no correction for it. The others stand: an external context states no internal operations (decision 28), `aggregate-tree` refuses `references` onto a value object, an aggregate does not consume another aggregate's operation in its own context (decision 17), and `separate-ways` covers identity and borrowed-value crossings.

`odsVersion` is a constant core writes, `2.0.0`, with an `ods-version` diagnostic on a differing or missing major, bumped from here on by the decision that breaks it (note of 2026-09-10, card 114); the bumps decisions 01, 02, 03, 08 and 09 promised were never made.

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
