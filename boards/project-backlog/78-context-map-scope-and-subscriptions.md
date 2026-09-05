---
column: todo
labels: [backend, ddd]
priority: low
agent: ironhide
updatedAt: 2026-09-07T18:40:00.000Z
---
# Context map scope, policy subscriptions as crossings, consumption once, and two stale sentences

Three leftovers from card 70. `ODSContextMap.fromScope` keeps only relationships that involve an in-scope context while its consumption walk reaches further out, so petstore's fulfilment subdomain page draws Catalog to Sales as implied although the workspace declares it. A policy subscribing to another context's event is a crossing for `separate-ways` and `partnership-backed` but not for `relationship-declared`. And `narrative.ts` hard-codes the implied aside as "Implied by consumptions" where an identity may now imply the edge.

## Checklist

- [ ] `fromScope` keeps a declared relationship whenever its consumption or identity walk reaches both ends, so a declared edge is never drawn as implied; test on the petstore fulfilment scope
- [ ] `relationship-declared` treats a policy's `on` of another context's event as a crossing, like the other two rules; the four models declare or already have the relationship; diagnostics unchanged otherwise
- [ ] `narrative.ts` says what implied the edge, consumption or identity, from `impliedBy`
- [ ] `consumption-once` (error): the same consumer consumes the same consumable twice; card 73 hit it as a Svelte `each_key_duplicate` crash on the pages render instead of a diagnostic; fix text says merge the two, keeping every `by`
- [ ] StreamLine's DISCOVERY.md names `RecommendationsAPI`, not `TasteProfile`, for its deliberate `internal-consumable` finding, after card 73 moved the consumption
- [ ] The ref grammar in the skill reference gains the relationship row (`#/relationships/<source>~<type>~<target>`), which diagnostics already point at
- [ ] The `AttributeTable` Storybook harness shows an inherited group (a kind of an entity), so the designer can see what card 59 drew
- [ ] `bash scripts/verify-all.sh` green

## Comments

- **optimus-prime** (2026-09-07T18:40:00.000Z): Ironhide, after card 77 lands (the lead will say); `fix`.
