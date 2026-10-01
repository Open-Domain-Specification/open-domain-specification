---
status: Accepted
date: 2026-09-02
---
# Decision 07 — Ids are the JSON keys; names are labels

## Current position (2026-10-01)

The JSON key is the raw id, and the DSL takes an explicit raw `id` on every `add*`; neither stores an encoded ref segment. When omitted, an id is still derived from the name in snake case. Every explicit string id is preserved verbatim, including an empty string and every Unicode spelling, without trimming, case folding, normalisation, rejection or silent replacement by a name-derived id. Each id occupies one canonical-ref segment, encoded with JSON Pointer escaping (`~` to `~0`, then `/` to `~1`). Thus raw `a/b~c` becomes segment `a~1b~0c`, while raw `a~1b~0c` becomes the distinct `a~01b~00c`. A complete ref embedded inside a consumption ref is encoded once again at that boundary. Canonical model refs remain separate from URL fragments and Markdown filenames, which encode their own transport layer. There are no aliases for the former unescaped or flattened forms.

Derived identities keep their established meaning under unambiguous segmented grammars: an answer is `<operation ref>/returns`, `/completed`, or `/rejects/<encoded schema context>/<encoded schema>[/<encoded reason>]`; a relationship is `#/relationships/<encoded source>/<type>/<encoded target>[/<encoded snake-case name>]`; and a consumption is `<consumer ref>/consumes/<encoded full consumable ref>[/by/<encoded full first caller ref>]`, with the caller discriminator only where the existing multiple-consumption rule requires it. An empty refusal reason still means the shape-level refusal. A ref that names nothing is an `unresolved-ref` diagnostic, not a load failure (decision 29, card 100). No diagnostic nudges toward explicit ids. The note of 2026-09-08 still holds: a composite or natural key is a value object typing an identity attribute, and no rule refuses it.

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

## Amendment (2026-10-01)

Raw ids were previously interpolated directly into slash-delimited refs. That made the representation non-injective: an operation whose id contained `/rejects/` could acquire the same string as another operation's refusal answer, and the resolver could not recover which identity the author meant. In context `b`, service `h`, operation A with id `a` refusing schema `decline` for reason `completed` and operation B with id `a/rejects/b/decline` completing both used to be `#/boundedcontexts/b/services/h/provides/a/rejects/b/decline/completed`. Every id-bearing position now escapes one raw id as one JSON Pointer segment. A keeps that structured refusal suffix; B is `#/boundedcontexts/b/services/h/provides/a~1rejects~1b~1decline/completed`. Literal tilde escapes remain distinct because the tilde itself is escaped first.

The same boundary applies to all path ids, including a context, provider, operation, attribute and deadline, and to the ids inside the derived answer, relationship and consumption grammars stated in the current position. Nested full refs in a consumption are escaped again once because the full ref is one component of the outer identity. All raw string ids remain valid data, so the fix introduces no identity diagnostic or load exception and preserves decision 29's rule that a model mistake does not prevent loading. The price is a deliberate bookmark change for refs containing escaped ids and for every relationship and consumption under the retired flattened grammars. Because canonical refs are part of the workspace wire format and no old spelling is an alias, this contract is metamodel version 3.0.0 (decision 29, note of 2026-10-01). Generated documentation filenames and URL fragments apply their own reversible transport encoding; those spellings are not canonical model identity. Reopening this choice requires an equally injective grammar across every producer and reader, not a delimiter heuristic. Existing natural and composite-key guidance does not change.
