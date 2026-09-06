---
column: todo
labels: [backend, docs]
priority: medium
agent: senior-developer
updatedAt: 2026-09-10T07:10:00.000Z
---
# A consumption names its agreement; an external operation states its contract

Codex's eighth review reproduced two gaps. Two named relationships between one pair in one direction (card 103) have no way to say which of their exchanges belongs to which: a consumption carries no relationship reference, so `relationship-roles-backed` checks every crossing between the pair against every agreement and criticises each for the other's role, and `declaredUpstream` takes whichever directed relationship it finds first. And `external-is-boundary` refuses every context invariant on an external context, including the precondition and postcondition of that context's own public operation, which are its published contract (a payment provider documents that capturing a payment requires it to be capturable and what the capture returns), not a claim about its insides. The architect's eighth round added two rule defects of the same family: `consumption-by-required` asks an external consumer with several operations which of them makes the call, which is inventing the inside of somebody else's machine, and inside a context a front on a multi-operation application service that omits `by` blinds the flow map with no diagnostic at all. Decisions 15, 21 and 28 are amended for all four.

## Checklist

- [ ] `ConsumptionSchema.relationship?: { $ref: string }` naming the agreement the exchange belongs to; workspace model, `consumes(..., { relationship })` in the DSL, the loader (a dangling ref is an `unresolved-ref` diagnostic), `toSchema`, JSON schema regenerated
- [ ] `consumption-agreement` (warning): a consumption between a pair that has more than one directed relationship in that direction and names none, or names a relationship that does not join its two contexts in that direction; reported once, and such a crossing is not counted against any agreement by the two rules below
- [ ] `relationship-roles-backed` and `role-coherence` (through `declaredUpstream`) read crossings per agreement: a crossing that names one counts for that one only; an unnamed crossing between a pair with one agreement counts for it as now
- [ ] `external-is-boundary` allows a context invariant flagged `precondition` or `postcondition` on an external context when the operation it names is that context's own; still refuses one with neither flag and one naming another context's operation, and the fix text says which
- [ ] `consumption-by-required` skips a consumer that is an external context or a big ball of mud, whose insides are not ours to state; and it reads consumptions inside a context as well as across, so a front on a multi-operation application service that names no `by` gets the same warning it would get from another context
- [ ] Reference models: the two named agreements from card 103 have their consumptions assigned; RiverMart's external payment provider states the contract of one public operation; `npm run validate` clean or on purpose. NorthBank is card 109's and stays untouched here
- [ ] `apps/docs/docs/3-core/4-validation.md` rows, including `invariant-in-aggregate` and `invariant-in-context` whose summaries moved after their last doc pass, and the skill's references say what the rules do now
- [ ] `bash scripts/verify-all.sh` green

## Comments
