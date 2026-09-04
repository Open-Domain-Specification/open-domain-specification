---
column: todo
labels: [backend, ddd]
priority: high
agent: dev-opus
updatedAt: 2026-09-06T10:00:00.000Z
---
# A relation never crosses a bounded context

Implements [decision 14](../../decisions/14-cross-context-relations-are-identities.md): a new `cross-context-relation` error, petstore moved to identity-only, docs and skill following.

## Checklist

- [ ] `packages/core/src/validate.ts`: `cross-context-relation` errors when a relation's target entity belongs to another bounded context, message naming both contexts, fix naming the identity attribute to hold instead; catalogue entry; tests including the same-context case that must still pass
- [ ] Petstore: remove `orderRoot.references(petRoot, ...)` at workspace.ts:452, keep `petId`, and make sure the Sales to Catalog dependency still reads on the consumable map; petstore validates clean; the other three models checked for the same pattern
- [ ] Decision 08's table and decision 03 cross-referenced from the new rule's why; `docs/` DDD page on aggregates mentions identity-only references
- [ ] Skill references regenerated from the catalogue; the interview's Phase E asks "which id does it hold?" for a foreign aggregate
- [ ] Pages: the aggregate relation map shows no cross-context edge for petstore; `assertDocSite` green; root suites green inside the worktree

## Comments

- **lead** (2026-09-06T10:00:00.000Z): Assigned to dev-opus. Fixed by decision 14; read it first. No schema change. Card 44 runs in parallel and owns `schema.ts`, `workspace.ts`, the `schema-context` rule and the petstore operations; you own the `cross-aggregate-reference`/`cross-context-relation` rules and petstore line 452. Merge develop before your final run. Work in your worktree; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
