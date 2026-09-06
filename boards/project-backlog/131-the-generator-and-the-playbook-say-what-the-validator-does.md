---
column: done
labels: [docs]
priority: high
agent: developer
live: false
clean-code-swept: true
updatedAt: 2026-09-06T17:30:00.000Z
---
# The generator and the playbook say what the validator does; three more costs on the list

The architect's fourteenth round found two hand-written sentences that contradict the validator and slipped past card 129's drift test: `packages/skill/scripts/generate.mts` writes "A ref that points at nothing makes the whole file fail to load" into the generated model reference, the opposite of decision 29; and the interview playbook says an invariant's guard is "only an operation of the same aggregate", which decision 19 widened to any service of the context, and fourteen lines later tells the author to name the front that fetched the fact. Five rows of the validation table lag their rules (`shared-kernel-backed` omits operations, `consumption-by-resolves` omits processes, `aggregate-root`, `root-identity` and `context-serves-subdomain` omit their exemptions) and the docs index still says four model packages. Three costs to add to the leaves-out list and `preferences.md`: roles are restated on every crossing exchange and again on the relationship (decision 03); partners share a shape only through a shared kernel declared beside the partnership (decision 16); there is no extension field, an unknown key is a diagnostic and is dropped on save, and comments live on four seams only (decision 15). Runs in parallel with card 130, which touches the validator; the validation table rows for 130's rules are 130's.

## Checklist

- [x] `generate.mts`'s sentence says a dangling ref is an `unresolved-ref` diagnostic and the rest of the file loads; the playbook's guard sentence says any service of the context may guard, and the two passages agree; the drift test in `packages/skill` reads the generated reference and the playbook for these sentences too
- [x] The five validation table rows say what the rules do now; the docs index says five model packages and names the clinic
- [x] The three costs added to the docs' leaves-out list and to `preferences.md`, with their decisions
- [x] `bash scripts/verify-all.sh` green

## Gates

- [x] verify-all — `bash scripts/verify-all.sh` green end to end: core 763, graphviz 28, doc 31, skill 38, northbank 3, petstore 23, rivermart 6, streamline 3, clinic 7, models/_shared 9, pages 765, apps/docs 23, apps/ods-vscode 15, pages e2e full suite 297 passed; schema comparison matched (developer, 2026-09-06T17:30:00.000Z)
- [x] clean-code-swept — reviewed the diff: prose-only edits matching existing wording conventions, one generator string, one drift-test extension, five table-row edits, one docs-index paragraph, three preference/leaves-out bullets; no drive-by changes (developer, 2026-09-06T17:30:00.000Z)

## Comments

- **developer** (2026-09-06T17:30:00.000Z): Fixed `generate.mts`'s dangling-ref sentence at `packages/skill/scripts/generate.mts:148` to say `unresolved-ref` and that the rest of the file loads (decision 29), and regenerated `packages/skill/skill/references/model-reference.md` from it via `packages/core` build + `npm run generate` in `packages/skill`. Widened the playbook's invariant-guard sentence at `packages/skill/skill/references/interview-playbook.md:119-122` from "only an operation of the same aggregate" to "any service of the context" (decision 19), which now agrees with the front-fetched-fact sentence fourteen lines later. Extended `packages/skill/src/validator-drift.test.ts` to also read `packages/skill/scripts/generate.mts` and the generated `model-reference.md`, and pinned both stale sentences as claims that must never come back; 12/12 tests green.
- **developer** (2026-09-06T17:30:00.000Z): Brought five validation-table rows in `apps/docs/docs/3-core/4-validation.md` up to date against `packages/core/src/validate.ts`: `aggregate-root` (line 17) and `root-identity` (line 21) now state the big-ball-of-mud exemption; `shared-kernel-backed` (line 45) now includes the operation-call form of sharing; `consumption-by-resolves` (line 53) now names processes alongside policies; `context-serves-subdomain` (line 78) now states the external and shared-kernel exemptions. Updated `apps/docs/docs/3-core/index.md`'s reference-models section (around line 94) to say five packages and describe the new `models/clinic` package, modelled blind from the skill and docs alone. Left the other rows of the table alone — card 130 owns those.
- **developer** (2026-09-06T17:30:00.000Z): Added the three named costs to `apps/docs/docs/3-core/3-tactical-design.md`'s leaves-out paragraph and to `packages/skill/skill/references/preferences.md` (new "No extension field" preference plus three new cost bullets): roles restated on every crossing exchange and again on the relationship (decision 03, its second 2026-09-10 note); a partnership shares no shape of its own, only through a shared kernel declared beside it (decision 16, second 2026-09-10 amendment); there is no extension field, an unknown key is dropped on save after being reported, and comments live on four seams — consumables, consumptions, relationships and processes (decision 15, "There is no extension field").
- **developer** (2026-09-06T17:30:00.000Z): Ran `bash scripts/verify-all.sh` end to end after checking no extension host or port-4173 listener was running; it passed on the first attempt, all packages and the full pages e2e suite green (see Gates). Card moved to review.
