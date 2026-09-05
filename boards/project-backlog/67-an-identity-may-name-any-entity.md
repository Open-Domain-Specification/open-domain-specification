---
column: done
labels: [backend, ddd, breaking]
priority: high
agent: ironhide
live: false
clean-code-swept: true
updatedAt: 2026-09-05T12:30:00.000Z
---
# An identity may name any entity, not only a root

Prowl's review, finding 1: `identifies-root` refuses `PlaybackSession.profileId identifies Profile` and `episodeId identifies Episode`, so StreamLine carries no `identifies` on either and nothing flags the silence. A claim against a coverage inside a policy, an appeal against a decision inside a case: real systems cross boundaries by child identity constantly, and the child stays inside its aggregate exactly because its parent's invariants need it there. The rule's fix text ("it should be an aggregate of its own") contradicts those invariants. Decision 14 is amended: an identity names an entity; if that entity is not a root, the dependency is on the aggregate reached through its root, and the map draws it so.

## Checklist

- [x] `identifies-root` becomes `identifies-entity` (error): the ref resolves to an entity, root or not; doc comment and catalogue give the DDD reason (you hold the child's id and reach it through its root); `cross-context-relation`'s fix text stops promising a root
- [x] Relation map draws the identity edge to the named entity; when it is a child, the edge lands on the child inside its aggregate's cluster
- [x] Reference models: StreamLine's `PlaybackSession.profileId` and `episodeId`, and every other bare child id the sweep rule on the skill's playbook would catch, set `identifies`; `.ods/` regenerated
- [x] Decision 14's amendment paragraph updated (the lead writes the ruling; you write the mechanics if it needs a sentence)
- [x] Root suites green inside each package in build order; pages at 100% with `npm run check` clean

## Gates

- `clean-code-swept`: swept 2026-09-05. The rule kept the existing `attributeOwnersOf` walk and lost its root branch, so it is shorter than what it replaced; no new node kind, edge kind or map code was needed, because the identity edge already targets the entity named and a child node already carries its own aggregate's namespace — the change is a rule, wording and models. biome clean on every file touched (`npx biome check` over the twelve source files, no fixes applied); `npx tsc --noEmit` clean in core, doc, graphviz, models/streamline and apps/docs; `npm run check` clean in pages. Two pre-existing conditions left alone: biome reformats the generated `.ods/*.json` and two unrelated source files if pointed at whole directories, so it was run file by file, and the generated JSON is left exactly as its generator writes it.
- `qa-automated`: `bash scripts/verify-all.sh` green end to end from the worktree root —

```
core: 313 tests passed
graphviz: 19 tests passed
doc: 27 tests passed
skill: 26 tests passed
northbank: 3 tests passed
petstore: 18 tests passed
rivermart: 3 tests passed
streamline: 3 tests passed
models/_shared: 9 tests passed
pages: 669 tests passed
apps/docs: 22 tests passed
apps/ods-vscode: 9 tests passed
pages e2e (diagram-panel-fit): passed
schema comparison (petstore vs core dist): match
```

## Comments

- **optimus-prime** (2026-09-07T10:00:00.000Z): Ironhide, after card 58 lands (the lead will say). `feat!` because the models change.
- **ironhide** (2026-09-05T12:20:00.000Z): Claimed. Reset to 4275455 and installed. `identifies-entity` is at packages/core/src/validate.ts:163-195 with its catalogue entry at packages/core/src/validate.ts:1501-1512. The check that was left after dropping `target.root` is `workspace.getEntityByRef(target.ref) === target`: root or child is now the modeller's call, but an identity naming an entity this workspace does not have — one built against another workspace, or dropped since — reaches nothing, and that is the error the id can still be. Load from JSON already throws on an unresolvable ref, so this is the reachable half of "the ref resolves to an entity"; the completeness fixture trips it with a root from a second workspace (packages/core/src/rule-catalog.test.ts:5-16 and :37-43) rather than a cast. The doc comment and the `why` make the DDD argument the card asked for: the session names the profile inside the household, the claim the coverage inside the policy, the child stays inside its aggregate because its parent's invariants need it there, and you hold the child's id and reach it through its root. `cross-context-relation`'s fix text now says "the other entity's identity" and adds the child case. Three cases at packages/core/src/validate.test.ts:157-224 (a child of another aggregate is quiet, a schema attribute naming a child is quiet, a stranger entity errors).
- **ironhide** (2026-09-05T12:24:00.000Z): The map needed no code. `ODSRelationMap`'s identity edge already targets `relationNode(attribute.identifies)`, and `relationNode` namespaces an entity by `aggregateNamespace(node.aggregate)`, so a child gets its own aggregate's cluster in the Graphviz digraph, the PlantUML packages and the pages flow graph alike — all three group by the innermost namespace. What the card asked for is therefore a test rather than a change: packages/core/src/derived-maps.test.ts:194-232 builds a session that identifies a profile inside a household and asserts the edge lands on Profile (typed `entity`, not the root standing in for it), that Profile's innermost namespace is the Household aggregate, and that Household draws beside it as `entity_root`. Comments that promised a root are corrected in packages/core/src/relation-map.ts, packages/graphviz/src/relation-map.ts, packages/pages/src/lib/flow/relation-graph.ts, and the pages legend now reads "Identity of another entity".
- **ironhide** (2026-09-05T12:27:00.000Z): Models. A scan of all four workspaces for `*Id`/`*Ids` attributes whose stem names an entity found the bare child ids; the entity and value-object ones are set, all in StreamLine: `PlaybackSession.profileId` and `episodeId` (the card's two), `StreamManifest.renditionIds` and `CachedAsset.renditionId` (Encoding's Rendition, which the player addresses by id, which is why it is an entity at all), and `TasteProfile.profileId`, whose own identity is the profile it is built for. `profileId` on the session and the taste profile move to the Households & Profiles section, because an attribute can only name an entity that already exists and Profile is declared there — the same idiom RiverMart already uses for its customer ids, with a comment saying why. Edits are attributes only, so nothing collides with card 72's services and `returns` in the same files. No other model has a bare child id on an entity or a value object; petstore has none at all.
- **ironhide** (2026-09-05T12:29:00.000Z): QUESTION for lead, not blocking — the sweep left two seams and I took the narrow reading of the card rather than widening it. (1) Nine bare child ids remain on *schema* attributes (StreamLine's `TitleRef.episodeId`, `StartPlayback` and `PlaybackStopped`'s `profileId`/`episodeId`, `EncodingCompleted.renditionIds`, `ResolveEdge.renditionIds`; NorthBank's `CardAuthorised.authorisationId`; RiverMart's `ReturnRequested.returnId`, `ReturnReceived.returnId`, `ShipmentDispatched.packageId`). The validator and the doc generator both support `identifies` on a schema attribute, but no reference model sets one today, and the relation map only draws entity and value-object owners, so setting them would be a new practice for doc value alone. Say the word and it is a small follow-up. (2) Independently of this card, roughly twenty bare *root* ids sit on entities across the four models (`PlaybackSession.householdId` and `deviceId`, `Household.accountId`, `Subscription.householdId`, `AdBreak.householdId`, `Window.titleId`, `EncodingJob.titleId`, `Consent.customerId`, `Shipment.carrierId`, `Offer.sellerId`, `WishlistItem.productId`, `Reservation.orderId`, `Campaign.sellerId`, `AdGroup.productId`, `Case.orderId` among them) — card 54's sweep was partial, and the playbook rule would catch every one. That is a card of its own, not mine to open.
- **ironhide** (2026-09-05T12:30:00.000Z): Beyond the checklist, the same rule's own surface: the hand-written rule table and two prose passages in apps/docs (2-ddd/2, 3-core/3 and 3-core/4), and apps/docs/tests/validation.example.test.ts, whose fixture held exactly the case the amendment legalises — the inline snapshot lost its `identifies-root` line and the comment now says a child id is a dependency the model records, not an error. Decision 14 gained a mechanics paragraph under the 2026-09-07 amendment. Regenerated: skill references and bundle, StreamLine's `.ods/`, core `dist/workspace.schema.json` and the embedded copy in every model's `.ods/schema.json`. Ready for review; not pushed.
