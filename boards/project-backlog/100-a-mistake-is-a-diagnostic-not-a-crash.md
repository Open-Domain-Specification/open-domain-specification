---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: senior-developer-deep
updatedAt: 2026-09-09T15:00:00.000Z
---
# A mistake is a diagnostic, not a crash; an answer returns to its caller; the rules the review reproduced

The sixth architect review, each item probed. A JSON workspace with one unresolvable reference throws at load (`getReactionTriggerByRefOrThrow`, `Deadline.countsFrom`, a foreign deadline) while the DSL author gets a diagnostic for the same mistake, so an extension author loses every diagnostic to one typo; and the DSL accepts an answer in `Process.starts`, validates clean, and writes a file that cannot load. An answer wakes every reactor in every context that consumes the operation, so `reaction-cycle` reports a ring between two callers of the same service that never wakes each other. The anti-corruption-layer exemption in `relationship-cycle` reads the relationship's roles, so one translated consumption launders every untranslated one. Decision 27 lets a context invariant claim to be true after the operation, which its first amendment says no cross-instance rule can promise. Plus the rule defects listed below.

## Checklist

- [ ] Loading never throws on a model mistake: an unresolvable or wrong-kind ref in `on`, `starts`, `ends`, `from`, `by`, `identifies`, `constrains`, `valueobject`, `schema`, `returns`, `rejects` becomes `unresolved-ref` (error) at the referencing element and the rest of the file still validates; the DSL's `Process.starts` is typed to what the schema allows; test each site from JSON
- [ ] An answer reaches only the reactor that made the call: a reactor may wait on an operation's answer only when the reactor itself, or an operation it issued, is named in `by` on a consumption of that operation, or when the reactor's context has exactly one consumption of it; the reaction walk steps from the answer to that reactor only; the review's two-caller probe validates with no cycle; decision 23 amended by the lead
- [ ] `relationship-cycle` exempts a step by the consumption's own pattern (`anti-corruption-layer` on the consumption), not the relationship's roles; the review's laundering probe now warns
- [ ] A context invariant is checked before acting and never claims to hold after: `precondition` is refused on a context invariant (`context-invariant-is-checked`, error) and its page and rule text say "checked by"; NorthBank's `DailyLimit` description stops claiming to be true after `InitiatePayment`; decision 27 amended by the lead
- [ ] An identity crossing needs no relationship: the «id» edge on the context map is its record; `relationship-declared` reads consumptions, subscriptions and borrowed value objects only; the fourteen empty-role relationships in the three models come out; decision 14 amended by the lead
- [ ] `separate-ways` covers identity and value object crossings as it covers consumptions, with its own error instead of a false `relationship-declared` message
- [ ] `external-is-boundary` refuses `internal` operations on an external context (its insides are not ours); NorthBank's `RequestAuthorisation` on CardCo comes out or becomes a public operation of the feed
- [ ] `aggregate-tree` refuses `references` to a value object as it refuses `uses` to an entity; `mud-needs-acl` counts an identity into a big ball of mud; an aggregate may not consume another aggregate's operation in its own context (`aggregate-consumes-inside` widened; a service fronts it)
- [ ] Rule texts corrected: `subscription-consumed` fix no longer says "or aggregate"; `cross-context-relation` fix says the context map; `invariant-in-aggregate` message admits a precondition's schema attributes; `relationship-roles-backed` fix matches what backs an ACL
- [ ] NorthBank: an external ISO 13616 context owns `IBAN` with its checksum invariant and both Accounts and Payments conform to it (decision 28, third amendment); Accounts' copy comes out; DISCOVERY.md says so
- [ ] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained; the review's probes P1, P2, P3, P4, P5a to P5c, P7, P16, P17, P18, Q2 rerun and reported

## Comments

- **the lead** (2026-09-09T15:00:00.000Z): senior-developer-deep, after card 99 lands; `feat!`.
