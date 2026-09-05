---
column: done
labels: [backend, ddd, breaking]
priority: medium
agent: ironhide
live: false
clean-code-swept: true
updatedAt: 2026-09-08T12:40:00.000Z
---
# A relation names its attribute

Card 82 made `attribute-relation-coherence` match by label when several relations target one type, which forces a relation's label to equal the attribute's name and turns the relation map's phrases ("held in", "in arrears of") into field names. The honest link is explicit: `EntityRelationSchema.for?: string`, the attribute this relation draws. Coherence matches by `for` first, then the only relation to the type, then not at all (ambiguous, fix text names `for`); labels stay phrases.

## Checklist

- [x] `for?: string` on `EntityRelationSchema` (and the value object relation if separate); DSL (`uses(target, label, { for })` or the closest fit), `toSchema`/`fromSchema`, JSON schema regenerated
- [x] `attribute-relation-coherence` matches by `for`, then the only relation, then reports ambiguity naming `for`; the label match from card 82 removed; the core test that changed its labels for card 82 gets its phrases back with `for` set
- [x] `relation-for-resolves` (error): `for` names an attribute of the relation's own entity
- [x] Reference models set `for` wherever one type is used twice by one entity; `.ods/` regenerated — no entity or value object in any of the four uses one target twice (checked over `allRelations`, so inherited ones counted), so there is nothing to set; the `.ods/` files are regenerated and carry the new schema
- [x] `bash scripts/verify-all.sh` green

## Gates

- [x] clean-code-swept — `for` is one optional field carried the way `cardinality` already is: on `EntityRelationSchema`, on `EntityRelationAttributes` (through a new `EntityRelationOptions`, the type the DSL's fourth argument takes), on the class, and through `toSchema`; `fromSchema` needed no change because it hands the relation schema straight to `addRelation`. The coherence rule's two halves each lost a branch rather than gained one: forward is `find(r => r.for === attribute.name) ?? (only candidate)`, reverse is `relation.for ? typed.some(...) : (one sibling && typed.length > 0)`. The new rule is fifteen lines beside the one it serves, catalogued next to it. No page template, no renderer and no model source touched. Biome checked file by file on every file edited, never `--write` on a directory (ironhide, 2026-09-08T12:40:00.000Z)

## Comments

- **optimus-prime** (2026-09-08T05:30:00.000Z): Ironhide, after card 78 lands (the lead will say); `feat!`.

- **ironhide** (2026-09-08T12:40:00.000Z): Done on `agent-a0f35a50d273924d9`, off `develop` at `7109285` (card 86 dispatched).

  **The DSL shape I chose**, since the card left it to me: the fourth argument, an options object, `uses(target, label, cardinality?, { for })` — likewise `includes` and `references`, and `for` joins the attributes object on `addRelation`/`relatesTo`. The label is already positional and the cardinality after it, so the closest fit to the existing methods was to leave both alone and add the object at the end; every existing call site reads as before and only a relation that needs to name an attribute mentions one. Making the third argument an options object instead would have rewritten all 88 `uses` calls in the reference models plus their equivalents in tests and skill examples, for one new optional field. `EntityRelationOptions` is exported so `addRelation` and the three methods share one definition.

  **The rule.** `attribute-relation-coherence` pairs an attribute with the relation whose `for` is its name; failing that, with the only `uses` relation to that value object; failing that, not at all, and it says so naming `for`. The reverse half now reads `for` where one is written and falls back to "the only relation, and something is typed by it" where none is, so a relation drawing an attribute that is not typed by its target is reported whether it is alone or one of several. The label is never looked at again; card 82's label match is gone.

  `relation-for-resolves` (error) is new: a `for` that names no attribute of the source, own or inherited, is a rename nobody finished, and it silently costs coherence the half it was looking for. It fires on the whole model, not only on `uses` relations, because a `for` is a claim wherever it is written.

  **The card-82 test has its phrases back.** In `validate.test.ts` the current-address-and-history case is now `uses(money, "lives at", "1", { for: "currentAddress" })` beside `uses(money, "has lived at", "*", { for: "addressHistory" })`, and the specialisation case reads "balanced at" and "in arrears of" — the card's own example. A new test pins the reverse: two relations labelled `"currentAddress"` and `"addressHistory"` with no `for` are still ambiguous, so nothing pairs by label any more. Round-trip coverage for `for` is a new case in `round-trip.test.ts`.

  **Reference models.** None of the four has an entity or value object that uses one target twice — I checked each model's `allRelations` for a repeated `relation:target` pair and got zero in all four — so there is no `for` to set. Every model's diagnostics are unchanged, which the `deliberate` lists in their own tests assert exactly:

  ```
  northbank: 4 diagnostics
    [warning] relationship-declared: "Branch & Contact Centre" consumes "Decide" from "Credit Decisioning", but no relationship says how "Credit Decisioning" and "Branch & Contact Centre" stand to each other
    [error]   separate-ways: "Branch & Contact Centre" consumes "Decide" from "Credit Decisioning" although the contexts declare separate ways
    [error]   consumable-kind: Policy "Escalate arrears" issues "ArrearsNoticeIssued", which is an event, not an operation
    [warning] context-serves-subdomain: Bounded context "Identity & Access" serves no subdomain, so it is missing from the problem-space view
  petstore: 0 diagnostics
  rivermart: 2 diagnostics
    [error] aggregate-root: Aggregate "Wishlist" has 2 root entities; an aggregate has exactly one
    [error] cross-aggregate-reference: "Cart" includes "WishlistItem" in another aggregate; across aggregates only "references" is allowed
  streamline: 3 diagnostics
    [error]   internal-consumable: "RecommendationsAPI" consumes "BookmarkUpdated" from "Playback", but it is internal to that context
    [error]   schema-context: "PlaybackStarted" carries schema "TitleRef" from "Catalogue"; a payload belongs to the context that publishes it
    [warning] policy-complete: Policy "Recertify on SDK release" issues no command
  ```

  **Docs.** `model-reference.md` and `validation-rules.md` are generated (`npm run generate` in `packages/skill`); `dsl-api.md`, `translation-table.md`, the docs site's rule table and its tactical-design page are hand-written and say `for` now. The docs site's `model.example.test.ts` snapshot gains one `"for": undefined` line beside the `"cardinality": undefined` already there.

  **`bash scripts/verify-all.sh` from the worktree root, green end to end (exit 0):**

  ```
  === verify-all summary ===
  core: 436 tests passed
  graphviz: 25 tests passed
  doc: 31 tests passed
  skill: 26 tests passed
  northbank: 3 tests passed
  schema comparison (petstore vs core dist): match
  petstore: 20 tests passed
  rivermart: 3 tests passed
  streamline: 3 tests passed
  models/_shared: 9 tests passed
  pages: 745 tests passed
  apps/docs: 23 tests passed
  apps/ods-vscode: 13 tests passed
  pages e2e (full suite): passed
  ```

  `npx tsc --noEmit` clean in `packages/core`, `packages/graphviz`, `packages/doc`, `packages/skill`, all four models, `apps/docs` and `apps/ods-vscode`; biome clean on every file touched.

  **QUESTION for lead** (not blocking, nothing done about it): no reference model uses one value object twice, so `for` ships with no model exercising it — only core tests. If you want one of the four to carry the feature the way the card's own example does (a customer's current address beside its address history), that is a modelling change and yours to call; say which model and I will do it as its own card.
