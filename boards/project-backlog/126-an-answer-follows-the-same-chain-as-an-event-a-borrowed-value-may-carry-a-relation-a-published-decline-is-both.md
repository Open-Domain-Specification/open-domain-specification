---
column: todo
labels: [backend, docs]
priority: medium
agent: senior-developer
live: true
updatedAt: 2026-09-10T23:50:00.000Z
---
# An answer follows the same chain as an event; a borrowed value may carry a relation; a published decline is both an answer and a fact

The architect's twelfth round found three things. `reachedEvents` follows `by` through any number of local fronts while `routesTo` stops after one, and `consumable-kind` turns the gap into an error: a saga that issues the use-case front, which calls the payments adapter, which calls the provider, cannot wait on the provider's answer. The transitive routing was specified in decision 21's second note and tied to decision 17's reopening, which is unrelated; it ships now. `cross-context-relation` refuses a `uses` relation to a value object borrowed through a kernel or a conformist relationship and tells the author to hold the value's identity instead, which a value has none of; the relation only adds a label and a cardinality the map otherwise cannot show. And `rejection-raised` tells an author that one of the two shapes is false when a declined authorisation is both the caller's answer and a fact another context hears. Decisions 14, 21 and 25 are amended.

## Checklist

- [ ] `routesTo` and `hearsAnswerOf` follow `callsOut` transitively inside the context, cycle-guarded, drawing the answer step from the operation the reactor issued; card 104's rule holds (to the caller and nobody else); tests for a two-front chain and for a chain that leaves the context (still one hop across a boundary); `consumable-kind`'s message and the docs say an answer routes along the local `by` chain
- [ ] `cross-context-relation` allows a `uses` relation from an entity to a value object of another context where `valueobject-context` allows the borrowing (a shared kernel, or a conformist downstream of the value's context); the relation map draws it with its label and cardinality; anything else still refused, with fix text that names the two honest routes (borrow through a kernel or conformist, or an `identifies` attribute for an entity); test
- [ ] `rejection-raised` does not fire when the event carrying the rejection's shape is consumed by another context, and its message says: a rejection answers the caller and an event tells the world; where both are true, keep both, and the fact somebody hears is what makes it an event; test for the published decline and for the unheard one
- [ ] Docs rows and skill references for the rules touched; every model's diagnostics unchanged; `bash scripts/verify-all.sh` green

## Comments
