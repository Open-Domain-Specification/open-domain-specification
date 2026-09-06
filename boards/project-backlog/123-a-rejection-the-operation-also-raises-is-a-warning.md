---
column: review
labels: [backend, docs]
priority: low
agent: developer
live: false
clean-code-swept: true
updatedAt: 2026-09-06T16:20:00.000Z
---
# A rejection the operation also raises is a warning

Card 117's `Offer Slot` rejected with `PatientWaitlisted` and raised an event carrying the same shape, which is a model telling on itself: a rejection says nothing happened (decision 25) and a raised event says something did. Nothing reported it. A warning, `rejection-raised`, says: this operation rejects with a shape it also raises as an event; if something happened, it is the event and not a refusal, drop the rejection; if nothing happened, it is not an event.

## Checklist

- [x] `rejection-raised` (warning) in the catalogue with summary, why and fix text as above; fires when a `rejects` entry's schema is the payload schema of an event in the operation's `raises`
- [x] Tests: the clinic's original shape warns; an operation that rejects with one shape and raises an event of another does not; the reference models' diagnostics unchanged
- [x] `apps/docs/docs/3-core/4-validation.md` row; skill references regenerated; `bash scripts/verify-all.sh` green

## Gates

- [x] clean-code-swept — read back `packages/core/src/validate.ts:4052-4083` and the catalogue entry against the shape of the neighbouring `raises-restated`/`raises-in-context` rules before marking for review; no drive-by changes outside the card's checklist (developer, 2026-09-06T16:15:00.000Z)
- [x] verify-all — `bash scripts/verify-all.sh` green end to end: `core: 729 tests passed`, all four reference models' diagnostic counts unchanged (northbank 3, petstore 0, rivermart 2, streamline 4), `clinic: 7 tests passed` with the model now also carrying the new `rejection-raised` warning on `Offer Slot`, and the full pages e2e suite (297 passed) (developer, 2026-09-06T16:18:00.000Z)

## Comments

- **developer** (2026-09-06T16:20:00.000Z): Added the `rejection-raised` warning rule at `packages/core/src/validate.ts:4064-4085`, shaped like `raises-restated`: for every operation, each rejection whose schema equals the schema of an event the operation raises is flagged. Catalogue entry with summary/why/fix at `packages/core/src/validate.ts:5432-5439`. Tests at `packages/core/src/validate.test.ts:4599-4655` cover card 117's original `Offer Slot` shape (warns) and a rejects/raises-different-shapes case (silent); the fixture in `packages/core/src/rule-catalog.test.ts:301-314` trips the rule so `rule-catalog.test.ts` still pins one fixture per rule id. Docs row added at `apps/docs/docs/3-core/4-validation.md:74`; `packages/skill/skill/references/validation-rules.md` regenerated via `npm run generate` in `packages/skill` (confirmed the `rejection-raised` heading landed). `models/clinic/src/workspace.test.ts:18-31` now pins the new warning alongside the existing `domain-service-consumes-inside` error, since the rule now fires on the clinic's real `Offer Slot`; the model itself (`models/clinic/src/workspace.ts`) is untouched, left for card 122. `models/clinic/docs/outpatient_clinic/index.md` is a regenerated build artifact reflecting the same new diagnostic. The four reference models (northbank, petstore, rivermart, streamline) are untouched and their diagnostic counts are unchanged. `bash scripts/verify-all.sh` green end to end.
