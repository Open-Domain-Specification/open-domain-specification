---
status: Proposed
date: 2026-09-06
---
# Decision 14 — A relation never crosses a bounded context; only an identity does

## Context

The `cross-aggregate-reference` rule checks that a relation into another aggregate targets that aggregate's root, but not that both aggregates share a bounded context. Petstore's `Order` (Sales BC) holds a `references` relation to `Pet` (Catalog BC) at `models/petstore/src/workspace.ts:452`, while also holding the `petId` attribute that is, by its own description, the only thing that crosses the boundary. Decision 08 says an `EntityRelationSchema.target` may not cross a file, so the same model becomes a load error once its contexts are split. The aggregate page already promises "references to other aggregates are by identity only", a rule the validator does not enforce. Raised in an external review; confirmed against `packages/core/src/validate.ts:70-86`.

## Decision

- A relation whose target entity belongs to another bounded context is a validation error, `cross-context-relation`, with a fix that names the identity attribute the source should hold instead.
- Crossing a context is an integration, and the model already has the vocabulary for it: the consumable the source consumes, the identity it stores, and the context relationship between the two. Nothing new is added.
- Petstore drops the `Order -> Pet` relation and keeps `petId`; the consumable map, not the relation map, is where that dependency reads.
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
