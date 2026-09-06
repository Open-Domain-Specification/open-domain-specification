---
column: todo
labels: [models, ddd]
priority: medium
agent: developer
updatedAt: 2026-09-10T01:00:00.000Z
---
# NorthBank tells the truth about the scheme; the reference set explains its Money

The architect's seventh review. NorthBank's `SubmitToScheme` declares `returns` and `rejects` and says "await the response" while the surrounding text says the scheme answers on its own timings through events and a policy, so the reaction walk draws two disconnected chains; the honest shape is the asynchronous exchange decision 13's second note names. CardCo carries an invented `RequestAuthorisation` operation, the inside of somebody else's machine. Onboarding says it waits for the screening engine's answer but `ScreenParty` returns nothing and `VerifyCustomer` is issued by nothing; `LinesReconcileToLedger` is described as a precondition of filing and carries neither the flag nor the guard. And RiverMart and StreamLine each declare a `Money` per context through a helper without their discovery notes saying why those teams own one each while NorthBank's share a kernel.

## Checklist

- [ ] NorthBank: `SubmitToScheme` becomes the returns-less submission it is; the scheme's `SchemeSettlementConfirmed` and `SchemeRejected` events, already declared on the external Payment Scheme, are what the instruction lifecycle waits on; the policy and `RecordSchemeResponse` that bridged the fake answer come out or become the reaction; DISCOVERY.md says the exchange is asynchronous
- [ ] CardCo's `RequestAuthorisation` comes out; its feed consumes `AuthoriseCard` with no `by`, which the rules allow for a consumer with no operations
- [ ] Onboarding: `ScreenParty` returns the verdict the process waits for, or the process waits on `PartyMatched` and its description stops saying it waits for an answer; `VerifyCustomer` is issued by the step that verifies or comes out; `LinesReconcileToLedger` carries `precondition: true` and names `FileReturn`
- [ ] RiverMart's and StreamLine's DISCOVERY.md say why each context owns its own Money (a marketplace's contexts price in different currencies and rounding rules; a streaming service's billing and disc rental keep separate ledgers), or the models share one where the interviews support it
- [ ] `.ods/` regenerated; each model's diagnostics unchanged or explained; `bash scripts/verify-all.sh` green

## Comments

- **the lead** (2026-09-10T01:00:00.000Z): developer, now; models only. Card 103 touches core in parallel; do not touch `packages/`.
