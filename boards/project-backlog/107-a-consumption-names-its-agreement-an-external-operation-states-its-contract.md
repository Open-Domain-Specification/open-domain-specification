---
column: todo
labels: [backend, docs]
priority: medium
agent: senior-developer
updatedAt: 2026-09-10T06:20:00.000Z
---
# A consumption names its agreement; an external operation states its contract

Codex's eighth review reproduced two gaps. Two named relationships between one pair in one direction (card 103) have no way to say which of their exchanges belongs to which: a consumption carries no relationship reference, so `relationship-roles-backed` checks every crossing between the pair against every agreement and criticises each for the other's role, and `declaredUpstream` takes whichever directed relationship it finds first. And `external-is-boundary` refuses every context invariant on an external context, including the precondition and postcondition of that context's own public operation, which are its published contract (a payment provider documents that capturing a payment requires it to be capturable and what the capture returns), not a claim about its insides. Decisions 15 and 28 are amended for both.

## Checklist

- [ ] `ConsumptionSchema.relationship?: { $ref: string }` naming the agreement the exchange belongs to; workspace model, `consumes(..., { relationship })` in the DSL, the loader (a dangling ref is an `unresolved-ref` diagnostic), `toSchema`, JSON schema regenerated
- [ ] `consumption-agreement` (warning): a consumption between a pair that has more than one directed relationship in that direction and names none, or names a relationship that does not join its two contexts in that direction; reported once, and such a crossing is not counted against any agreement by the two rules below
- [ ] `relationship-roles-backed` and `role-coherence` (through `declaredUpstream`) read crossings per agreement: a crossing that names one counts for that one only; an unnamed crossing between a pair with one agreement counts for it as now
- [ ] `external-is-boundary` allows a context invariant flagged `precondition` or `postcondition` on an external context when the operation it names is that context's own; still refuses one with neither flag and one naming another context's operation, and the fix text says which
- [ ] Reference models: the two named agreements from card 103 have their consumptions assigned; one external context states the contract of one public operation; `npm run validate` clean or on purpose
- [ ] `apps/docs/docs/3-core/4-validation.md` rows and the skill's references say what the rules do now
- [ ] `bash scripts/verify-all.sh` green

## Comments
