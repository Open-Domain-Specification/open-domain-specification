---
column: done
labels: [models, ddd]
priority: medium
agent: bumblebee
updatedAt: 2026-09-07T10:00:00.000Z
live: false
clean-code-swept: true
---
# Queries declare what they return; projections are query services

Prowl's review, findings 7 and 12. Decision 13 exists because a query promised data it could not show; the four models declare `returns` six times in total and leave a dozen queries (`GetEntitlement`, `GetAvailableBalance`, `GetOrder`, `SearchProducts`, `FindPetsByStatus` and the rest) returning nothing, including the two that invariants read. Decision 15 says read models are query services; three models model them as aggregates with invented roots (`InventoryProjection`, `SearchIndex`, `InventoryView`) and petstore's discovery notes admit "ODS has no projection element". The models follow their own decisions.

## Checklist

- [x] Every query operation in the four models declares `returns` with a schema that says what comes back; a command that returns something worth naming does too
- [x] `InventoryProjection`, `SearchIndex`, `InventoryView` and any other projection modelled as an aggregate become a query service whose operations return the projection's shape as a schema; the policies that fed the projection now issue the service's update operation; DISCOVERY.md sections updated
- [x] `.ods/` regenerated for changed models, petstore `docs/` regenerated; each model builds with only its `deliberate` diagnostics; pages fixture tests green
- [x] The skill's interview asks "what does it answer with?" for every query and the translation table's read-model row says "query service" with an example

## Comments

- **optimus-prime** (2026-09-07T10:00:00.000Z): Bumblebee, after card 63 lands (the lead will say); models and skill only, no core change.

## Journal

- **bumblebee**: Reset to develop at "card 63 done" and confirmed core already carries `returns` (decision 13's schema/DSL/rule support pre-existed from an earlier card), so this card touched models and the skill only.
- **bumblebee**: petstore — `InventoryProjection`/`InventoryView` removed; `InventoryQuery` (already existing) now also provides `RecountInventory` (the update op the "Recount on stock change" policy issues) and the `InventoryUpdated` event, and consumes the six catalog/sales events the aggregate used to. Added `InventoryUpdatedPayload` schema (carries the changed status, backing the Catalog/Inventory shared kernel that the removed entity used to back) and `returns` on `FindPetsByStatus`, `GetPetById` (new `Pet` schema), `GetOrderById` (new `OrderDetail` schema) and `GetUserByUsername` (new `User` schema). Restored `InventoryQuery.consumes(InventoryUpdated, {})` (unspecified protection, in-context) after first dropping it broke a pages fixture that demonstrates that exact case.
- **bumblebee**: rivermart — `SearchIndex`/`SearchDocument` removed; `SearchAPI` now provides `IndexProduct`/`RemoveDocument`/`DocumentIndexed` alongside `SearchProducts`, and consumes the product/buy-box events the aggregate used to. Added `SearchHit`/`SearchResults` schemas, used as `returns` on `SearchProducts` and `Ranker.RankCandidates`. Added `returns` to `GetOffer` (`OfferDetail`), `GetOrder` (`OrderDetail`), `GetCustomer` (`CustomerProfile`) and `GetSponsoredResults`/`RunAuction` (`SponsoredResults`/`SponsoredSlot`).
- **bumblebee**: northbank — added `returns` to `GetAvailableBalance` (`AvailableBalance` schema); `GetCustomer` already had `returns`. No projection-as-aggregate found in this model.
- **bumblebee**: streamline — added `returns` to `GetHomepageRows` and `Ranker.RankRows` (`HomepageRows`/`HomepageRow`), `GetEntitlement` (`Entitlement`) and `ResolveAdBreak` (`AdBreakSlots`/`AdSlot`); `GetTitle` and `ResolveEdge` already had `returns`. No projection-as-aggregate found in this model.
- **bumblebee**: left commands that only raise events (the Score*/Decide/ScoreApplication/ScoreInstruction family, Login, Logout, StopPlayback etc.) without `returns`: their answer is the event a consumer reacts to, not a value the caller reads back, so nothing was "worth naming" as a return per decision 13.
- **bumblebee**: DISCOVERY.md updated for petstore (moved the "InventoryProjection should not be an aggregate" note from Rejected to Accepted, recording decision 15's reversal) and rivermart (Search recorded as a query service, not a projection aggregate). northbank/streamline DISCOVERY.md had no "no projection element"-style claim to correct.
- **bumblebee**: skill — `translation-table.md` gained a read-model row ("a materialised view", "the read side" → query service, not a `ReadModel` construct, with an `InventoryQuery`/`GetInventory` example); regenerated the bundle (`npm run generate`, gitignored output). `interview-playbook.md` already asks "and what comes back?" for every operation (added under an earlier card alongside decision 13's core support), so no change needed there.
- **bumblebee**: `packages/doc/src/index.test.ts`'s petstore file-list snapshot updated (`vitest run -u`) to drop the removed `inventory_projection` aggregate pages — the only non-models file this card touched, and it's a fixture snapshot of the model's own doc output, not core logic.
- **bumblebee**: ran `models/petstore`'s `clean` script before the final `build` so the stale `inventory_projection` doc pages (an old `generate()` run doesn't delete pages a new run no longer emits) were actually removed rather than left stale in `docs/`.
- **bumblebee**: `bash scripts/verify-all.sh` green end to end; each model's diagnostics still exactly its `deliberate` list (northbank 3, petstore 0, rivermart 3, streamline 4, as printed below); biome clean on every file touched.

## Gates

- `bash scripts/verify-all.sh`: green (core 307, graphviz 19, doc 26, skill 26, northbank 3, petstore 18, rivermart 3, streamline 3, models/_shared 9, pages 670, apps/docs 22, apps/ods-vscode 9 tests passed; pages e2e passed; schema comparison match).
- `npx biome check` on every touched file: clean.
- Diagnostics unchanged from each model's `deliberate` list:
  - northbank: `separate-ways` (error), `consumable-kind` (error), `context-serves-subdomain` (warning) — 3 total.
  - petstore: 0.
  - rivermart: `aggregate-root` (error), `cross-aggregate-reference` (error), `partnership-backed` (warning) — 3 total.
  - streamline: `internal-consumable` (error), `schema-context` (error), `policy-complete` (warning), `partnership-backed` (warning) — 4 total.
