---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: ironhide-deep
updatedAt: 2026-09-08T12:30:00.000Z
---
# The rules reward the truthful model

Prowl's second review, each item probed. Two contradictions: a conformist to a standards body (FHIR, ISO 20022, a scheme you send to) is warned on by `relationship-roles-backed`, which backs roles from consumptions only while `conformist-backed` already counts schema borrowing; and a precondition invariant cannot name the application-service operation that guards it, so five reference invariants put the guard in prose although decision 27 claims otherwise. Three costs the rules must state or close: a reactor's foreign `on` is not a consumption though decisions 17 and 23 say it is, so both maps miss it and the ACL rule never sees it; `by` is optional and without it the reaction walk is hollow (25 of 42 cross-context operation consumptions lack it); a legacy big ball of mud has to invent a batch service to silence `event-unraised`. Plus the smaller gaps listed below.

## Checklist

- [ ] `relationship-roles-backed` counts, for a `conformist` downstream role, a schema or value object borrowed from the upstream, exactly as `conformist-backed` does; the two rules share one predicate; test with an external `FHIR` context owning a schema a conformist carries, which validates clean
- [ ] An aggregate invariant may constrain an operation of an application service of its own context that guards it (decision 19 amended); `invariant-in-aggregate` accepts it; the five precondition invariants in the reference models (`FundsAvailableAtInitiation`, `AuthWithinAvailableBalance`, `SessionNeedsEntitlement`, `AdsOnlyOnAdSupportedPlan`, `ApproveOnlyWhenAvailable`) name their guards; the fix text no longer promises an aggregate operation that need not exist
- [ ] `subscription-consumed` (error): a policy's or process's `on`, `starts` or `ends` naming another context's event requires a consumption of that event by the reactor's context (on the service or aggregate that owns the reaction, with `by` naming the reactor); decision 17's sentence is then true; the three reactors in the models without one gain it; `relationship-declared`'s message stops claiming the context map draws an implied edge for a subscription, or the map draws it (choose the former: a consumption now exists)
- [ ] `consumption-by-required` (warning): a cross-context consumption of an operation by a consumer that provides more than one operation names `by`; the fix text says which operations to choose from; every one of the 25 in the reference models gains its `by`, so NorthBank's instruction lifecycle reaches the scheme's answer
- [ ] A `bigBallOfMud` context is exempt from `event-unraised`, `aggregate-root` and `root-identity` as an external one is, because its insides are unknowable (decision 28 amended); the three invented `NightlyBatch`/`NightlyExport`/`MonthlyExport` services and their `Run*` operations come out of the models with a DISCOVERY.md line each
- [ ] `relationship-declared` and the identity crossing walk ignore an identity on a schema attribute (a payload echoing an id is not the context's dependency); the sixteen empty-role directed relationships the models added for them come out where no other crossing remains; decision 14 amended
- [ ] `shared-kernel-backed` also counts a sharer consuming an operation of the kernel context's aggregates or services; test with a kernel backed by consumption only
- [ ] `identifies-entity`: within one context, naming a non-root entity of another aggregate is refused with the fix text "use a relation to its root"; across contexts it stays allowed
- [ ] External value objects' invariants are checked (`valueObjectInvariantsOf` walks external contexts too) or `external-is-boundary` refuses them; choose refusal, an external context states no rules
- [ ] `schema.ts` documents `identity: true` on schema attributes; petstore's `inventoryQuery.consumes(inventoryUpdated)` (a service consuming its own event) and `orderApp.consumes(shipmentDelivered)` re-read and fixed or justified; RiverMart DISCOVERY section 6 says Last Mile borrows Warehouse's `TrackingLabel`
- [ ] Decisions 14, 16, 17, 19, 21, 22, 28 amended by the lead; you confirm the mechanics match
- [ ] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained

## Comments

- **optimus-prime** (2026-09-08T12:30:00.000Z): Ironhide-deep, justified by the reach: seven rules across the validator, the reaction walk, three models and seven decisions. After card 89 lands (the lead will say); `feat!`.
