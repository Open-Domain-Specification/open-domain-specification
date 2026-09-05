---
column: done
labels: [backend, ddd]
priority: high
agent: ironhide
live: false
clean-code-swept: true
updatedAt: 2026-09-05T21:20:00.000Z
---
# A child's id may be held in the same context; any service may guard; a standard's value rules are contract

Codex review run 3, issues 1, 3 and 9. Card 90 closed a "side door" by refusing `identifies` on a non-root entity of another aggregate in the same context; that was wrong: a shipment holding an order line's id (with the order's id beside it) is how DDD points at a child without a relation, and `cross-aggregate-reference` rightly refuses the relation. Card 90 let an aggregate invariant name an application-service guard but not a domain-service one; a domain service is where a rule that reads two aggregates lives. And card 90 refused value object invariants on an external context; an IBAN's checksum or an ISO 20022 field rule is the standard's published contract and the model should be able to state it.

## Checklist

- [x] `identifies-entity` accepts any entity of any context again, root or child; the same-context refusal from card 90 and its test come out; the fix text on `cross-aggregate-reference` says "hold its id" for a child too; decision 14 amended by the lead
- [x] `invariant-in-aggregate` accepts an operation of any service of its own context, application or domain, as the guard; decision 19 amended by the lead
- [x] An external context may carry value objects with invariants, and `valueObjectInvariantsOf` walks them so they are checked like any other; `external-is-boundary` keeps refusing aggregates, policies, processes and context invariants; decision 28 amended by the lead; a reference model states one where its discovery notes name a standard's rule (NorthBank's IBAN checksum if the IBAN value belongs to the scheme, otherwise none)
- [x] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained

## Gates

- [x] clean-code-swept — all three changes are removals plus one predicate widened, and each leaves the file in the shape it already had. `identifiesEntity` loses its last block and with it the `DataSchema`/`reachedAsRoot`/same-aggregate special cases, so the rule is now two refusals in the cascade it already read as, and the `context` it no longer needs is off the destructuring. `guardedByApplicationService` became `guardedByService` by dropping one conjunct; nothing else about it moved, and its one call site is now short enough to fit a line. `externalIsBoundary` loses its fifth refusal loop; `refuse` still takes the phrase, because one of the four remaining names two elements. `valueObjectInvariantsOf` swaps `modelledContexts` for the workspace's own contexts, which is the whole of the third reversal. Doc comments and catalogue entries were rewritten to say what the code now does, not amended with an exception clause. No new state, no new helper, no new module. Biome check clean on every file touched, file by file, never `--write` on a directory (ironhide, 2026-09-05T21:20:00.000Z)

## Comments

- **optimus-prime** (2026-09-08T15:40:00.000Z): Ironhide, now; `feat`. Small and precise; do not widen it.

- **ironhide** (2026-09-05T21:20:00.000Z): All four done on `agent-a17976be017e4c48f`, off `develop` at `4f65b63` ("docs: Codex run 3 rulings; card 91; decisions 14, 19, 28 amended"). `bash scripts/verify-all.sh` green end to end. Three reversals, nothing else touched.

  **A child's id in the same context.** The whole card-90 block is out of `identifiesEntity`: it now refuses exactly two things, an identity naming a context that is not external, and one naming an entity this workspace does not have. Root or child, own aggregate or another's, own context or another's, entity or value object or payload schema — all accepted. The schema-attribute exemption went with it, because it was only ever an exemption from the refusal that is gone. `cross-aggregate-reference`'s message now reads "...reference "Account" by its root's identity, holding "Statement"'s id beside it when the child is what you mean", and its catalogue `fix` says the same at length: the pair of ids is the recommendation, and the relation is the only thing refused. Card 90's test `refuses an entity storing another aggregate's child id inside one context` came out and is replaced by its reverse, a Shipment in Sales holding `orderId` and `lineId` for an Order aggregate's line, asserting zero diagnostics. **No model changed**: card 90 recorded that all eight same-context non-root identities in the reference models sit on payload schemas, which were exempt then and are simply allowed now.

  **Any service may guard.** `guardedByApplicationService` is `guardedByService` and no longer reads `provider.type`; a service of the aggregate's own context, application or domain, may hold the guard. A neighbouring context's is still refused, and that is the only thing the predicate now excludes beyond "not an operation" and "provided by an aggregate" (which `scopeOf` already accepted a line earlier). The message and the catalogue text lost the word "application" in the same clause. Card 90's test `refuses a domain service's operation and a neighbouring context's` is split: `lets a domain service's operation of its own context guard` asserts clean, `refuses a neighbouring context's service operation` keeps the second half unchanged. The `guards()` fixture — aggregate operation, own application service, own domain service, neighbour's application service — needed no edit, which is what I wanted from it. **No model changed**: the five precondition invariants card 90 wired up name application-service or aggregate operations and were already accepted.

  **A standard's rules on an external value object.** `externalIsBoundary` loses its value-object-invariant loop and now refuses four things: aggregates, policies, processes and the context's own invariants. `valueObjectInvariantsOf` walks `workspace.boundedcontexts` instead of `modelledContexts`, so `invariant-in-value-object` reaches an external value's rules and holds them to the same standard as anyone's — a rule that reaches off the value is still refused. Two tests where card 90 had one: `lets a standard's own rule stay on one of its value objects` (clean under both rules) and `checks that rule like any other value object's` (an external value's invariant constraining a sibling value, refused by `invariant-in-value-object`). That second one is the point of the pair — the rule is now *checked*, not merely permitted.

  **The reference-model clause: none, per the card's own parenthetical.** NorthBank's `IBAN` value object belongs to `accountsBC`, an internal context, not to a scheme, and so does `PAN` (Cards). `IbanChecksumValid` and `PanLuhnValid` already sit on those values and already validate. NorthBank's two external contexts are `Screening Vendor` and `CardCo`, and neither owns a value object at all — CardCo owns one schema and one service, the vendor one schema and one service. So there is no external value in any reference model for a standard's rule to go on, and I added none rather than invent a value object to demonstrate a rule with. Say if you would rather one of the four models grew an external value (CardCo's wire format would be the honest candidate) and I will take it as a separate card.

  **Surfaces.** `packages/core/src/schema.ts`: the `identifies` doc no longer says "inside one context an entity or a value object names only a root", and `external`'s doc says value object invariants stay. `packages/skill/skill/references/model-reference.md` and `validation-rules.md` are generated and picked both up. One inline snapshot in `apps/docs/tests/validation.example.test.ts` moved, because its worked example trips `cross-aggregate-reference` and that message changed; the docs' rule table is pinned against `RULE_CATALOG` and needed no edit. `apps/docs/docs/3-core/4-validation.md` needed no edit either.

  **Diagnostics per model, unchanged from before the card** (each model's test pins its deliberate set and all four pass):

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

  **verify-all summary** (core is 474 where card 90 left 472: one test replaced in place, two splits adding one each):

  ```
  core: 474 tests passed
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

  `npx tsc --noEmit` clean in `packages/core`; biome check clean on `validate.ts`, `validate.test.ts`, `schema.ts` and the docs snapshot test, run file by file.
