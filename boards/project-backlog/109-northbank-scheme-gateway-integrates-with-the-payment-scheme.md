---
column: todo
labels: [models]
priority: low
agent: developer
live: true
updatedAt: 2026-09-10T07:10:00.000Z
---
# NorthBank's Scheme Gateway integrates with the Payment Scheme again, honestly

Card 105 removed the faked return from the Scheme Gateway and left it with no relationship and no consumption with the Payment Scheme: the Payments Hub subscribes to the scheme's events directly, `SubmitToScheme` calls out to nothing, and the submission process's causal chain still stops at the gateway. The interview says the gateway turns a submission into a scheme message and sends it, and the scheme confirms or rejects. The spec can say that: the gateway calls the scheme's external operation, that operation raises the confirmation and the rejection, and the gateway's anti-corruption policy hears them and republishes the bank's own events, which the hub subscribes to (decision 15: reacting to an outside event by publishing an inside one is not boilerplate to skip). NorthBank only; card 107 works in RiverMart in parallel.

## Checklist

- [ ] Payment Scheme (external) provides a submit operation that raises its confirmation and rejection events; the gateway consumes it through an anti-corruption layer, `by` `SubmitToScheme`; the directed relationship between gateway and scheme says so
- [ ] The gateway's policy hears the scheme's events and raises the bank's own `SchemeAccepted` and `SchemeRejected` (or the existing names); the hub subscribes to the gateway's events, not the scheme's
- [ ] The submission process's flow map runs from the hub's command to the end event without a break; `npm run validate` for NorthBank clean or on purpose, and the interview text still true
- [ ] `bash scripts/verify-all.sh` green

## Comments
