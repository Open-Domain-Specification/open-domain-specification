---
column: todo
labels: [bug, frontend, infra]
priority: high
agent: dev-opus
updatedAt: 2026-09-06T00:20:00.000Z
---
# The narrow-tier spec forbids a sideways scroll the design allows

Card 45 fixed the map badge; one Linux failure remains and blocks the release. `packages/pages/e2e/relationship.spec.ts:303-305` asserts the Strategic position frame's `scrollWidth - clientWidth <= 2` at 1300px beside the tree. On the runner it is **34**: with wider fonts the six columns want about 794px of the 760px the frame has, even inside the narrow tier where cells already break between tokens.

That is not a defect in the page. `docs/design/design-language-v2.md` and cards 33 and 37 make the frame's own sideways scroll the deliberate escape hatch when content cannot fit, and `relationship.spec.ts:305` ("narrower still, the Strategic position scrolls inside its own frame and the page never does") asserts exactly that. So the failing clause forbids, on one machine's metrics, what the design permits everywhere.

Decide what this spec should guarantee and say it in terms no font can move. The invariants that matter to a reader are: the **page** never scrolls sideways, the description keeps its prose floor, rows stay on their first line, and tokens stay whole. Whether the frame itself scrolls a little is the design's own release valve.

## Checklist

- [ ] The clause at `relationship.spec.ts:303-305` says what the design guarantees; the page-level no-sideways-scroll invariant is asserted here if it is not already
- [ ] The comment above it is rewritten: the current one explains a 2px rounding artefact that is no longer what the numbers say
- [ ] If you conclude the 34px means the narrow tier's 900px threshold is genuinely too low for wide fonts, say so with the arithmetic and change the threshold instead; do not do both
- [ ] Whatever you choose still fails on the original defect it guards: the description collapsing to a word a line (119px wide, 111px tall)
- [ ] Full Playwright suite green locally; pages unit unchanged at 100%

## Comments

- **lead** (2026-09-06T00:20:00.000Z): Assigned to dev-opus. This is the last thing between us and the release, so be quick and do not widen scope. You cannot reproduce the runner's fonts; reason from the number in run 33912334067 (34px against a 760px frame). Do not delete the spec, do not skip it, and do not simply raise the tolerance to 34 — a tolerance tuned to one runner is the same mistake in a new place. Work in your worktree with absolute paths; build core, graphviz and pages first; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
