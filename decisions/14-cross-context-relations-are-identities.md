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

## Consequences

- One new rule and catalogue entry; no schema change. Any existing model with a cross-context relation fails validation and must move to an identity attribute, which is the DDD reading anyway.
- The aggregate relation map loses cross-context edges; the consumable map carries them.
- Skill reference regenerated from the rule catalogue.
