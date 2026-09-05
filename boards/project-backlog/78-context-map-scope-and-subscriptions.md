---
column: done
labels: [backend, ddd]
priority: low
agent: ironhide
live: false
clean-code-swept: true
updatedAt: 2026-09-05T18:45:00.000Z
---
# Context map scope, policy subscriptions as crossings, consumption once, and two stale sentences

Three leftovers from card 70. `ODSContextMap.fromScope` keeps only relationships that involve an in-scope context while its consumption walk reaches further out, so petstore's fulfilment subdomain page draws Catalog to Sales as implied although the workspace declares it. A policy subscribing to another context's event is a crossing for `separate-ways` and `partnership-backed` but not for `relationship-declared`. And `narrative.ts` hard-codes the implied aside as "Implied by consumptions" where an identity may now imply the edge.

## Checklist

- [x] `fromScope` keeps a declared relationship whenever its consumption or identity walk reaches both ends, so a declared edge is never drawn as implied; test on the petstore fulfilment scope
- [x] `relationship-declared` treats a policy's `on` of another context's event as a crossing, like the other two rules; the four models declare or already have the relationship; diagnostics unchanged otherwise
- [x] `narrative.ts` says what implied the edge, consumption or identity, from `impliedBy`
- [x] `consumption-once` (error): the same consumer consumes the same consumable twice; card 73 hit it as a Svelte `each_key_duplicate` crash on the pages render instead of a diagnostic; fix text says merge the two, keeping every `by`
- [x] StreamLine's DISCOVERY.md names `RecommendationsAPI`, not `TasteProfile`, for its deliberate `internal-consumable` finding, after card 73 moved the consumption
- [x] The ref grammar in the skill reference gains the relationship row (`#/relationships/<source>~<type>~<target>`), which diagnostics already point at
- [x] The `AttributeTable` Storybook harness shows an inherited group (a kind of an entity), so the designer can see what card 59 drew
- [x] Petstore's `orderApp.consumes(deliverOrder)` names `by: [confirmDelivery]`, so the chain no longer stops at `ConfirmDelivery`
- [x] `bash scripts/verify-all.sh` green

## Gates

- [x] clean-code-swept — every change reuses the shape already in the file: `consumptionOnce` follows `relationshipDuplicate`'s ref-collision pattern and its catalogue entry the same three fields; the subscription crossing reuses `reactorsOf`/`subscribedEvents`, the pair `separate-ways` and `partnership-backed` already read; `IMPLIED_ASIDE` becomes a `Record<ImpliedBy, string>` rather than a second constant; `fromScope`'s new predicate is one named helper with the reason in a comment. Biome check clean on every file touched, file by file, never `--write` on a directory (ironhide, 2026-09-05T18:45:00.000Z)

## Comments

- **optimus-prime** (2026-09-07T18:40:00.000Z): Ironhide, after card 77 lands (the lead will say); `fix`.

