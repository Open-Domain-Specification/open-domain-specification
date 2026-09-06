---
column: done
labels: [models]
priority: low
agent: developer
live: false
clean-code-swept: true
updatedAt: 2026-09-06T11:58:00.000Z
---
# `SubmitToScheme` sends to the scheme

Card 109 gave the Scheme Gateway its anti-corruption policy over the scheme's answers and left `SubmitToScheme` calling nothing, because the honest wiring made `reaction-cycle` report the instruction lifecycle twice. Card 108 closes that rule gap. After it lands, the Payment Scheme provides a submit operation that raises `SchemeSettlementConfirmed` and `SchemeRejected`, `SubmitToScheme` consumes it through the anti-corruption layer with `by`, and the causal walk runs through the call rather than joining only at the process. Runs after card 108.

## Checklist

- [x] Payment Scheme (external) provides the submit operation and it raises the two scheme events; `SubmitToScheme` consumes it, `anti-corruption-layer`, `by: SubmitToScheme`; the existing relationship's roles still true
- [x] NorthBank's documented three diagnostics unchanged: no `reaction-cycle` on the lifecycle, `deliberate` list in `models/northbank/src/workspace.test.ts` untouched, `DISCOVERY.md` revision note updated
- [x] The flow map runs from `PaymentInitiated` through the scheme's operation and its events to `PaymentSettled` and `PaymentRejected`
- [x] `bash scripts/verify-all.sh` green

## Gates

- [x] clean-code-swept — reviewed the diff: touched only `models/northbank/src/workspace.ts` (the operation, its schema and the ACL consumption), `models/northbank/.ods/northbank.json` (regenerated build output, not hand-edited) and `models/northbank/DISCOVERY.md` (revision note); no drive-by changes (developer, 2026-09-06T11:58:00.000Z)

## Comments

- **developer** (2026-09-06T11:58:00.000Z): Read the card, decisions 23 (2026-09-10 amendment on the process lifecycle through a translating layer), 28 (external contexts, 2026-09-10 amendments) and decision 15's "A policy issues operations; an operation raises events" section on reacting to an outside event, plus card 109's own Comments journal recording the literal wiring it tried and reverted, and card 108's `isProcessLifecycleThroughLayer` in `packages/core/src/validate.ts:4084-4097` and its NorthBank-shaped test in `packages/core/src/validate.test.ts:5388-5469`. Reapplied card 109's reverted wiring in `models/northbank/src/workspace.ts:1528-1577`: `Payment Scheme`'s `Scheme Rail` service now provides `Submit`, an operation matching RiverMart's `Acquirer API` shape (`models/rivermart/src/workspace.ts:1492-1512`), raising `SchemeSettlementConfirmed` and `SchemeRejected`; `SchemeGatewayApp` consumes it through `anti-corruption-layer`, `by: [submitToScheme]`. No new relationship needed — `paymentSchemeBC.upstreamOf(schemeBC, ...)` already carried `downstreamRoles: ["anti-corruption-layer"]`.
- **developer** (2026-09-06T11:58:00.000Z): One thing card 109's aborted attempt hadn't hit: `Submit`'s schema couldn't be the gateway's own `SchemeSubmission` (owned by `Scheme Gateway`) without `schema-context` firing — `"Submit" carries schema "SchemeSubmission" from "Scheme Gateway"; a payload belongs to the context that publishes it` — because nothing lets an external upstream borrow a shape from its own downstream (`mayCarrySchemaFrom` in `packages/core/src/validate.ts:1694-1705` only exempts a shared kernel, a conformist, or an ACL consumption where the *schema's owner* is the caller, none of which fit here). Rather than bend the model, followed RiverMart's own precedent exactly: gave `Payment Scheme` its own `SubmissionMessage` schema (`models/northbank/src/workspace.ts:1528-1535`), the scheme's inbound wire format, distinct from the gateway's outbound `SchemeSubmission` — two contexts, two shapes, translated at the boundary. This is model-honest, not a workaround: RiverMart's `ProviderRequest` is exactly this shape (`models/rivermart/src/workspace.ts:1476-1491`), owned by the external `Payment Provider` and never shared with `Payments`' own `AuthorisePayment` schema.
- **developer** (2026-09-06T11:58:00.000Z): Verified the reaction walk is quiet: `cd models/northbank && node src/generate.ts` (after building `packages/core`, `packages/graphviz`, `packages/doc` — a fresh worktree's model build needs all three, not just core) prints exactly the documented three diagnostics (`separate-ways`, `consumable-kind`, `context-serves-subdomain`), no `reaction-cycle`. `npm test` in `models/northbank` is 3/3 green, `workspace.test.ts`'s `deliberate` array untouched. Traced `ODSFlowMap.fromWorkspace(workspace)` with a scratch vitest file (removed after) and confirmed the unbroken chain: `PaymentInitiated -> Instruction lifecycle -> SendToScheme -> SubmitToScheme -> Submit -> SchemeSettlementConfirmed/SchemeRejected -> Translate the scheme's answer -> RecordSchemeAcceptance/RecordSchemeRejection -> SchemeAccepted/SchemeDeclined -> Instruction lifecycle -> PaymentSettled/PaymentRejected (ends)`. Regenerated `.ods/northbank.json` via the model's own build, not hand-edited. Updated `models/northbank/DISCOVERY.md` with a "Revision (card 110)" section recording the reapplied wiring and the schema-ownership fix.
- **developer** (2026-09-06T11:58:00.000Z): `bash scripts/verify-all.sh` green end to end — core 677, graphviz 28, doc 31, skill 26, northbank 3, petstore schema match + 20 tests, rivermart 3, streamline 3, models/_shared 9, pages 761, apps/docs 23, apps/ods-vscode 15, pages e2e (full suite incl. `e2e/diagrams-sketch.spec.ts`) passed. Confirmed `lsof -i :4173` was empty before starting.
