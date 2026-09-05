---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: ironhide-deep
updatedAt: 2026-09-09T00:20:00.000Z
---
# The text and the code agree; a process owns its deadlines; the kernel needs no invented subdomain

Prowl's fourth review, each item probed. Four places where a rule or decision promises what the code does not do: a one-operation consumer "is its own `by`" but the walk never infers it; `conformist-backed` says "consumes nothing it publishes" and checks only schema-carrying consumptions, so a payload-less event fails it; a standard declared as a published language is warned unbacked because `relationship-roles-backed` backs an upstream role by consumption only; and `invariant-in-aggregate` accepts an unheld value object of its own context while its comment says it refuses. One phantom node: a process branching on a local operation's answer must declare a consumption nobody makes. One model bend: NorthBank credits its Scheme Gateway with raising the scheme's answers and never declares the scheme. And a per-instance deadline costs five declarations through a Clock context that decision 28 meant for calendar events.

## Checklist

- [ ] `consumable-kind` accepts an answer of an operation the reactor itself issues (a local call-and-branch), as well as one the context consumes; the reaction walk steps from the issued operation to its answer; test with the review's probe P1a which must validate clean with no consumption
- [ ] The reaction walk treats a consumer that provides exactly one operation as that operation's caller when `by` is empty (`callsOut` infers it), so the rule text is true; RiverMart's `CaseAPI` consumption reaches the chain; test with probe P3
- [ ] `conformist-backed` counts any consumption of the upstream's consumables, schema or not, and any borrowed schema or value object; the catalogue text matches; the `models/_shared` assertion that every cross-context event carries a schema comes out, because it masked this
- [ ] `relationship-roles-backed` backs a `published-language` upstream role by a schema or value object the downstream borrows as well as by a schema-carrying consumption; test with probe P5 (an external standards body with a borrowed schema) which must validate clean
- [ ] A process may declare its own deadlines: `ProcessSchema.deadlines?: { [id]: { name, description, after: string } }`, each behaving as an event the process raises to itself and may `on` or `ends` on; the reaction walk and flow map draw a deadline as a step from the process to itself labelled with `after`; no Clock context needed for a per-instance timer; RiverMart's 30-minute authorisation expiry from card 92 becomes the Checkout process's own deadline and the scheduler operation comes out; decision 23 amended by the lead
- [ ] A shared kernel context (a context whose relationships are all `shared-kernel` and that has two or more sharers) is exempt from `context-serves-subdomain`, because it serves its sharers' subdomains; NorthBank's invented "Shared Financial Primitives" subdomain comes out and the kernel context keeps its team; decision 16 amended by the lead
- [ ] RiverMart's `RiskAssessment.subjectId` follows decision 15's own answer: `orderId` and `sellerId`, each optional and identifying its target, with a prose invariant that exactly one is set
- [ ] NorthBank declares the payment scheme as an external context that raises `SchemeSettlementConfirmed` and `SchemeRejected`, consumed by the Scheme Gateway, whose `SubmitToScheme` stops claiming to raise them; `AuthoriseCard` declares what it returns and rejects with; DISCOVERY.md says so
- [ ] `invariant-in-aggregate` refuses a value object nobody in the aggregate holds whether it is the context's own or borrowed, as the comment says; the models re-read for any invariant that relied on the gap
- [ ] `Consumption.path` qualifies the first `by` caller by kind so a policy and an operation with one id do not collide; `consumption-once` compares refs; test with probe P7
- [ ] Decisions 15, 16, 17, 21, 23, 28 amended by the lead; you confirm the mechanics match
- [ ] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained; probes P1a, P3, P4, P5, P6d, P7 rerun and reported

## Comments

- **optimus-prime** (2026-09-09T00:20:00.000Z): Ironhide-deep, justified by the reach: a new process element, four rule corrections, two model surgeries and six decisions. After card 94 lands (the lead will say); `feat!`.
