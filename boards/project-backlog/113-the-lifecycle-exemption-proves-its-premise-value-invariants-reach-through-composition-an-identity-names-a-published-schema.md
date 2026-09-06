---
column: todo
labels: [backend, docs]
priority: medium
agent: senior-developer
live: true
updatedAt: 2026-09-10T11:40:00.000Z
---
# The lifecycle exemption proves its premise; value invariants reach through composition; an identity into an external context names a published schema

Codex's ninth review reproduced three gaps. Card 108's `isProcessLifecycleThroughLayer` exempts a ring holding one process and translating policies without checking that the event the process hears on the ring continues an instance: a translated event that `starts` the process spawns a new instance each time round, and the probe got no `reaction-cycle` with an anti-corruption subscription and got one after relabelling it conformist. `invariant-in-value-object` accepts only the owner's own and inherited attributes, so an itinerary whose `legs` are typed by a `Leg` value object cannot say that each leg's arrival precedes the next leg's departure without flattening the model. And an identity attribute into an external context can only name the context, though the context publishes schemas for the very things those ids name (a processor's Customer, Payment, Refund, Dispute). Decisions 23, 27 and 28 are amended.

## Checklist

- [ ] `reaction-cycle`: the lifecycle-through-a-layer exemption holds only when the event the process hears on the ring is one of its `on` or `ends` triggers and not one of its `starts`; a translating policy is one whose trigger on the ring is its `anti-corruption-layer` subscription and whose operation on the ring raises the event that continues the ring; a ring whose translated event starts the process is reported as a cycle that spawns instances, and the message says so
- [ ] `invariant-in-value-object`: an invariant on a value object may constrain attributes reachable through its own attributes' types, transitively through value-object composition, and still nothing outside that reach; the fix text names the path it accepts
- [ ] `identifies` may name a schema of an external context as well as the context itself; the loader, `identity-crossings`, the rules that read identities (`identity-*`, `mud-needs-acl` after card 108) and the context map treat it as an identity into that context; a schema of a non-external context is still refused with the existing message
- [ ] Tests for each: the instance-spawning ring warns and the continuing ring does not; the itinerary invariant validates and one reaching outside composition still fails; an identity naming an external schema validates and draws
- [ ] RiverMart's external payment provider publishes a payment schema and one identity in RiverMart names it; `apps/docs/docs/3-core/4-validation.md` rows and the skill's references for the rules touched
- [ ] `bash scripts/verify-all.sh` green

## Comments
