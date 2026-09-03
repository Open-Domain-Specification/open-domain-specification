---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: dev-opus
updatedAt: 2026-09-04T03:00:00.000Z
---
# Comments and disposition on strategic intents (RFC-002 card D)

Pin the evidence layer in core. Every strategic intent (a context relationship, a consumable, a consumption) can carry `comments` and a `disposition`, inline on the element. See docs/rfcs/rfc-002-intent-and-evidence.md sections 3 and 6, and the provisional types the designs used in packages/pages/src/lib/evidence/fixtures.ts (which this card replaces with the real ones).

## Checklist

- [ ] `packages/core/src/schema.ts`: `CommentLinkKind = "code" | "contract" | "adr" | "runbook" | "dashboard"`, `CommentLink { kind, url, label? }`, `Comment { text, link? }`, `Disposition = "by-design" | "tolerated" | "refactor"`; `comments?: Comment[]` and `disposition?: Disposition` on `DirectedContextRelationshipSchema`, `SymmetricContextRelationshipSchema`, `ConsumableSchema` and `ConsumptionSchema`
- [ ] Workspace model (`packages/core/src/workspace.ts`): the three element classes expose `comments` and `disposition`; `toSchema` and `fromSchema` round-trip them; DSL options on `upstreamOf`, `downstreamOf`, `relatesTo`, `provides`/`consumes` accept them
- [ ] `dispositionOf(element)` helper in core returning `"by-design"` when unset, and `intentsWithoutComments(workspace)` returning every strategic intent with no comments (the health report and the future rule both use it)
- [ ] JSON schema regenerated (`dist/workspace.schema.json`); the skill reference regenerated if it documents relationship options
- [ ] The four reference models gain real comments: petstore at least the shared kernel (refactor, two comments as in the Storybook fixture), Sales to Inventory (tolerated) and Catalog to Sales (two comments); each other model at least two intents
- [ ] Core coverage stays at its thresholds; `npm test` at root green; `assertDocSite` still green for the four models

## Comments

- **lead** (2026-09-04T03:00:00.000Z): Assigned to dev-opus. Fixed by decision: inline on the element, not a separate index keyed by ref; no lifecycle fields of any kind (no dates, no verified-by, no status beyond the three dispositions); `by-design` is the meaning of an absent disposition and is never written to JSON by the DSL. Names are exactly as in the checklist so pages can swap its provisional types for core's. This is a `feat!:` change: no backwards compatibility, update every reference model and generated artefact in the same tree. Do not touch pages, doc or the extension; card 22 on the extension board runs in parallel on pages. Tests that prove it: core unit suite with coverage, a round-trip test on a relationship with comments and a disposition, and the four model suites. Work in your worktree; `npm ci` there first if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
