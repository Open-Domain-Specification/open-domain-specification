---
column: done
labels: [backend, ddd]
priority: medium
agent: ironhide
live: false
clean-code-swept: true
updatedAt: 2026-09-05T16:30:00.000Z
---
# An aggregate does not call out of its context

Prowl's review, finding 8: decision 17 routes inbound operations through an application service but lets an aggregate consume another context's operation (probe 4), so StreamLine's session aggregate and NorthBank's card and request aggregates do synchronous I/O while petstore and RiverMart put the same calls on services. The same fact reads two ways. An aggregate is a consistency boundary, not a client; its context's application service calls out and hands the aggregate what it needs.

## Checklist

- [x] `aggregate-consumes-inside` (error): an aggregate consumes only consumables of its own context (its own aggregates' and services' operations, and events of its own context); a foreign operation or event is consumed by an application service or a policy; DDD reason in the doc comment
- [x] Reference models: StreamLine's and NorthBank's outbound calls on aggregates move to the application service that owns the use case, with `by` naming the operation where it plainly differs; `.ods/` regenerated
- [x] Decision 17 amended by the lead with the outbound half; you confirm the rule matches
- [x] Root suites green inside each package in build order; pages at 100% with `npm run check` clean

## Gates

- [x] clean-code-swept — swept my own diff. The rule is one loop over `modelledContexts` and reads `consumption.consumable.provider.boundedcontext`, the same identity comparison every other crossing rule makes; it deliberately does not reuse `operationsStayInside`, which walks what a node *provides* and would have needed a second mode and a second label to walk what it *consumes*. Two small helpers were not added: no "the application service of this context" lookup, because the rule names no replacement node (the fix text says which kind, and which one is the modeller's judgement), and no shared "foreign consumable" predicate, because the one-line comparison reads better at each of the four sites that make it. In the models the change is one identifier per line and no new prose except where a context gained a boundary. biome clean on every file touched, run file by file. (ironhide, 2026-09-05T16:30:00.000Z)
- [x] verify-all — green end to end: core 360, graphviz 22, doc 29, skill 26, northbank 3, petstore 18, rivermart 3, streamline 3, models/_shared 9, pages 716, apps/docs 22, apps/ods-vscode 9, pages e2e (diagram-panel-fit) passed, schema comparison (petstore vs core dist) match (ironhide, 2026-09-05T16:30:00.000Z)

## Comments

- **optimus-prime** (2026-09-07T10:00:00.000Z): Ironhide, after card 71 lands (the lead will say); `feat`.
- **ironhide** (2026-09-05T16:30:00.000Z): The rule. `aggregate-consumes-inside` (`packages/core/src/validate.ts:1396-1425`, catalogued at `:2094-2103`) is an error on any consumption declared on an aggregate whose consumable is provided by another bounded context, external ones included (decision 28 makes an external context a context like any other on this edge). The message splits on the consumable's type, because the two honest fixes are different: for an operation it says let an application service of this context make the call, for an event it says let a policy react and issue an operation of this context, and both end "and hand *aggregate* what it needs" so the reader knows the aggregate keeps its part. The doc comment gives the DDD reason — a call across a boundary is translation, failure and waiting on someone else's availability, and none of that belongs inside the transaction that keeps an invariant true. Tests at `packages/core/src/validate.test.ts:1656-1744`; the completeness fixture already tripped it (`rule-catalog.test.ts:62,112`, an aggregate in A consuming B's event and B's domain-service operation) so no new fixture shape was needed.
- **ironhide** (2026-09-05T16:30:00.000Z): The rule matches the amendment, and I added one sentence to it. The amendment says an aggregate "consumes only its own context's consumables; a foreign operation or event is consumed by an application service or a policy", which is exactly what the check does. The sentence a reader needed is the mechanical one: a policy holds no consumption of its own, so where a policy is what reacts the consumption sits on the context's application service and names the policy in its `by` (decision 21). Without that, "consumed by a policy" reads as though `PolicySchema.on` were somewhere to hang a pattern, and it is not — that is why deleting the aggregate's consumption outright would have dropped the conformist and anti-corruption-layer roles that `relationship-roles-backed` counts.
- **ironhide** (2026-09-05T16:30:00.000Z): The models, and how much bigger this was than the card's premise. The card names StreamLine's session aggregate and NorthBank's card and request aggregates, and says petstore and RiverMart "put the same calls on services". That is true of *operations* only: on events all four models put the consumption on the aggregate, so the first run reported 75 errors — 29 in NorthBank, 26 in RiverMart, 19 in StreamLine, 1 in petstore. The amendment covers events explicitly ("a foreign operation or event"), so all 75 moved. Every one went to the consuming context's own application service, keeping its pattern, so no crossing and no declared role was lost. `by` was added only where it plainly narrows: StreamLine's four Playback calls and its Ads entitlement lookup, NorthBank's funds check from Payments Hub and from Cards, its fraud scoring from Cards, its customer lookup from Lending, RiverMart's refund, and petstore's `OrderApproved`, which now names the policy that reacts. Where an application service has one operation (NorthBank's DecisioningApp and ChannelsApp, RiverMart's CaseAPI) `by` would have restated the consumer, so it is absent, as decision 21 asks. Each model still reports exactly the diagnostics its `deliberate` list declares: NorthBank 4, petstore 0, RiverMart 2, StreamLine 3.
- **ironhide** (2026-09-05T16:30:00.000Z): Three contexts had no application service to move the consumption to, and one operation was on the wrong node. NorthBank's Regulatory Reporting gains `ReportingApp`, RiverMart's Fraud gains `FraudAPI` and its Last Mile gains `LastMileAPI`: each is the boundary the facts that context reacts to arrive at, each provides nothing outward (a return, a risk assessment and a route are all raised from inside), and without them the rule had no answer for those contexts but "delete the crossing". RiverMart's `RequestRefund` — the operation that calls Payments through the ACL — was provided by the Order aggregate; it moved to `OrderAPI`, which is where every other model puts the operation that makes the call (petstore's `ReportDelivery`, StreamLine's `RequestEncode`, NorthBank's `SendToScheme`), and the "Refund on received return" policy names it there. Core's rich test fixture had the same shape (`makeTestWs.ts`, Invoicing's aggregate consuming Ordering's `OrderPlaced`) and moved to `Invoice App`; the three tests that reached for it through the aggregate now reach through the service.
- **ironhide** (2026-09-05T16:30:00.000Z): Two things for the lead. First, moving RiverMart's Warehouse consumptions to `WarehouseAPI` produced two consumptions of the same `OrderCancelled` by the same service (its two aggregates each held one), and that duplicate crashed the pages render with a Svelte `each_key_duplicate` rather than failing validation — nothing in the catalogue says a consumer consumes a consumable once. I collapsed it to one consumption, which is the truthful model, but a duplicate consumption is a hole a modeller can fall into and the diagnostic they get is a stack trace. A `consumption-once` rule would be a card of its own. Second, `apps/docs/docs/3-core/4-validation.md` gains the rule's row (it is a hand-written table beside the generated skill reference); the rest of that site's prose about aggregates and boundaries I left alone, and card 79 is already about the docs site catching up.
- **ironhide** (2026-09-05T16:30:00.000Z): Each model's diagnostics after the change, `validate()` verbatim:

```
=== northbank: 4 diagnostics ===
warning relationship-declared: "Branch & Contact Centre" consumes "Decide" from "Credit Decisioning", but no relationship says how "Credit Decisioning" and "Branch & Contact Centre" stand to each other
error separate-ways: "Branch & Contact Centre" consumes "Decide" from "Credit Decisioning" although the contexts declare separate ways
error consumable-kind: Policy "Escalate arrears" issues "ArrearsNoticeIssued", which is an event, not an operation
warning context-serves-subdomain: Bounded context "Identity & Access" serves no subdomain, so it is missing from the problem-space view

=== petstore: 0 diagnostics ===

=== rivermart: 2 diagnostics ===
error aggregate-root: Aggregate "Wishlist" has 2 root entities; an aggregate has exactly one
error cross-aggregate-reference: "Cart" includes "WishlistItem" in another aggregate; across aggregates only "references" is allowed

=== streamline: 3 diagnostics ===
error internal-consumable: "RecommendationsAPI" consumes "BookmarkUpdated" from "Playback", but it is internal to that context
error schema-context: "PlaybackStarted" carries schema "TitleRef" from "Catalogue"; a payload belongs to the context that publishes it
warning policy-complete: Policy "Recertify on SDK release" issues no command
```
