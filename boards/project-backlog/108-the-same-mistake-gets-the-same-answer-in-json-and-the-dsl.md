---
column: todo
labels: [backend, docs]
priority: low
agent: developer
live: true
updatedAt: 2026-09-10T08:05:00.000Z
---
# The same mistake gets the same answer in JSON and the DSL; the last required keys and three rule texts

The architect's eighth round found five hygiene gaps. A process waiting on the completion of an operation that returns a shape gets a precise `consumable-kind` diagnostic in the DSL and, after a round trip through JSON, an `unresolved-ref` that says the operation does not exist when it does. The schema comment says every map is optional (card 104) while `subdomains` on a bounded context, `on`, `then`, `ends` and `starts` on a process and `on` and `then` on a policy are still required, so a JSON author writes `"ends": []` to state what the validator treats as a warning. `mud-needs-acl` on an identity attribute is cleared by any anti-corruption consumption from the mud and only by one, so a context that holds a legacy key it received through a third context can only silence the warning by inventing traffic (decision 28, amended). `reaction-cycle` reports a ring of pure calls with no reactor on it as reactions triggering themselves, alongside `relationship-cycle`. And `invariant-in-context` tells a context with no entities to give an entity an attribute. Card 109 added a sixth: wiring NorthBank's gateway to call the scheme's operation and hear the answer through its own translating policy made `reaction-cycle` report the process's own request and answer as two cycles. Runs after card 107, which touches the same files.

## Checklist

- [ ] The loader resolves a reference to the completion of an operation that returns a shape, and `consumable-kind` says what is wrong; the DSL and the JSON path give the same diagnostic for the same file
- [ ] `subdomains` on `BoundedContextSchema`, `on`, `then`, `ends` and `starts` on `ProcessSchema`, `on` and `then` on `PolicySchema` optional and empty by default on load; JSON schema regenerated; the schema comment about optional maps is true
- [ ] `mud-needs-acl` reads consumptions from the mud context, not identity attributes naming it; a held key is not traffic; the fix text no longer asks for a consumption
- [ ] `reaction-cycle` reports a ring with no policy or process on it once, as calls, or leaves it to `relationship-cycle` where that rule already reports the same ring; the message names what it found
- [ ] `invariant-in-context` fix text for a value-object target in a context with no entities says the honest fix
- [ ] `reaction-cycle` treats a ring on which one process sits and every other reactor is a translating policy, one that hears an event through an `anti-corruption-layer` consumption and whose operations raise the context's own events, as that process's lifecycle through the layer, not a cycle (decision 23, amended 2026-09-10); test with the NorthBank shape card 110 describes
- [ ] `apps/docs/docs/3-core/4-validation.md` rows for the rules touched; `bash scripts/verify-all.sh` green

## Comments