- **ironhide** (2026-09-05T18:45:00.000Z): All eight done on `worktree-agent-a627e181e43023b9b`, off `develop` at `bae53c1` (`git log` shows "Merge card 77").

  **Context map scope.** `ODSContextMap.fromScope` (`packages/core/src/context-map.ts`) now works out the contexts the map will draw — the ones in scope plus every end the consumption and identity walks reach — and keeps a declared relationship when it touches the scope *or* when both its ends are in that set. Reproduced first: the new petstore test failed with `implied: "consumption"` against the unfixed core, and passes now. `models/petstore/src/workspace.test.ts` asserts the Fulfilment subdomain's map draws `Catalog BC → Sales BC` as `customer-supplier`, `implied: false`, and that nothing on that map is implied at all. The generated docs move with it: the fulfilment, sales and inventory subdomain pages and three context pages now list the declared relationship instead of "upstream-downstream (implied by consumption)".

  **Subscriptions as crossings.** `relationship-declared` walks each context's policies and processes and notes the pair when one reacts to another context's event, wording it like the `separate-ways` message and pointing at the reactor's ref. It runs *after* the consumption and identity loops on purpose: the rule reports one diagnostic per pair and direction, so a pair joined by something more concrete keeps the more concrete sentence — that is what leaves `apps/docs`' validation example snapshot untouched. All four models build with exactly the diagnostics they had before (NorthBank 4, RiverMart 2, StreamLine 3, petstore 0): each subscription that crosses already has its relationship.

  **The implied aside.** `NarratableRelationship.implied?: boolean` becomes `impliedBy?: ImpliedBy`, the map edge's own type, and `IMPLIED_ASIDE` is a record of the two sentences. An identity-implied link now reads "Implied by an identity attribute naming the other context; no explicit relationship is declared." No shipped caller passes one yet — the table and the doc generator both pass real relationships — so nothing on screen changes; the sentence is simply no longer false if one ever does. `narrative.ts` type-imports from `context-map.ts`, which is a type-only edge and no cycle; it already type-imports `workspace.ts`.

  **`consumption-once`.** New error in `RULE_CATALOG`: the same consumer consuming the same consumable twice. Both consumptions derive the same ref (card 62), so the second is unreachable and any surface keyed by it has two rows on one key — card 73's `each_key_duplicate` crash. The fix text says merge the two, keeping every operation, policy and process named in `by`, and the pattern, comments and disposition either carried. Three unit tests, a trip in `rule-catalog.test.ts`'s `everythingWrong()` fixture (the catalogue test demands every rule fire), and a row in `apps/docs/docs/3-core/4-validation.md`, whose table is asserted against `RULE_CATALOG` by card 79's test.

  **The four smaller ones.** The skill's ref grammar gains the relationship row and a paragraph beside the consumption one, since a relationship has no id of its own either; `packages/skill/skill/references/model-reference.md` is regenerated. `AttributeTable.harness.svelte` takes an `inherited` prop and draws StreamLine's Film, a kind of Title, with its own attribute leading and Title's under the "Inherited from Title" label row; a fourth story, "Inherited", shows it. Petstore's `orderApp.consumes(deliverOrder)` names `by: [confirmDelivery]`, and the generated OrderApp page now says ConfirmDelivery "also reaches OrderDelivered through the operations it calls" — the chain no longer stops at the open host.

  One thing did not match the card. StreamLine's DISCOVERY.md section 7 never said `TasteProfile`; it said "Recommendations' consumption of `BookmarkUpdated`", naming the context. I read the item's intent as naming the consumer node and changed it to "`RecommendationsAPI`'s consumption of `BookmarkUpdated`", which is where the diagnostic actually points. Nothing else in the file mentions TasteProfile outside section 3's "Recorded as" line, which is about the aggregate and is correct.

  **`bash scripts/verify-all.sh`, green end to end (exit 0):**

  ```
  === verify-all summary ===
  core: 433 tests passed
  graphviz: 25 tests passed
  doc: 31 tests passed
  skill: 26 tests passed
  northbank: 3 tests passed
  schema comparison (petstore vs core dist): match
  petstore: 19 tests passed
  rivermart: 3 tests passed
  streamline: 3 tests passed
  models/_shared: 9 tests passed
  pages: 729 tests passed
  apps/docs: 23 tests passed
  apps/ods-vscode: 13 tests passed
  pages e2e (diagram-panel-fit): passed
  ```

  Each model's diagnostics from that run, unchanged from before the card:

  ```
  NorthBank: 4 diagnostic(s)
    [warning] relationship-declared: "Branch & Contact Centre" consumes "Decide" from "Credit Decisioning", but no relationship says how "Credit Decisioning" and "Branch & Contact Centre" stand to each other (#/boundedcontexts/branch_&_contact_centre/services/channels_app)
    [error] separate-ways: "Branch & Contact Centre" consumes "Decide" from "Credit Decisioning" although the contexts declare separate ways (#/boundedcontexts/branch_&_contact_centre/services/channels_app)
    [error] consumable-kind: Policy "Escalate arrears" issues "ArrearsNoticeIssued", which is an event, not an operation (#/boundedcontexts/lending/policies/escalate_arrears)
    [warning] context-serves-subdomain: Bounded context "Identity & Access" serves no subdomain, so it is missing from the problem-space view (#/boundedcontexts/identity_&_access)

  Swagger Petstore (v3): 0 diagnostic(s)

  RiverMart: 2 diagnostic(s)
    [error] aggregate-root: Aggregate "Wishlist" has 2 root entities; an aggregate has exactly one (#/boundedcontexts/cart_&_checkout/aggregates/wishlist)
    [error] cross-aggregate-reference: "Cart" includes "WishlistItem" in another aggregate; across aggregates only "references" is allowed (#/boundedcontexts/cart_&_checkout/aggregates/cart/entities/cart)

  StreamLine: 3 diagnostic(s)
    [error] internal-consumable: "RecommendationsAPI" consumes "BookmarkUpdated" from "Playback", but it is internal to that context (#/boundedcontexts/recommendations/services/recommendations_api)
    [error] schema-context: "PlaybackStarted" carries schema "TitleRef" from "Catalogue"; a payload belongs to the context that publishes it (#/boundedcontexts/playback/aggregates/playback_session/provides/playback_started)
    [warning] policy-complete: Policy "Recertify on SDK release" issues no command (#/boundedcontexts/devices/policies/recertify_on_sdk_release)
  ```

  **Gates.** `npx tsc --noEmit` clean in core, doc, skill, pages, apps/docs and models/petstore. `npm run check` (svelte-check) clean in pages, run inside verify-all. Biome clean on every file touched.
