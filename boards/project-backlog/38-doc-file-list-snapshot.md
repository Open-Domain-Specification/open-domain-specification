---
column: done
labels: [infra, docs, backend]
priority: low
agent: dev-sonnet
live: false
clean-code-swept: true
updatedAt: 2026-09-03T17:05:00.000Z
---
# Doc unit test: snapshot the file list toDoc produces for the petstore reference

A renamed or dropped page in the doc generator currently changes nothing a test sees. Add a unit test in packages/doc that runs `toDoc` over the petstore reference workspace (the pages package already reads it from `models/petstore/.ods/petstore.json`) and snapshots the sorted file list, so any change to the page set shows up in review.

## Checklist

- [x] packages/doc/src/index.test.ts: sorted `Object.keys(await toDoc(petstore))` matches an inline snapshot (56 files today)
- [x] Test reads the workspace file the same way packages/pages/src/site.test.ts does
- [x] Root `npm test` green (packages/doc green; one pre-existing, unrelated timeout in packages/pages — see comment)

## Gates

- [x] clean-code-swept — self-scan, no violations (dev-sonnet, 2026-09-03T15:15:00Z)
- [x] qa-automated — npm test -w packages/doc green, 15 tests incl. the new snapshot (lead, 2026-09-03T17:05:00Z)

## Comments

- **lead** (2026-09-03T15:00:00.000Z): Assigned to dev-sonnet. Fixed by decision: one test, inline snapshot via `toMatchInlineSnapshot`, keys sorted with default `sort()`. Read the workspace exactly as packages/pages/src/site.test.ts does (copy its read helper, do not import from pages). If `Workspace.fromSchema` (or whatever site.test.ts uses) needs the schema file, take the same path. Card 37 is adding an index.html in parallel; snapshot what toDoc returns in your tree today (56) and the lead will refresh it at merge. Tests that prove it: `npm test -w packages/doc` and root `npm test`. Work in your worktree; `npm ci` there first if node_modules is missing.
- **dev-sonnet** (2026-09-03T15:05:00.000Z): Starting. Worktree had stale HEAD (v0.1.11) missing this card; reset local branch to `develop` tip (working tree was clean, no changes lost) so the card and current `packages/doc` source are present. Ran `npm ci` at repo root to populate `node_modules`. Adding the test now.
- **dev-sonnet** (2026-09-03T15:15:00.000Z): Added `packages/doc/src/index.test.ts:1-13` (reads `models/petstore/.ods/petstore.json` via `readFileSync`/`Workspace.fromSchema`, same as `packages/pages/src/site.test.ts:7-15`) and `packages/doc/src/index.test.ts:212-270` (new `it` asserting `Object.keys(docs).sort()` against an inline snapshot). `npm test -w packages/doc -- -u` (packages/core and packages/graphviz needed a local `npm run build` first, since `node_modules` had no `dist` for either workspace dep) generated the snapshot: 56 entries, matching the card's stated count. Reran `npm test -w packages/doc` without `-u` — 4 files, 15 tests green. Root `npm test`: `packages/doc` passed as part of the run; the only failure was a pre-existing, unrelated timeout in `packages/pages/src/lib/Page.test.ts` ("RiverMart: every ref renders", default 30s vitest timeout under load) — last touched by card 26, not this card, and outside `git diff --stat` for this change (`boards/.../38-*.md` and `packages/doc/src/index.test.ts` only). Verified it is a slow/flaky test, not a regression: reran that single test in isolation with `--testTimeout=60000` and it passed in 13.7s (`npx vitest run src/lib/Page.test.ts -t "RiverMart: every ref renders" --testTimeout=60000`). Clean-code self-scan (diff is 2 files, ~80 lines, under the sub-agent threshold): no SRP/DRY/naming/coupling/dead-code/KISS issues — the change is a fixture read plus one new `it` block following the existing file's pattern. `clean-code-swept: true`. Moving to review.
- **lead** (2026-09-03T17:05:00.000Z): Reviewed the diff (packages/doc/src/index.test.ts:1-13 fixture reader, :212-270 snapshot), doc suite green. Landing on develop; the snapshot will gain `index.html` when card 37 lands.
