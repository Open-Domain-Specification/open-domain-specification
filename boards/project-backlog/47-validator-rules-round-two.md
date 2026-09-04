---
column: todo
labels: [backend, ddd]
priority: high
agent: ironhide
updatedAt: 2026-09-06T12:00:00.000Z
---
# Validator rules the model states but never enforces

From the Antigravity baseline (scratchpad agy-baseline.md, issues 9, 10, 11, 13, 14, 15, 16) and run 2 (agy-run2.md, issues 15, 17, 18). Each is a rule with a catalogue entry (why, fix), tests for the passing and failing shapes, and the reference models checked and corrected.

## Checklist

- [ ] `root-identity` (error): an aggregate's root entity declares at least one `identity: true` attribute
- [ ] `value-object-shape` (error): a value object's attributes are never `identity: true`, and a value object's relations are never `includes`
- [ ] `aggregate-tree` (error): within an aggregate, `includes` forms a tree from the root: no cycles, no entity included by two parents, `includes` targets entities only, `uses` targets value objects only (decision 10's conventions)
- [ ] `relationship-roles-backed` (warning): a directed relationship's declared upstream roles are each carried by at least one consumable crossing from upstream to downstream between those two contexts, and its downstream roles by at least one consumption; and a crossing consumption's pattern is declared on the relationship
- [ ] `mud-needs-acl` (warning): a consumption from a context marked `bigBallOfMud` whose pattern is `conformist` or absent
- [ ] `attribute-relation-coherence` (warning): an attribute typed by a value object without a `uses` relation to it, a `uses` relation without an attribute, and an array-typed attribute (`X[]`) whose relation cardinality is `1` or `0..1`
- [ ] `role-coherence` no longer warns on a consumption between two contexts that declare a `partnership` or `shared-kernel` relationship: symmetric partners carry no upstream or downstream role (Antigravity run 2, issue 15)
- [ ] `term-in-context` (error): a glossary term's `embodiedBy` names an element of the term's own context (run 2, issue 17)
- [ ] `separate-ways` also walks policy subscriptions: a policy `on` an event of a context the policy's context has gone separate ways from is the same error as a consumption (run 2, issue 18)
- [ ] Skill references regenerated; `docs/` validation page lists the new rules; four models validate with the intended diagnostics only (petstore clean)

## Comments

- **lead** (2026-09-06T12:00:00.000Z): Assigned to dev-opus after cards 44 and 45 land (the lead will say); they own `schema-context`, `returns-on-operation` and `cross-context-relation`. Fixed by decision: severities as listed; a rule never fires on a model element outside the file it is in; messages name both elements. Work in your worktree with absolute paths; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
