---
column: done
labels: [backend, ddd, breaking]
priority: high
agent: ironhide-deep
live: false
clean-code-swept: true
updatedAt: 2026-09-05T21:05:00.000Z
---
# The rules reward the truthful model

Prowl's second review, each item probed. Two contradictions: a conformist to a standards body (FHIR, ISO 20022, a scheme you send to) is warned on by `relationship-roles-backed`, which backs roles from consumptions only while `conformist-backed` already counts schema borrowing; and a precondition invariant cannot name the application-service operation that guards it, so five reference invariants put the guard in prose although decision 27 claims otherwise. Three costs the rules must state or close: a reactor's foreign `on` is not a consumption though decisions 17 and 23 say it is, so both maps miss it and the ACL rule never sees it; `by` is optional and without it the reaction walk is hollow (25 of 42 cross-context operation consumptions lack it); a legacy big ball of mud has to invent a batch service to silence `event-unraised`. Plus the smaller gaps listed below.

## Checklist

- [x] `relationship-roles-backed` counts, for a `conformist` downstream role, a schema or value object borrowed from the upstream, exactly as `conformist-backed` does; the two rules share one predicate; test with an external `FHIR` context owning a schema a conformist carries, which validates clean
- [x] An aggregate invariant may constrain an operation of an application service of its own context that guards it (decision 19 amended); `invariant-in-aggregate` accepts it; the five precondition invariants in the reference models (`FundsAvailableAtInitiation`, `AuthWithinAvailableBalance`, `SessionNeedsEntitlement`, `AdsOnlyOnAdSupportedPlan`, `ApproveOnlyWhenAvailable`) name their guards; the fix text no longer promises an aggregate operation that need not exist
- [x] `subscription-consumed` (error): a policy's or process's `on`, `starts` or `ends` naming another context's event requires a consumption of that event by the reactor's context (on the service or aggregate that owns the reaction, with `by` naming the reactor); decision 17's sentence is then true; the three reactors in the models without one gain it; `relationship-declared`'s message stops claiming the context map draws an implied edge for a subscription, or the map draws it (choose the former: a consumption now exists)
- [x] `consumption-by-required` (warning): a cross-context consumption of an operation by a consumer that provides more than one operation names `by`; the fix text says which operations to choose from; every one of the 25 in the reference models gains its `by`, so NorthBank's instruction lifecycle reaches the scheme's answer
- [x] A `bigBallOfMud` context is exempt from `event-unraised`, `aggregate-root` and `root-identity` as an external one is, because its insides are unknowable (decision 28 amended); the three invented `NightlyBatch`/`NightlyExport`/`MonthlyExport` services and their `Run*` operations come out of the models with a DISCOVERY.md line each
- [x] `relationship-declared` and the identity crossing walk ignore an identity on a schema attribute (a payload echoing an id is not the context's dependency); the sixteen empty-role directed relationships the models added for them come out where no other crossing remains; decision 14 amended
- [x] `shared-kernel-backed` also counts a sharer consuming an operation of the kernel context's aggregates or services; test with a kernel backed by consumption only
- [x] `identifies-entity`: within one context, naming a non-root entity of another aggregate is refused with the fix text "use a relation to its root"; across contexts it stays allowed
- [x] External value objects' invariants are checked (`valueObjectInvariantsOf` walks external contexts too) or `external-is-boundary` refuses them; choose refusal, an external context states no rules
- [x] `schema.ts` documents `identity: true` on schema attributes; petstore's `inventoryQuery.consumes(inventoryUpdated)` (a service consuming its own event) and `orderApp.consumes(shipmentDelivered)` re-read and fixed or justified; RiverMart DISCOVERY section 6 says Last Mile borrows Warehouse's `TrackingLabel`
- [x] `packages/skill/skill/examples/petstore.md`'s Pet snippet marks `status` optional to match the model (card 89 leftover)
- [x] Decisions 14, 16, 17, 19, 21, 22, 28 amended by the lead; you confirm the mechanics match
- [x] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained

## Gates

- [x] clean-code-swept — every change stays in the shape the file already had. The two new rules sit beside the ones they belong with: `consumptionByRequired` reads a consumption the way `consumptionByResolves` does, `subscriptionConsumed` walks `reactorsOf`/`subscribedEvents` exactly as `relationshipDeclared` and `trafficCrosses` already do, and both have the three-field catalogue entry every rule has. The mud exemption is one generator, `knowableContexts`, written beside `modelledContexts` and reading the same way, with `knowableAggregatesOf` mirroring `aggregatesOf`; the three rules that use it changed one identifier each. `guardedByApplicationService` is one named predicate beside `scopeOf` and `valueObjectOf`, called from one added line. `identityCrossings` takes a second, narrower owner walk, `modelOwnersIn`, beside the existing `attributeOwnersIn` rather than a flag on it. `identifiesEntity`'s cascade of `continue`s follows the shape the rule already had. `externalIsBoundary`'s `refuse` takes the phrase rather than a kind and a name, because one of the five refusals names two elements. No new stored state, no new module. Biome check clean on every file touched, file by file, never `--write` on a directory (ironhide-deep, 2026-09-05T21:05:00.000Z)

## Comments

- **optimus-prime** (2026-09-08T12:30:00.000Z): Ironhide-deep, justified by the reach: seven rules across the validator, the reaction walk, three models and seven decisions. After card 89 lands (the lead will say); `feat!`.

- **ironhide-deep** (2026-09-05T21:05:00.000Z): All thirteen done on `worktree-agent-ae52c5091acf1f819`, off `develop` at `034d44e` ("chore(boards): card 89 done, 90 dispatched"). `bash scripts/verify-all.sh` green end to end.

  **The conformist contradiction.** `relationship-roles-backed` backed a downstream role from consumptions alone, so a context that adopts a standards body's message formats and consumes nothing was warned on by one rule and passed by another. The `conformist` role is now backed by `borrowsFrom(downstream, upstream)` as well — the same predicate `conformsInSubstance` reads first, so the two rules answer the borrowing question the same way — and the message says so when it still fires ("...declares that downstream role, and nothing in it carries one of X's schemas or value objects"). I did **not** widen it to the whole of `conformsInSubstance`: that would make `relationship-roles-backed` and `conformist-backed` fire and pass identically on the same relationships, so one crossing would produce two warnings saying the same thing. Three tests: an external `FHIR` context whose `Patient` schema a `Clinical` operation carries, which validates clean with zero diagnostics; the same with a `Coding` value object typed onto Clinical's aggregate; and the relationship with neither, which still warns.

  **A precondition names its guard.** `invariant-in-aggregate` accepts an operation of an **application** service of the aggregate's own context (`guardedByApplicationService`). A domain service's operation and a neighbouring context's are still refused, and the message now says which service and which context rather than "in no aggregate at all". The fix text no longer says "name the aggregate's own operation behind it", which promised an operation that need not exist. All five reference invariants name their guard: `FundsAvailableAtInitiation` → `InitiatePayment`, `AuthWithinAvailableBalance` → `AuthoriseCard`, `SessionNeedsEntitlement` → `StartPlayback` (all three application-service operations), `ApproveOnlyWhenAvailable` → `ApproveOrder` and `AdsOnlyOnAdSupportedPlan` → `PrepareBreaks` (both aggregate operations, which the old rule already allowed and the models had left in prose anyway). Each moved down its file to where the operation it names exists, with a comment at the old site saying where it went.

  **`subscription-consumed`, error.** A policy's or process's `on`, `starts` or `ends` naming another context's event now requires a consumption of that event somewhere in the reactor's own context. It asks for the consumption, not for a particular node or a particular `by`: 58 of the 61 foreign subscriptions in the reference models already had one and only 3 did not, and the card says three reactors gain one, so enforcing "on the service that owns the reaction, with `by` naming the reactor" would have meant rewriting fifty-odd consumptions the card does not mention. That shape is what the fix text asks for and what the three new consumptions are written as. Petstore's `Order fulfilment` now takes `PetStatusChanged` in through the same ACL that reads the summary; RiverMart's `Checkout` takes `PaymentAuthorised` and `OrderPlaced`. `relationship-declared`'s doc comment and catalogue `why` no longer claim the map draws an implied edge for a subscription — they say the map draws the consumption this rule requires — and both now say an identity crossing is one an entity or a value object holds.

  **`consumption-by-required`, warning.** A cross-context consumption of an operation by a consumer providing two or more operations names `by`; the message lists the operations to choose from. 25 consumptions lacked `by` before; 23 gained one and 2 are exempt by the rule's own terms and stay plain, with a comment each saying why. StreamLine's `Licensor Delivery` is a service of an **external** context and provides no operations at all — it has nothing to name and nothing of that system's insides is ours to state. RiverMart's `CaseAPI` consumption of `RequestReturn` has no truthful caller: an agent raises a return while working a case and the operation that does it is the Case aggregate's `ResolveCase`, which is not CaseAPI's to name (`consumption-by-resolves`); CaseAPI provides one operation, so nothing is ambiguous. NorthBank's instruction lifecycle now walks end to end — I dumped the chain and it reaches `SchemeSettlementConfirmed`/`SchemeRejected` through `SendToScheme`, `EntryPosted` through `PostSettlement`, and `TransactionFlagged`/`TransactionCleared` through `ScoreInstruction`, where before all three dead-ended at the hub's boundary.

  **The invented batch jobs.** `knowableContexts` is `modelledContexts` minus the big balls of mud, and `event-unraised`, `aggregate-root` and `root-identity` read it. `NightlyBatch`/`RunNightlyBatch`, `NightlyExport`/`RunNightlyExport` and `MonthlyExport`/`RunMonthlyExport` are gone, each with a revision section in its DISCOVERY.md quoting what the interview actually said; two of the three services described themselves as "the one job of the ninety that anyone can describe" and "the charge export, the one job anyone will describe", which is the model admitting it was guessing. A mud context is still held to every rule about what it does state — a test pins `entity-identity` still firing inside one — because the exemption is from completeness, not from coherence.

  **Echoed ids.** `identityCrossings` walks a new `modelOwnersIn` (value objects and aggregates' entities) instead of `attributeOwnersIn`, so a payload schema's identity no longer draws on the context map or asks for a relationship. **Two of the sixteen empty-role relationships came out, not sixteen**, and I want you to see the count rather than take it: I listed, for each of the sixteen, every crossing that still runs in the relationship's own direction. Fourteen are backed by an identity an **entity** holds — `Loan.accountId`, `FraudCase.customerId`, `Credential.customerId`, `WishlistItem.productId`, `PlaybackSession.householdId` and so on — which is a real dependency and exactly what decision 14 asks a relationship for. Only two existed for a payload alone, and both said so in their own descriptions: NorthBank's `Scheme Gateway downstream of Payments Hub` ("the gateway never reads the instruction back") and RiverMart's `Cart & Checkout upstream of Payments` ("so checkout can match it back"). Both are gone; each pair keeps the relationship that runs the other way, which was always the real one. Removing any of the other fourteen would put a `relationship-declared` warning straight back.

  **`shared-kernel-backed`.** Also counts `callCrosses` in either direction, so a kernel whose shared piece is an aggregate reached through its operations — decision 16's second amendment — is backed. Test: A's `Product.ConvertUnits` consumed by B, nothing borrowed. The rule-catalogue fixture needed a fifth context to keep firing, since B and D there call each other.

  **`identifies-entity`.** Within one context, an entity or a value object naming a non-root entity of another aggregate is refused: "use a relation to its root, because inside one context nothing is reached by id alone". Payload schemas are exempt, which matters — all eight same-context non-root identities in the reference models are on schemas (`ShipmentDispatched.packageId`, `EncodingCompleted.renditionIds`, `ProfileCreated.profileId` and the rest), and they are correlation ids, not stored reaches. Across contexts a child id stays allowed. No model changed.

  **External value objects.** Refusal, as instructed: `external-is-boundary` now refuses an invariant on an external context's value object, naming both the invariant and the value. `invariant-in-value-object` walks modelled contexts only, so without this the rule went unchecked as well as unstatable. The value object itself stays — it is the vocabulary our own model has to carry.

  **The two petstore consumptions.** Both said nothing and both came out. `OrderApp.consumes(ShipmentDelivered)`: no policy or process of Sales reacts to it and `OrderDetail` carries neither a shipment nor a delivery time, so nothing in Sales ever read it; its own comment gave the motive away ("without it ... the partnership was a one-way dependency wearing a partner's badge"), and decision 20's second amendment has since said a partnership needs no traffic in the quiet direction. `InventoryQuery.consumes(InventoryUpdated)`: a node consuming what it itself provides depends on nobody, and `RecountInventory`'s `raises` already says where the fact comes from; the same-context-consumption-without-a-pattern reading it stood for is still shown by `PetApp`'s `ReservePet` and `OrderApp`'s `DeliverOrder`. The partnership's description and one of its comments were rewritten, because both rested on the removed consumption. Petstore still validates clean.

  **Decisions.** Read all seven amendments and the mechanics match, with two readings I want confirmed. Decision 17's amendment says `subscription-consumed` "requires the consumption, on the service or aggregate that owns the reaction, with `by` naming the reactor"; I read the clause after the comma as the shape of the answer, not as what the rule enforces, for the counting reason above. Decision 21's third amendment says "where the consumer provides more than one operation the caller is ambiguous, and `consumption-by-required` (warning) asks for it. A consumer with one operation is its own `by`" — I read "more than one" strictly, so a consumer with none (an external context's edge) is asked for nothing. Decisions 14, 16, 19, 22 and 28 needed no interpretation: 22's second amendment is about where specialisation may point and this card touches none of it.

  **Surfaces.** `apps/docs/docs/3-core/4-validation.md` gains a row per new rule (its test pins the table against `RULE_CATALOG`) and its worked example's inline snapshot gains the `subscription-consumed` line. `packages/skill/skill/references/validation-rules.md` and `model-reference.md` are generated and picked both up. Four test expectations moved because the petstore fixture did: pages' `derive`, `ConsumesTable` and `edge-cases`, and doc's "whole consumer" case, which now reads Inventory's projection instead of `GetPetSummary`.

  **Census, before → after** (counted with a script over the four workspaces, before any edit and after all of them):

  ```
  subscriptions to another context's event with no consumption in the reactor's context
    3 → 0    (petstore Order fulfilment on PetStatusChanged; rivermart Checkout on
              PaymentAuthorised and on OrderPlaced)

  cross-context operation consumptions with no `by`
    25 of 42 → 2 of 42
    remaining, both exempt from `consumption-by-required`:
      rivermart  CaseAPI          <- Order Management.RequestReturn  (1 operation, no truthful caller)
      streamline Licensor Delivery <- Studio Production.SubmitDelivery (external context, 0 operations)

  empty-role directed relationships
    16 → 14  (out: northbank Payments Hub -> Scheme Gateway;
                   rivermart Cart & Checkout -> Payments.
              the other 14 are each backed by an identity an entity holds, not a payload's)

  invented batch services
    3 → 0    (Sovereign Core NightlyBatch/RunNightlyBatch,
              Vendor Purchasing NightlyExport/RunNightlyExport,
              Disc Rental MonthlyExport/RunMonthlyExport)

  precondition invariants naming no guard
    5 → 0    FundsAvailableAtInitiation  → InitiatePayment    (application service)
             AuthWithinAvailableBalance  → AuthoriseCard      (application service)
             SessionNeedsEntitlement     → StartPlayback      (application service)
             ApproveOnlyWhenAvailable    → ApproveOrder       (aggregate)
             AdsOnlyOnAdSupportedPlan    → PrepareBreaks      (aggregate)

  identity attributes on payload schemas naming another context
    51 → 51  (unchanged in the models; they now draw nothing on the context map and
              ask for no relationship, which is the point)
  ```

  **Diagnostics per model, unchanged from before the card:**

  ```
  Swagger Petstore (v3): 0 diagnostic(s)

  NorthBank: 4 diagnostic(s)
    [warning] relationship-declared: "Branch & Contact Centre" consumes "Decide" from "Credit Decisioning", but no relationship says how "Credit Decisioning" and "Branch & Contact Centre" stand to each other (#/boundedcontexts/branch_&_contact_centre/services/channels_app)
    [error] separate-ways: "Branch & Contact Centre" consumes "Decide" from "Credit Decisioning" although the contexts declare separate ways (#/boundedcontexts/branch_&_contact_centre/services/channels_app)
    [error] consumable-kind: Policy "Escalate arrears" issues "ArrearsNoticeIssued", which is an event, not an operation (#/boundedcontexts/lending/policies/escalate_arrears)
    [warning] context-serves-subdomain: Bounded context "Identity & Access" serves no subdomain, so it is missing from the problem-space view (#/boundedcontexts/identity_&_access)

  RiverMart: 2 diagnostic(s)
    [error] aggregate-root: Aggregate "Wishlist" has 2 root entities; an aggregate has exactly one (#/boundedcontexts/cart_&_checkout/aggregates/wishlist)
    [error] cross-aggregate-reference: "Cart" includes "WishlistItem" in another aggregate; across aggregates only "references" is allowed (#/boundedcontexts/cart_&_checkout/aggregates/cart/entities/cart)

  StreamLine: 3 diagnostic(s)
    [error] internal-consumable: "RecommendationsAPI" consumes "BookmarkUpdated" from "Playback", but it is internal to that context (#/boundedcontexts/recommendations/services/recommendations_api)
    [error] schema-context: "PlaybackStarted" carries schema "TitleRef" from "Catalogue"; a payload belongs to the context that publishes it (#/boundedcontexts/playback/aggregates/playback_session/provides/playback_started)
    [warning] policy-complete: Policy "Recertify on SDK release" issues no command (#/boundedcontexts/devices/policies/recertify_on_sdk_release)
  ```

  **verify-all summary:**

  ```
  core: 472 tests passed
  graphviz: 25 tests passed
  doc: 31 tests passed
  skill: 26 tests passed
  northbank: 3 tests passed
  schema comparison (petstore vs core dist): match
  petstore: 20 tests passed
  rivermart: 3 tests passed
  streamline: 3 tests passed
  models/_shared: 9 tests passed
  pages: 746 tests passed
  apps/docs: 23 tests passed
  apps/ods-vscode: 15 tests passed
  pages e2e (full suite): passed
  ```

  **One thing I added rather than only moved, flagged for you.** RiverMart's `SearchAPI` gained an internal operation, `ReportAdClick`. `SearchAPI.consumes(RecordAdClick)` needed a caller and none of its three existing operations is one: `SearchProducts` answers the results page, and the click happens afterwards. The Ads interview says "Search calls us for the slots and merges them into the organic results, **and tells us when one of them is clicked**", and decision 17's amendment names this exact cost — every outbound call is an operation of the caller's own application service. So the operation is in the discovery notes and required by the decision; it was simply never written down. Say if you would rather the consumption stayed plain.
