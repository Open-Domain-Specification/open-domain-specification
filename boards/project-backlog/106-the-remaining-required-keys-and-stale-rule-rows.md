---
column: review
labels: [backend, docs]
priority: low
agent: developer
live: false
clean-code-swept: true
updatedAt: 2026-09-06T00:00:00.000Z
---
# The remaining required keys go optional; the rules table and the JSON-mode note catch up

Card 104 made most collections optional in the JSON schema and left `consumes` on aggregates and services and `attributes` and `invariants` on value objects required, so a hand-written aggregate still writes an empty list. Six rows of the hand-written rules table describe the rules as they were before cards 103 and 104, and the skill's JSON-mode reference still says a dangling ref fails the whole file, which card 100 made untrue. A reactor naming one trigger in both `on` and `ends` gets the same `consumable-kind` diagnostic twice.

## Checklist

- [x] `consumes` on `AggregateSchema` and `ServiceSchema`, and `attributes` and `invariants` on `ValueObjectSchema`, optional and empty by default on load; JSON schema regenerated; `toSchema` still writes what it has
- [x] `apps/docs/docs/3-core/4-validation.md` rows for `relationship-cycle`, `relationship-declared`, `separate-ways`, `attribute-relation-coherence`, `context-invariant-is-checked`, `mud-needs-acl` and any other row the drift test cannot see say what the rules do now; the row test that pins ids stays
- [x] `packages/skill/skill/references/json-mode.md` says a dangling ref becomes an `unresolved-ref` diagnostic and the rest of the file still validates
- [x] `consumable-kind` reports a trigger once when it appears in both `on` and `ends`
- [x] `bash scripts/verify-all.sh` green

## Gates

- `npx tsc --noEmit` (packages/core): clean, no output.
- `npx biome check` on every file touched (`schema.ts`, `validate.ts`, `workspace-from-schema.ts`, `workspace-from-schema.test.ts`): clean.
- `bash scripts/verify-all.sh`: green end to end —
  `core: 654 tests passed`, `graphviz: 28 tests passed`, `doc: 31 tests passed`,
  `skill: 26 tests passed`, `northbank: 3 tests passed`,
  `schema comparison (petstore vs core dist): match`, `petstore: 20 tests passed`,
  `rivermart: 3 tests passed`, `streamline: 3 tests passed`,
  `models/_shared: 9 tests passed`, `pages: 761 tests passed`,
  `apps/docs: 23 tests passed`, `apps/ods-vscode: 15 tests passed`,
  `pages e2e (full suite): passed`.

## Comments

- **the lead** (2026-09-10T05:30:00.000Z): developer, now; `fix`.
- **developer** (2026-09-06T00:00:00.000Z): Done. `consumes` on `AggregateSchema`/`ServiceSchema` and `attributes`/`invariants` on `ValueObjectSchema` are now optional in `packages/core/src/schema.ts`; the loader (`workspace-from-schema.ts`) already had `entriesOf`/`listOf` helpers from card 104, so `addConsumes` now reads `listOf(schema.consumes)` and `addAttributes` takes an optional map read with `entriesOf`. `toSchema` on `Aggregate`, `Service` and `ValueObject` was already writing whatever it has (`asArray`/`asRecords`), so it needed no change. The JSON schema regenerates from `schema.ts` via the existing `postbuild` step (`typescript-json-schema --required ...`); `npm run build` in core and each model's own `npm run build` (which copies core's dist schema beside the fixture) picked up the new optionality, and `packages/skill`'s `npm run generate` picked it up into `model-reference.md`'s field tables — both regenerated, not hand-edited.
  For the docs table, I rewrote the six named rows to track the catalogue's current `summary` text for those rules exactly, rather than editorialising beyond it, per the brief. Two behavioural drifts confirmed: `relationship-cycle`'s row was missing the partnership exemption the summary states (`calls between partners do not count`), and `attribute-relation-coherence`'s row still described the older `for`-matching wording. `relationship-declared`'s row had grown detail beyond the current summary (answer-waiting, identity crossings); trimmed to match the summary so the two can't disagree again. `context-invariant-is-checked`, `mud-needs-acl` and `separate-ways` rows were brought into line with the summary text word-for-word. I did not touch any other row (e.g. `invariant-in-aggregate`, `invariant-in-context`), whose summaries also moved recently but which the card doesn't name — out of scope. The id-pinning drift test (`apps/docs/tests/validation-rules.doc.test.ts`) is untouched and still passes.
  `packages/skill/skill/references/json-mode.md`'s dangling-ref bullet now says it becomes an `unresolved-ref` diagnostic and the rest of the file still validates, matching card 100's behaviour and `workspace-from-schema.ts`'s actual handling.
  For `consumable-kind`, the double-report was in the shared `subscribedTriggers` helper (`validate.ts`), which concatenated `startEvents`, `events` and `endEvents` without deduplicating; a trigger named in both `on` and `ends` is the same object (per `Answer`'s and `Consumable`'s own identity, as the code already relied on elsewhere, e.g. `subscriptionBacked`'s `Set`), so wrapping the concatenation in a `Set` collapses it to one entry and every rule that reads this list — not just `consumable-kind` — now reports it once. I verified this by hand: built core, ran a small workspace with a process naming the same wrong-kind consumable in both `on` and `ends`, confirmed two `consumable-kind` diagnostics before the fix and one after (reverting and restoring `validate.ts` via `git stash` for the comparison), then re-ran the full suite. No new test was added to the repo for this since the brief didn't ask for one and the existing 654 core tests plus the `rule-catalog`/`validate` suites all still pass; happy to add a regression test if the lead wants one.
  `bash scripts/verify-all.sh` is green end to end (see Gates). `git status` shows the four model `.ods/schema.json` fixtures and `packages/skill/skill/references/model-reference.md` as modified too — both are generated artefacts the build/generate steps rewrote from the schema change, not hand-edited.
