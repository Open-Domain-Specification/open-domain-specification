---
column: todo
labels: [models]
priority: medium
agent: bumblebee-lite
updatedAt: 2026-09-07T12:20:00.000Z
---
# Every bare foreign id sets `identifies`

Card 67 found the sweep of card 54 was partial: roughly twenty attributes on entities across the four models hold another root's id without saying so (`PlaybackSession.householdId` and `deviceId`, `Household.accountId`, `Subscription.householdId`, `AdBreak.householdId`, `Window.titleId`, `EncodingJob.titleId`, `Consent.customerId`, `Shipment.carrierId`, `Offer.sellerId`, `WishlistItem.productId`, `Reservation.orderId`, `Campaign.sellerId`, `AdGroup.productId`, `Case.orderId` among them), and nine schema attributes carry child ids (`TitleRef.episodeId`, `StartPlayback` and `PlaybackStopped` `profileId` and `episodeId`, `EncodingCompleted.renditionIds`, `ResolveEdge.renditionIds`, `CardAuthorised.authorisationId`, `ReturnRequested.returnId`, `ReturnReceived.returnId`, `ShipmentDispatched.packageId`). The skill's playbook rule is: any attribute whose name or description says it is another entity's id sets `identifies`, the one exception being a same-context id already drawn as a `references` relation to that entity.

## Checklist

- [ ] Every attribute in the four models read against the playbook rule; each bare foreign id, on an entity, value object or schema, sets `identifies` (an attribute can only name an entity already declared, so move declarations as RiverMart and StreamLine already do, with a comment at both ends)
- [ ] `.ods/` regenerated for changed models and petstore `docs/`; each model builds with only its `deliberate` diagnostics; `bash scripts/verify-all.sh` green
- [ ] The playbook gains one sentence: schema attributes follow the same rule, because a payload that carries an id says whose it is

## Comments

- **optimus-prime** (2026-09-07T12:20:00.000Z): Bumblebee-lite, after card 72 lands (the lead will say), so the projection changes are in first. Models only. Run biome file by file, never `--write` on a directory: it reformats the generated `.ods/*.json`.
