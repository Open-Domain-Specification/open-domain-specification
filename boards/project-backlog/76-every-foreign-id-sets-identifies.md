---
column: review
labels: [models]
priority: medium
agent: bumblebee-lite
live: false
clean-code-swept: true
updatedAt: 2026-09-07T12:20:00.000Z
---
# Every bare foreign id sets `identifies`

Card 67 found the sweep of card 54 was partial: roughly twenty attributes on entities across the four models hold another root's id without saying so (`PlaybackSession.householdId` and `deviceId`, `Household.accountId`, `Subscription.householdId`, `AdBreak.householdId`, `Window.titleId`, `EncodingJob.titleId`, `Consent.customerId`, `Shipment.carrierId`, `Offer.sellerId`, `WishlistItem.productId`, `Reservation.orderId`, `Campaign.sellerId`, `AdGroup.productId`, `Case.orderId` among them), and nine schema attributes carry child ids (`TitleRef.episodeId`, `StartPlayback` and `PlaybackStopped` `profileId` and `episodeId`, `EncodingCompleted.renditionIds`, `ResolveEdge.renditionIds`, `CardAuthorised.authorisationId`, `ReturnRequested.returnId`, `ReturnReceived.returnId`, `ShipmentDispatched.packageId`). The skill's playbook rule is: any attribute whose name or description says it is another entity's id sets `identifies`, the one exception being a same-context id already drawn as a `references` relation to that entity.

## Checklist

- [x] Every attribute in the four models read against the playbook rule; each bare foreign id, on an entity, value object or schema, sets `identifies` (an attribute can only name an entity already declared, so move declarations as RiverMart and StreamLine already do, with a comment at both ends)
- [x] `.ods/` regenerated for changed models and petstore `docs/`; each model builds with only its `deliberate` diagnostics; `bash scripts/verify-all.sh` green
- [x] The playbook gains one sentence: schema attributes follow the same rule, because a payload that carries an id says whose it is

## Comments

- **optimus-prime** (2026-09-07T12:20:00.000Z): Bumblebee-lite, after card 72 lands (the lead will say), so the projection changes are in first. Models only. Run biome file by file, never `--write` on a directory: it reformats the generated `.ods/*.json`.
- **bumblebee-lite** (2026-09-05T00:00:00.000Z): Done. Read every attribute in all four models against the playbook rule, applied it beyond the card's own example list (the list was explicitly a starting point): every bare foreign id on an entity, value object or schema now sets `identifies`, including the identity-attribute-is-also-a-foreign-id cases the rule allows (`ShipmentDispatched.packageId`, `ReturnRequested`/`ReturnReceived.returnId`, `CardAuthorised.authorisationId`, and by the same logic several more not named on the card: `buyBoxAwardedSchema.sku`, `stockReservedSchema.orderId`, `orderRiskSchema.orderId`, `sellerRiskSchema.sellerId`, `searchHitSchema.productId`, `sponsoredSlotSchema.productId`, `submissionSchema`/`settlementSchema.instructionId`, `profileCreatedSchema.profileId`, `homepageRowSchema.titleId`, `decisionRequestSchema`/`decisionMadeSchema.applicationId`). Declarations moved with a comment at both ends wherever the target root wasn't yet declared (RiverMart: `Offer.sellerId` plus the invariant that reads it, moved to the SellerAccount section; StreamLine: `Window.titleId`/`LicenseWindow.titleId` to the Title section, `PlaybackSession.householdId`/`deviceModelId` plus `WithinStreamLimit` to the Household/Device sections, `Household.accountId`/`HouseholdCreated.accountId` to the Account section). Left `RiskAssessment.subjectId` (RiverMart) and `PlaybackSession.deviceId` (StreamLine) bare — see Decisions. `.ods/` regenerated for all four; petstore `docs/` regenerated (two files changed); RiverMart/NorthBank/StreamLine docs regenerated with no diff (attribute-level `identifies` additions didn't change rendered markdown/SVG content). Playbook gained the one sentence. `bash scripts/verify-all.sh` green end to end.

## Gates

- `bash scripts/verify-all.sh`: exit 0. Summary: core 313 tests, graphviz 19, doc 27, skill 26, northbank 3, petstore 18, rivermart 3, streamline 3, models/_shared 9, pages 671, apps/docs 22, apps/ods-vscode 9, pages e2e (diagram-panel-fit) passed, schema comparison (petstore vs core dist) match.
- Per-model diagnostics, each matching only its documented `DELIBERATE` findings:
  - Petstore: 0 diagnostics.
  - RiverMart: 3 (`aggregate-root` Wishlist, `cross-aggregate-reference` Cart/WishlistItem, `partnership-backed` Search/Advertising).
  - NorthBank: 3 (`separate-ways` Branch & Contact Centre/Credit Decisioning, `consumable-kind` Escalate arrears, `context-serves-subdomain` Identity & Access).
  - StreamLine: 4 (`partnership-backed` Playback/Devices, `internal-consumable` TasteProfile/BookmarkUpdated, `schema-context` PlaybackStarted/TitleRef, `policy-complete` Recertify on SDK release).
- `npx biome check` on every touched `workspace.ts` (file by file, never on a directory): clean.

## Decisions

- **bumblebee-lite** (2026-09-05T00:00:00.000Z): QUESTION for lead — two attributes the card names don't have a clean `identifies` target and I left them bare rather than guess:
  - RiverMart `RiskAssessment.subjectId`: description says "An order id or a seller id" — a polymorphic id `identifies` can't point at two entities at once. Left as-is.
  - StreamLine `PlaybackSession.deviceId` / `StartPlayback.deviceId`: the model's own comment says this is "the individual unit (an installation), not the partner model" — there's no declared entity for an individual installation, only `Device` (the partner model). I set `identifies: device` on `deviceModelId` instead, since that's the field that actually names the Device root, and left `deviceId` bare. Flagging in case the intended fix was to model an installation entity, or to point `deviceId` at `Device` anyway despite the comment.
