---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: senior-dev-deep
updatedAt: 2026-09-09T13:00:00.000Z
---
# Direction is what the author declared; a process may start on a command and end on a completion; a postcondition; preconditions follow composition

Codex review run 6, issues 2, 6, 7 and 8, each reproduced. Card 98 taught `schema-context` and `relationship-roles-backed` that upstream is who dictates the language, but `relationship-declared` still demands a relationship pointing from provider to consumer and `role-coherence` still asks the provider for an upstream role, so NorthBank had to declare a reverse relationship and call CardCo a conformist. A process may only start on an event, though a command starts a saga, and a payload-free call has no completion to wait on. A guarantee about an answer, every returned itinerary meets the requested deadline, can only be filed as a precondition. And a precondition may name a request field but not a field of a schema the request composes.

## Checklist

- [ ] `relationship-declared` is satisfied by a declared relationship joining the two contexts in either direction; the direction is the author's strategic claim, not the call's; `role-coherence` reads roles by the declared direction, asking the declared upstream for an upstream role and the declared downstream for a downstream one, whichever side provides the consumable; NorthBank's reverse CardCo relationship and its "conformist" claim come out; decision 03 noted by the lead
- [ ] `ProcessSchema.starts` may name an operation of the process's own context, the command that creates an instance; the reaction walk steps from that operation to the process; `process-starts` accepts it; decision 23 amended by the lead
- [ ] An operation without `returns` has a completion a reactor may wait on: `op.completed()` names an answer with no shape, ref `<operation ref>/completed`; `consumable-kind` accepts it; the flow map labels it "completes"; decision 13 amended by the lead
- [ ] `InvariantSchema.postcondition?: boolean`: a postcondition holds of an operation's answer and may constrain attributes of the schema the guarded operation returns or rejects with; `precondition` and `postcondition` are exclusive; `postcondition-names-operation` (error); the invariant page says which; decision 19 amended by the lead
- [ ] `inGuardedRequest` follows schema composition: an attribute of any schema reachable from the guarded operation's request, return or rejection through `attribute.schema` is admissible for a precondition or postcondition; test with a request composing lines whose amount is constrained
- [ ] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained; the review's probes rerun

## Comments

- **the lead** (2026-09-09T13:00:00.000Z): senior-dev-deep, once a roster is installed; `feat!`.
