---
column: doing
labels: [infra, bug]
priority: medium
agent: lead
live: true
clean-code-swept: false
updatedAt: 2026-09-30T16:18:02Z
---
# The cross-surface fixture is checked against its generator

Issue #75, epic #96. `apps/ods-vscode/src/test/fixtures/cross-surface/.ods/cross_surface.json` is written by `generate.ts` beside it and committed, and the viewer, the static export, the real VS Code webview and generated Markdown all read that committed JSON against one `expected.ts`. Nothing regenerated it and compared, and nothing pinned the diagnostic the fixture carries on purpose: one `consumption-agreement` warning, on the Warehouse API's consumption of `StockChecked`, which names neither of the two agreements between Vendor and Warehouse.

## Checklist

- [ ] Reproduce the drift risk: run the generator and compare its output with the committed JSON
- [ ] The generator takes an output folder, defaulting to `.ods` beside it
- [ ] A vitest test in `apps/ods-vscode` runs the generator into a temporary folder and compares the bytes with the committed JSON
- [ ] The same test pins the fixture's exact diagnostics (severity, rule, ref) from `expected.ts`, and ties the warning to the consumption `expected.ts` lists with no agreement
- [ ] The committed JSON is the generator's output, rebuilt and not hand-edited, and a formatter pass cannot rewrite it
- [ ] Demonstrate that a stale committed fixture and a moved diagnostic each fail the test
- [ ] The four surfaces still read the same fixture and `expected.ts`
- [ ] Independent review of the change against #75
- [ ] STATUS.md

## Gates

- [ ] Focused: `npx vitest run` in `apps/ods-vscode`, and the Markdown cross-surface test in `packages/doc`
- [ ] Clean-code sweep
- [ ] `bash scripts/verify-all.sh` green on the final integrated head
- [ ] One PR to `develop` for epic #96, reviewed by Codex; #75 and #96 stay open until it is merged and post-merge CI is green

## Comments

- **lead** (2026-09-30T16:18:02Z): Picked up on `codex/epic-96-cross-surface-fixture`, based on `origin/develop` `fef6d993` plus the lead's planning commit `b09b76c8`.
