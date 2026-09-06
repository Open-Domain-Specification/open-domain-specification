---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: senior-dev-deep
updatedAt: 2026-09-09T06:40:00.000Z
---
# Upstream is who dictates the language; a subscriber is a reactor; an aggregate-initiated call has a front

the architect's fifth review, each item probed. Every strategic rule equates upstream with the provider of the consumable, but DDD's upstream is who dictates the model: a card processor, an EDI partner or an HL7 orderer calls us in its own format and we translate behind an anti-corruption layer, and that truthful form is a `schema-context` error today, so NorthBank inverts the call into an event and nothing consumes `AuthoriseCard`. `subscription-backed` lets an operation stand in as the subscriber of a foreign event, and eight consumptions in the models use it, so the reaction walk goes dark there. The single-operation caller inference draws RiverMart's `CaseAPI` making a call its comment says the aggregate makes. Plus the corrections below.

## Checklist

- [ ] `schema-context` lets a consumable carry a foreign schema when the carrier's context is downstream of the schema's owner with `conformist` **or** `anti-corruption-layer` in its roles (the ACL translates the caller's language at the boundary); `relationship-roles-backed` backs an upstream role by a schema the downstream carries in any of `schema`, `returns` or `rejects`, as well as by a schema-carrying consumption (this also fixes the returns-only published language); NorthBank's Cards: `AuthoriseCard` typed by CardCo's schema, CardCo upstream of Cards with an anti-corruption layer, CardCo's feed consuming `AuthoriseCard` with `by`, the inverted `AuthorisationRequested` event out; DISCOVERY.md says so; decision 03 amended by the lead
- [ ] On a consumption of an event, `by` names policies and processes only (`consumption-by-reactor`, error), and `subscription-backed` clears an event only when a reactor of the consumer's context listens to it; the eight operation-as-subscriber consumptions in the models become a policy issuing a local operation the guarded operation reads, or come out where the interview names none; NorthBank's `Decide` comment about a two-way partnership goes
- [ ] RiverMart's `CaseAPI` gains the front `ResolveCase` that makes the return request, with `by` naming it, per decision 17; the comment saying the aggregate makes the call is rewritten to decision 17's form; decision 21 noted by the lead: there is no opt-out, the caller is named
- [ ] A kernel context's aggregate operations may be consumed by the contexts that share the kernel: `aggregate-not-public` exempts a consumption by a sharer of a shared-kernel context; test with the review's P4; decision 16 amended by the lead
- [ ] `DeadlineSchema.from?: { $ref }`: the trigger the interval counts from, one of the process's own `starts` or `on` entries; absent means from the start; the flow map labels the loop with `after` and, when set, `from`; decision 23 amended by the lead
- [ ] `identifies` may name a `bigBallOfMud` context as it may an external one; `identifies-entity` accepts it
- [ ] `relationship-duplicate` also refuses `upstream-downstream` and `customer-supplier` between one pair in one direction (one directed relationship per direction per pair); `external-is-boundary` refuses `external` together with `bigBallOfMud`
- [ ] Decisions 03, 08, 13, 15, 16, 17, 21, 23 amended by the lead; you confirm the mechanics match
- [ ] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained; the review's probes P1, P3, P4, P5, P6, P10 rerun and reported

## Comments

- **lead** (2026-09-09T06:40:00.000Z): senior-dev-deep, justified by the reach: the strategic rules' central assumption, two rule corrections, a deadline field, and surgery in two models. After card 97 lands (the lead will say); `feat!`.
