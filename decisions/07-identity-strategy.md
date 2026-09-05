---
status: Accepted
date: 2026-09-02
---
# Decision 07 — Ids are the JSON keys; names are labels

## Context

Refs are string paths built from ids, and ids defaulted to a snake-cased
name. The schema loader ignored the JSON object keys and re-derived ids from
names, so a document whose keys differed from `snakeCase(name)` could not be
loaded, and renaming anything in the DSL changed every ref beneath it. See
board card 15.

## Decision

- The JSON object key *is* the id. `Workspace.fromSchema` passes each key as
  the element's `id`, so a document round-trips regardless of naming.
- In the DSL every `add*` call accepts an explicit `id`; when omitted the id
  is derived from the name as before. Authors who want rename-stable refs set
  `id` explicitly.
- Decision 02 already removed domain and subdomain names from every
  context-owned ref, so the blast radius of a rename is now limited to the
  element itself and its descendants.
- No diagnostic nudges authors toward explicit ids: it would need every
  element to remember whether its id was given or derived, and the JSON keys
  already make the id visible wherever it matters.

## Consequences

- No schema change.
- Opaque, generated ids were rejected: they make hand-written and reviewed
  JSON unreadable, which matters more for a specification than rename safety.

## Note (2026-09-08)

A composite or natural key is a value object, and an entity's identity attribute may be typed by one: `id: LedgerAccountId` with `identity: true` and `valueobject` naming the value, whose own attributes are the key's parts. No rule refuses it; a review claimed otherwise and a probe against the built core validates it clean. `value-object-shape` only refuses `identity: true` on the value object's own attributes, because a value has no identity of its own.
