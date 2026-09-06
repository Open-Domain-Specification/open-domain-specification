---
status: Proposed
date: 2026-09-06
---
# Decision 14 — A relation never crosses a bounded context; only an identity does

## Current position (2026-09-10)

Status is Proposed. `cross-context-relation` refuses a relation into another context and the identity attribute is the crossing; stable. Since the amendment of 2026-09-06 (card 54) the attribute says which boundary through `identifies`, which may name any entity anywhere, child or root, in its own context or another (amendments of 2026-09-07, card 67, and 2026-09-08 third, card 91, which reversed card 90's refusal of a same-context child), an external context (2026-09-08, card 81), or a schema an external context publishes (decision 28's third amendment of 2026-09-10, card 113). `identifies-entity` checks only that the target is of this workspace.

The decision's sentence that the consumable map is where the dependency reads no longer holds; see the amendment of 2026-09-07 (card 70): the context map draws it as an implied «id» edge.

The consequences' sentence that `relationship-declared` asks for the relationship behind an identity crossing no longer holds; see the amendment of 2026-09-09 (card 100): the «id» edge is its own record, and a relationship is declared where something is exchanged or a language is borrowed. `relationship-declared` reads entity and value-object attributes only, never a payload's echoed id (2026-09-08 second, card 90). `mud-needs-acl` likewise reads consumptions, not a held key (decision 28, cards 107 and 108). Two named costs stand: `identifies` is opt-in, and a denormalised copy of another context's fact is invisible unless its carrying event is modelled (2026-09-09).

## Context

The `cross-aggregate-reference` rule checks that a relation into another aggregate targets that aggregate's root, but not that both aggregates share a bounded context. Petstore's `Order` (Sales BC) holds a `references` relation to `Pet` (Catalog BC) at `models/petstore/src/workspace.ts:452`, while also holding the `petId` attribute that is, by its own description, the only thing that crosses the boundary. Decision 08 says an `EntityRelationSchema.target` may not cross a file, so the same model becomes a load error once its contexts are split. The aggregate page already promises "references to other aggregates are by identity only", a rule the validator does not enforce. Raised in an external review; confirmed against `packages/core/src/validate.ts:70-86`.

## Decision

- A relation whose target entity belongs to another bounded context is a validation error, `cross-context-relation`, with a fix that names the identity attribute the source should hold instead.
- Crossing a context is an integration, and the model already has the vocabulary for it: the consumable the source consumes, the identity it stores, and the context relationship between the two. Nothing new is added.
- Petstore drops the `Order -> Pet` relation and keeps `petId`; the context map, not the relation map, is where that dependency reads.
- Decision 08's rule that `EntityRelationSchema.target` may not cross a file is now implied and consistent.

## Amendment (2026-09-06)

Removing the relation removed the only structural record that `Order` depends on Catalog's `Pet`; a description is not something tooling can trace. `AttributeSchema.identifies?: { $ref }` names the entity an identity attribute identifies, in any context, and the relation map draws it as a dashed edge across the boundary. The attribute stays the boundary; it now says which boundary. Card 54.

## Consequences

- One new rule and catalogue entry; no schema change. Any existing model with a cross-context relation fails validation and must move to an identity attribute, which is the DDD reading anyway.
- The aggregate relation map loses cross-context relations; an identity across contexts is drawn as an implied edge on the context map, with `relationship-declared` asking for the relationship behind it (card 70).
- Skill reference regenerated from the rule catalogue.

## Amendment (2026-09-07)

The first rule required the identified entity to be a root. The architect review showed that is false to real systems: a playback session identifies a profile inside a household, a claim identifies a coverage inside a policy, an appeal identifies a decision inside a case, and each child stays inside its aggregate precisely because its parent's invariants need it there. An identity may name any entity; when it names a child, the dependency is on the aggregate reached through that child's root, and the map draws the edge to the child inside its cluster. `identifies-root` becomes `identifies-entity` (card 67).

The mechanics: `identifies-entity` checks the target is an entity of this
workspace and nothing more, since root or child is now the modeller's call, and
`cross-context-relation`'s fix text stops promising a root. The relation map
needs no new node kind — the identity edge already lands on the entity named,
and a child's node carries its own aggregate's namespace, so it draws inside
that cluster beside the root it is reached through.

## Amendment (2026-09-07, card 70)

The Decision above said the consumable map is where the dropped relation's
dependency reads. It is the context map, as the Consequences already said: an
identity across a boundary needs no consumable, so the consumable map has
nothing to draw when nothing is consumed. The sentence is corrected. The
context map now draws such a dependency as an implied edge under an `«id»`
stereotype, and `relationship-declared` asks for the relationship behind it.

## Amendment (2026-09-08)

An identity may also name an external context (decision 28): a card scheme's authorisation id or a payment provider's customer id is an id in a system whose entities are not ours to state, and the attribute says which system. The map draws the dependency to that context (card 81).

## Amendment (2026-09-08, second)

An identity held by an entity is the context's dependency on another context's identity scheme and asks for a relationship. An identity echoed in a payload, a correlation id on an event or a request, is not: the payload carries it for its reader and the context holding the schema owes the other nothing. `relationship-declared` reads entity and value object attributes only (card 90); the sixteen empty-role relationships the models added for echoed ids were the rule's invention and come out.

## Amendment (2026-09-08, third)

Card 90 refused an identity naming a child of another aggregate in the same context, calling it a side door around reference-by-root. Codex's review put it right: a shipment holds an order's id and the line's id beside it, and that pair is exactly how DDD points at a child without a relation; the relation is what `cross-aggregate-reference` refuses, the id is what it recommends. `identifies` accepts any entity anywhere (card 91).

## Amendment (2026-09-09)

An identity crossing is its own record. The context map draws it as the «id» edge, and asking for a typed relationship on top produced fourteen upstream-downstream relationships with no roles, a shape DDD does not have, each with a comment saying nothing is exchanged. `relationship-declared` no longer asks (card 100); a relationship is declared where something is exchanged or a language is borrowed. Two named costs stay: `identifies` is opt-in, so the record is as complete as the author's diligence, which the skill's playbook rule and the reference models' sweeps address but no rule can; and a denormalised copy of another context's fact, a seller rating held on an offer, is invisible unless the author models the event that carries it.
