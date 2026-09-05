---
column: done
labels: [backend, ddd]
priority: low
agent: ironhide
live: false
clean-code-swept: true
updatedAt: 2026-09-05T18:15:00.000Z
---
# A front does not restate what it calls raises

Card 69 left PetApp's open-host operations restating the `raises` of the aggregate operations they front. With `by` naming the call, the fact is reachable through the chain, so the restatement is redundant; and a front that restates can drift from what the aggregate actually raises. An event is raised where it happens, once.

## Checklist

- [x] `raises-restated` (warning): a service operation lists under `raises` an event that an operation it calls through a consumption's `by` already raises; fix text says drop it, the chain carries it
- [x] The flow map, consumable page "Raises" and doc generator show the front's reachable events as reached, not declared, where a reader would otherwise miss them (the lead decides the wording with Jazz if a new mark is needed; otherwise a sentence under the list)
- [x] Petstore's two fronts drop the restated `raises`; `.ods/` and `docs/` regenerated
- [x] Petstore's `shipmentApp.consumes(confirmDelivery)` and `orderApp.consumes(markPetSoldForOrder)` name their `by`, so the reaction chain carries through both boundaries
- [x] `bash scripts/verify-all.sh` green

## Gates

- [x] clean-code-swept — the reachable-events walk lives once, in `reaction-walk.ts` beside the chain it follows, and the rule, the page and the doc generator all read it; `ReactionChain.consumedThrough` was the same filter written out a second time and now delegates to the new `callsOut`, so the step the flow map takes and the step the rule takes cannot drift. Every new function carries the reasoning in its own doc comment (`callsOut`, `reachedEvents`, `raisesRestated`, `raisersAmong`, `reachesMd`). No dead code left behind: the two petstore fronts lost their `.raises` chains rather than keeping them commented out. Biome clean file by file on all thirteen source files touched; `npx tsc --noEmit` clean in core, doc and models/petstore, and `svelte-check` clean (931 files, 0 errors) in pages (ironhide, 2026-09-05T18:15:00.000Z)

## Comments

- **optimus-prime** (2026-09-07T17:30:00.000Z): Ironhide, after card 73 lands (the lead will say); `feat`.
- **ironhide** (2026-09-05T18:15:00.000Z): Done. One question for you at the bottom about a consequence bullet in decision 21 that this card makes stale, and one thing I left alone on purpose.

  **The rule.** `raises-restated` (warning) in `packages/core/src/validate.ts`. For each operation, it takes the events reachable through the operations it calls — `reachedEvents`, new in `reaction-walk.ts` — and reports any of them the operation also lists under its own `raises`. The message names the operation that really raises the fact: `"ReservePetForOrder" raises "PetReserved", which "ReservePet" already raises through the consumption it makes; drop it, the chain carries it`. An event a front raises and nothing it calls raises is its own fact and is left alone; without a `by` there is no claim that this operation is what calls out, so there is nothing to drop and the rule stays quiet. The walk is transitive and visits each operation once, so a chain of fronts is followed to the end and a ring of calls terminates. Five tests in `validate.test.ts` cover those five cases, and `everythingWrong()` in `rule-catalog.test.ts` gained a restating front so the catalogue test still proves every rule fires.

  **Reached, not declared.** No new mark, a sentence, as the brief said. The consumable page's Raises section, when the operation raises nothing itself, drops the "Raises nothing. Its effect is invisible to the rest of the system." empty state and prints instead: *Through the operations it calls, it also reaches PetReserved, raised where they happen rather than restated here.* The event names are the usual `RefList` links, in the secondary colour, so nothing new was invented visually. The doc generator prints the same sentence as a bullet beneath the Provides table, the shape decision 21's **Made by** line already uses: `- **ReservePetForOrder** also reaches PetReserved through the operations it calls, raised where they happen rather than restated here.` The flow map needed no change and I made none: it already walks a consumption's `by` into the called operation and on to what that raises, so it has always drawn the front, the call and the event as three nodes and two edges. I added a paragraph to `ODSFlowMap`'s doc comment saying so, so the next reader does not go looking for a change that is not there.

  **Petstore.** `ReservePetForOrder` and `MarkPetSoldForOrder` dropped `.raises(petReserved)` and `.raises(petSold)`; the comment above them now says why. `shipmentApp.consumes(confirmDelivery, { by: [reportDelivery] })` and `orderApp.consumes(markPetSoldForOrder, { by: [markPetSoldForDelivered] })` — the second consumption moved a few lines down the file so it sits beside its pair, after the local operation it names is declared. `.ods/petstore.json` and `docs/` regenerated; Sales' and Fulfilment's flow maps and two consumable maps changed, which is the chain now carrying where it used to stop.

  **Evidence.** `bash scripts/verify-all.sh` green end to end:

  ```
  core: 426 tests passed
  graphviz: 25 tests passed
  doc: 31 tests passed
  skill: 26 tests passed
  northbank: 3 tests passed
  petstore: 18 tests passed
  rivermart: 3 tests passed
  streamline: 3 tests passed
  models/_shared: 9 tests passed
  pages: 729 tests passed
  apps/docs: 23 tests passed
  apps/ods-vscode: 13 tests passed
  pages e2e (diagram-panel-fit): passed
  schema comparison (petstore vs core dist): match
  ```

  Diagnostics per model, rule for rule, unchanged; no model gained a `raises-restated`:

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

  **QUESTION for lead — decision 21's consequence bullet is now stale.** Decision 21 says under Consequences: "petstore's `ReservePetForOrder`, made by one operation of `OrderApp`. The identical consumption beside it is left plain on purpose, so both readings appear in one model." This card's fourth checklist item asks for exactly that plain consumption to name its `by`, and I did it: the amendment made `by` causal, and leaving the pair plain now costs the chain a hop it should carry. Both readings still appear in the petstore — `orderApp.consumes(getPetSummaryOp)` and `orderApp.consumes(deliverOrder)` are still the whole consumer — so nothing is lost except the sentence in the record, which now points at a consumption that no longer illustrates it. Amending it is yours, not mine; I have not touched `decisions/21-*.md`.

  **Left alone on purpose.** `orderApp.consumes(deliverOrder, {})` inside Sales has no `by`, so the chain stops at `ConfirmDelivery` and never reaches `OrderDelivered`, and `ConfirmDelivery`'s page now reads "Raises nothing. Its effect is invisible to the rest of the system." — which is the same misreading this card set out to fix, one boundary further in. `by: [confirmDelivery]` is a one-line change of the same shape as PetApp's, but the checklist names two consumptions and that is not one of them, so I have not made it. Say the word and it is a minute's work.
