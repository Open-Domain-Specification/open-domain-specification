---
column: done
labels: [backend, ddd, breaking]
priority: high
agent: senior-dev
live: false
clean-code-swept: true
updatedAt: 2026-09-05T19:50:00.000Z
---
# Presence is not size; a borrowed value is inside the boundary; one pair may carry several exchanges

Codex review run 2, issues 1, 3 and 8, each reproduced. `attribute-relation-coherence` warns when a required list has cardinality `*`, but a required list may be empty (Swagger's `photoUrls` is required with no minimum, and petstore declares `1..*` to dodge the warning). An aggregate invariant may not constrain the attributes of a shared-kernel value object its entities hold, because the scope check reads where the type is defined rather than where the instance lives. And `consumption-once` refuses a second consumption of the same consumable by the same consumer even when the two are made by different operations with different patterns and dispositions.

## Checklist

- [x] Coherence: a required non-array pairs with `1`, an optional non-array with `0..1`, an array with `*` or `1..*` whether or not it is optional (presence says whether the list is there, cardinality says how many it may hold); petstore's `photoUrls` becomes `*` to match its contract; tests for the four cases
- [x] `invariant-in-aggregate` and `invariant-in-context` accept a value object, and that value object's attributes, when an entity or attribute inside the invariant's own boundary holds it, wherever the value object is defined (shared kernel or conformist borrowing); a value object nobody in the boundary holds is still refused; test with the review's invoice holding a shared `Money` and an invariant on `Money.amount`
- [x] A consumer may consume one consumable more than once when every such consumption names a non-empty, mutually disjoint `by`; `consumption-once` becomes that rule with a fix text that says name the callers; the consumption ref appends the first `by` caller's id only when the pair is not unique, so an existing single consumption keeps its ref; `findConsumption`, the extension's locate and the pages row anchor follow; round-trip test
- [x] Decisions 24, 26 and 27 amended by the lead; you confirm the mechanics match
- [x] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained

## Gates

- [x] clean-code-swept — every change stays in the shape the file already had. `cardinalityDiagnostics` keeps its `says`/`warn` pair and becomes one branch on "is it a list" rather than three overlapping conditions; `valueObjectsHeldIn` is one named helper beside `scopeOf` and `contextOf`, used by both invariant rules, with `valueObjectOf` doing the attribute-or-value unwrapping both already did inline; `consumptionOnce` groups by pair the way `relationshipDuplicate` groups by ref, and its catalogue entry keeps the same three fields. `Consumption.path` gains one local and one conditional segment, no new stored state. The extension's `CONSUMPTION` regex takes an optional group rather than a second regex. Biome check clean on every file touched, file by file, never `--write` on a directory (senior-dev, 2026-09-05T19:50:00.000Z)

## Comments

- **lead** (2026-09-08T11:40:00.000Z): the senior developer, now; `feat!`.

- **senior-dev** (2026-09-05T19:50:00.000Z): All five done on `agent-a71d35ccdd08c2308`, off `develop` at `644d8d9` ("docs: Codex run 2 rulings; card 89; decisions 24, 26, 27 amended").

  **Presence is not size.** `cardinalityDiagnostics` (`packages/core/src/validate.ts`) no longer reads `optional` and `[]` as two votes on the same question. A list is now judged on size alone — `*` or `1..*`, whether or not it is optional — and an attribute that is not a list is judged on both: `1` when required, `0..1` when optional, and nothing else. That is four coherent pairings, not the six the old three conditions allowed. Petstore's `photoUrls` is `*` again, which is what the v3 contract says: the field is required and has no minimum, so a pet with no photograph is a valid pet. The comment above the `uses` block says so, and the block no longer claims to cover all four cardinalities — nothing in petstore is `1..*` now. Six tests in `validate.test.ts`: the three warnings with their new wording, the four coherent pairings in one workspace, a required list against `*` (the `photoUrls` case), and an optional list against `1..*` (sometimes absent, never empty).

  **A borrowed value is inside the boundary.** `scopeOf` answered where a value object is *defined*, so an invariant of an aggregate holding a shared-kernel `Money` was refused for constraining `Money.amount`. `valueObjectsHeldIn(boundary)` now walks the entities of the aggregate (or of every aggregate of the context), collects the value objects their attributes are typed by, and follows those values' own attributes to the end, so a `Currency` inside a held `Money` counts too. Both `invariant-in-aggregate` and `invariant-in-context` accept a target in that set wherever it is defined, and refuse it otherwise with a message that says which context defines it and that nothing here holds one. What was already accepted stays accepted: a value object of the invariant's own context is still in scope through `scopeOf`/`contextOf`, held or not, so no reference model moves. Four tests, on the review's case: the shared kernel's `Money` held by Billing's `Invoice`, an invariant on `Money.amount` accepted at aggregate and at context level, a `Rate` in the same kernel that nobody holds refused at both.

  **One pair, several exchanges.** `Consumption.path` appends the id of the first caller in `by` when — and only when — the consumer holds another consumption of the same consumable, so every ref in the four reference models is byte-for-byte what it was. `consumption-once` stops counting pairs and asks the question the ref now depends on: where a pair repeats, each consumption names at least one caller and no caller appears in two of them. Its fix text says name the callers. `findConsumption` needed no change — it compares refs. The extension's `CONSUMPTION` regex takes an optional trailing segment and matches it against the last segment of the element's first `by` ref, which is the only thing telling two elements of `consumes[]` apart; two tests in `locate.test.ts` cover the hit and the miss. `ConsumesTable`'s `rowId` is already the ref, so the row anchors follow by themselves; its comment says why. Round-trip test in `round-trip.test.ts`: a reader taking one event twice, once as a conformist archive and once through an anti-corruption layer, survives `toSchema`/`fromSchema` with both consumptions, both refs and no `consumption-once` diagnostic.

  **Decisions.** Read all three amendments and the mechanics match. Decision 24's note is the pairing table above. Decision 26's amendment is the ref rule as implemented, including "the single-consumption ref stays as it was", which the last of the `consumption-once` tests pins. Decision 27's second note is the held-not-defined rule, and its "a value nobody in the boundary holds is still refused" is the `Rate` test — I read "still" as applying to the borrowed case and left the acceptance of the invariant's own context's value objects alone, which is what keeps the diagnostics of the four models unchanged. Say if you meant the tighter reading.

  **Docs.** The three rules' `RULE_CATALOG` entries, from which `packages/skill/skill/references/validation-rules.md` is generated; the three rows in `apps/docs/docs/3-core/4-validation.md`; the ref grammar row and paragraph in `packages/skill/scripts/generate.mts`, which is where `model-reference.md` comes from (my first edit to the generated file was overwritten by `npm run generate` inside verify-all, as it should have been); the `uses` line in `skill/references/dsl-api.md` and the `has-photo` line in `skill/examples/petstore.md`.

  **Diagnostics per model, unchanged:**

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

  Every one of those is a deliberate finding the models' own tests assert; the counts are what they were before the change.

  **`bash scripts/verify-all.sh`, green end to end (exit 0):**

  ```
  === verify-all summary ===
  core: 446 tests passed
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

  `npx tsc --noEmit` clean in all twelve packages; biome check clean on every file touched.
