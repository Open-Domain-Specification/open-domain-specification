---
column: todo
labels: [models]
priority: low
agent: developer
live: true
updatedAt: 2026-09-10T08:05:00.000Z
---
# `SubmitToScheme` sends to the scheme

Card 109 gave the Scheme Gateway its anti-corruption policy over the scheme's answers and left `SubmitToScheme` calling nothing, because the honest wiring made `reaction-cycle` report the instruction lifecycle twice. Card 108 closes that rule gap. After it lands, the Payment Scheme provides a submit operation that raises `SchemeSettlementConfirmed` and `SchemeRejected`, `SubmitToScheme` consumes it through the anti-corruption layer with `by`, and the causal walk runs through the call rather than joining only at the process. Runs after card 108.

## Checklist

- [ ] Payment Scheme (external) provides the submit operation and it raises the two scheme events; `SubmitToScheme` consumes it, `anti-corruption-layer`, `by: SubmitToScheme`; the existing relationship's roles still true
- [ ] NorthBank's documented three diagnostics unchanged: no `reaction-cycle` on the lifecycle, `deliberate` list in `models/northbank/src/workspace.test.ts` untouched, `DISCOVERY.md` revision note updated
- [ ] The flow map runs from `PaymentInitiated` through the scheme's operation and its events to `PaymentSettled` and `PaymentRejected`
- [ ] `bash scripts/verify-all.sh` green

## Comments
