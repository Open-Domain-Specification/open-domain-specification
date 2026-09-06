# 29. A mistake is a diagnostic, not a crash

Date: 2026-09-09

## Status

Accepted

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
