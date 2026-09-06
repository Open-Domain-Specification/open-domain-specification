---
column: done
labels: [bug, frontend, infra]
priority: high
agent: dev-opus
live: false
clean-code-swept: true
updatedAt: 2026-09-06T01:00:00.000Z
---
# The narrow-tier spec forbids a sideways scroll the design allows

Card 45 fixed the map badge; one Linux failure remains and blocks the release. `packages/pages/e2e/relationship.spec.ts:303-305` asserts the Strategic position frame's `scrollWidth - clientWidth <= 2` at 1300px beside the tree. On the runner it is **34**: with wider fonts the six columns want about 794px of the 760px the frame has, even inside the narrow tier where cells already break between tokens.

That is not a defect in the page. `docs/design/design-language-v2.md` and cards 33 and 37 make the frame's own sideways scroll the deliberate escape hatch when content cannot fit, and `relationship.spec.ts:305` ("narrower still, the Strategic position scrolls inside its own frame and the page never does") asserts exactly that. So the failing clause forbids, on one machine's metrics, what the design permits everywhere.

Decide what this spec should guarantee and say it in terms no font can move. The invariants that matter to a reader are: the **page** never scrolls sideways, the description keeps its prose floor, rows stay on their first line, and tokens stay whole. Whether the frame itself scrolls a little is the design's own release valve.

## Checklist

- [x] The clause at `relationship.spec.ts:303-305` says what the design guarantees; the page-level no-sideways-scroll invariant is asserted here if it is not already
- [x] The comment above it is rewritten: the current one explains a 2px rounding artefact that is no longer what the numbers say
- [x] If you conclude the 34px means the narrow tier's 900px threshold is genuinely too low for wide fonts, say so with the arithmetic and change the threshold instead; do not do both
- [x] Whatever you choose still fails on the original defect it guards: the description collapsing to a word a line (119px wide, 111px tall)
- [x] Full Playwright suite green locally; pages unit unchanged at 100%

## Gates

- [x] qa-automated — full Playwright 254/254 locally; the CI e2e job on PR 24 is the Linux proof (lead, 2026-09-06T01:00:00Z)

- [x] tests-passing — 254 Playwright passed, 644 pages unit passed at 100% statements/branches/functions/lines (dev-opus, 2026-09-06T10:30:00.000Z)
- [x] clean-code-swept — 17-line, single-file diff, so a self-scan per the skill's proportionality gate; one DRY hit I had introduced (the page-scroll block duplicated between the two tests) fixed by extracting `expectNoSidewaysScroll` (dev-opus, 2026-09-06T10:30:00.000Z)

## Comments

- **lead** (2026-09-06T00:20:00.000Z): Assigned to dev-opus. This is the last thing between us and the release, so be quick and do not widen scope. You cannot reproduce the runner's fonts; reason from the number in run 33912334067 (34px against a 760px frame). Do not delete the spec, do not skip it, and do not simply raise the tolerance to 34 — a tolerance tuned to one runner is the same mistake in a new place. Work in your worktree with absolute paths; build core, graphviz and pages first; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
- **dev-opus** (2026-09-06T09:00:00.000Z): Picked this up. Read `packages/pages/e2e/relationship.spec.ts:253-305` and the helper `packages/pages/e2e/helpers.ts:80-89`. The 1300px test already asserts the prose floor, the prose row, top alignment and the stacked-token behaviour; the only clause that is font-dependent is the frame overflow one at `relationship.spec.ts:296-305`. Replacing it with the page-level invariant rather than touching the 900px threshold.
- **dev-opus** (2026-09-06T10:30:00.000Z): Kept the 900px threshold and rewrote the clause. The frame-overflow assertion at `packages/pages/e2e/relationship.spec.ts:296-305` is gone; in its place `relationship.spec.ts:308` asserts the page-level invariant, and the comment at `relationship.spec.ts:299-307` now says why the frame's own overflow is the design's release valve and not something a spec should pin. The arithmetic supports leaving the threshold alone: 794px of want against 760px is 34px, 4.5% over, and the narrow tier is already engaged there (the token-stacking assertions at `relationship.spec.ts:288-296` pass on the runner) — a wider threshold would only move the same font-dependent cliff to another viewport, and 33/37 made the frame scroll the answer for exactly this case.
- **dev-opus** (2026-09-06T10:31:00.000Z): Proved the test still fails on the defect it guards by mutating the tier away — `@container (max-width: 900px)` at `packages/pages/src/lib/atoms/DataTable.svelte:218` set to `1px`, rebuilt, and the test failed at `relationship.spec.ts:296` (the warning word no longer drops under its name). On this machine's fonts the description measured 180.5x66 in the mutant, so the prose floor alone would not have caught it here; on the runner's wider metrics it was the 119x111 collapse the card names. The two clauses together cover both, which is why I left the floor in place. CSS restored and rebuilt before the final run.
- **dev-opus** (2026-09-06T10:32:00.000Z): Sweep and evidence recorded under `## Gates`. Extracted `expectNoSidewaysScroll` to `packages/pages/e2e/helpers.ts:91-104` and used it from both tests (`relationship.spec.ts:308` and `relationship.spec.ts:327`). Full Playwright suite 254 passed; `npm run test:unit` 644 passed, coverage still 100% across the board. Moving to review; no open questions.
- **lead** (2026-09-06T01:00:00.000Z): Reviewed and accepted, including keeping the 900px threshold: moving it would put the same font-dependent cliff at another viewport. The mutation check is the part that matters, and the note that only the runner saw the 119x111 collapse is the reason both clauses stay. Landing on develop.

- 2026-09-11, lead: Issue 42: this card's ruling that the frame may scroll left card 42's fix claim standing and unasserted. One of the two has to be struck.

- 2026-09-11, lead: driven in a browser against the built app and confirmed against this card's own claim; moved to done.
