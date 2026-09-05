---
column: review
labels: [models, docs]
priority: low
agent: bumblebee-lite
clean-code-swept: true
live: false
updatedAt: 2026-09-05T00:00:00.000Z
---
# The discovery notes and model headers tell the current truth

Prowl's review, finding 14: StreamLine's and RiverMart's headers say "three deliberate mistakes" while their tests assert four; both DISCOVERY.md files say four in section 7 and "exactly those three" in section 9; RiverMart's sections 4 and 6 still describe cross-context `references` and a per-aggregate value object; StreamLine's section 9 rejects a finding on grounds decision 14 reversed; petstore's section 9 "kept" a policy issuing another context's operation, which decision 17 forbids; NorthBank cites decision 15 for the rule that is decision 14.

## Checklist

- [x] Each of the four DISCOVERY.md files read top to bottom against the current rules (`apps/docs/docs/3-core/4-validation.md`) and decisions 13 to 28; every stale count, rule name, decision number and "kept" that the model no longer does corrected; each `deliberate` entry named in section 7 with what it teaches
- [x] Each model's `workspace.ts` header comment matches its `deliberate` array
- [x] No model or test change beyond comments; models still build and pass

## Gates

- `npm run build` in `packages/core`, `packages/graphviz`, `packages/doc`: all three succeed.
- `npx vitest run` in each model directory: petstore 18/18, rivermart 3/3, streamline 3/3, northbank 3/3, all passing.
- `node src/generate.ts` in each model directory reports only the `deliberate` diagnostics: petstore 0, rivermart 3, streamline 4, northbank 3 — each matching its `workspace.test.ts` `deliberate` array.
- `npx biome check` run file by file on every changed file: clean, no fixes needed.

## Journal

Read the current rule table (`apps/docs/docs/3-core/4-validation.md`) and decisions 13–28, then each model's DISCOVERY.md against them. Found StreamLine's and RiverMart's headers and `deliberate` arrays already agree on their counts (four and three), so the only staleness left was inside the prose:

- **StreamLine** `DISCOVERY.md` section 9: said "three deliberate problems ... exactly those three" while section 7 lists four; corrected to "four". Also corrected the Rejected note about a cross-context `references` relation on PlaybackSession/Signal to Title — the model already holds a scalar `titleId` with `identifies`, not a `references` relation, since decision 14 forbids a relation crossing a context.
- **RiverMart** `DISCOVERY.md`: section 4 said the warehouse's `FulfilmentOrder` "`references` the customer `Order` by identity only" — corrected to describe the `orderId`/`identifies` attribute decision 14 requires, since a relation may not cross a context. Section 6's shared-kernel bullet said a value object "belongs to an aggregate" — corrected to bounded context (decision 16) and reworded to describe the mirrored-not-borrowed structure honestly. Section 6's closing bullet described cross-context `references` — corrected to identity attributes. Section 9's "partially accepted" note on `OneActiveOfferPerSellerSku` said "ODS invariants belong to an aggregate" — corrected to describe the bounded-context invariant decision 27 added, which is what the model already implements.
- **Petstore** `DISCOVERY.md` and `workspace.ts`: both still described Sales' policies as "issuing Catalog's open-host operations" / "a policy issuing another context's operation", and the model's own header comment said the same beside a cross-context `references` relation. The model already implements decision 17 and 14 correctly (local operations calling out through the ACL; a `petId` identity attribute, not a relation) — corrected all four passages (the aggregate-section header comment, "Inside the contexts", "Behaviour", and the section 9 Rejected note) to describe what the model does today.
- **NorthBank** `DISCOVERY.md` section 10: cited "decision 15" for the rule that a relation may not cross a context boundary; that is decision 14. Corrected.

No model, DSL or test file was touched; every change is prose in a `DISCOVERY.md` or a header/section comment in a `workspace.ts`.

## Comments

- **optimus-prime** (2026-09-07T10:00:00.000Z): Bumblebee-lite, after cards 63 and 72 land (the lead will say), so the prose is corrected once.
- **bumblebee-lite** (2026-09-05T00:00:00.000Z): Cards 63 and 72 confirmed done before starting. Checklist complete, gates green; see Journal above for the corrections made. Ready for review.
