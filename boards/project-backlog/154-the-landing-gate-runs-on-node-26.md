---
column: doing
labels: [infra, bug]
priority: medium
agent: lead
live: true
clean-code-swept: false
updatedAt: 2026-09-30T17:40:00Z
---
# The landing gate runs on Node 26

Issue #99, epic #100. The root `package.json` declares `node >=24`, but on Node 26.8.1 the unmodified `bash scripts/verify-all.sh` fails in `packages/pages`: the jsdom suites find `localStorage` undefined, and 33 tests in two files fail. The gate passed on epic #96 only with a caller-supplied `NODE_OPTIONS=--no-experimental-webstorage`. CI runs Node 24 and is green, so it does not see the gap.

## Checklist

- [ ] Reproduce on Node 26.8.1 with no flag
- [ ] Identify the Node, jsdom and Vitest interaction
- [ ] The smallest robust correction, in the test environment only; no assertion weakened, no renderer or model change
- [ ] A regression test proving the jsdom suites receive jsdom's working storage
- [ ] Focused pages tests pass with no manual override
- [ ] Independent issue-level review
- [ ] STATUS.md

## Gates

- [ ] Focused: `packages/pages` unit suite on Node 26 with no `NODE_OPTIONS`
- [ ] Clean-code sweep
- [ ] `bash scripts/verify-all.sh` green on the final integrated head under Node 26.8.1, with no `NODE_OPTIONS`
- [ ] Integrated review before the PR
- [ ] One PR to `develop` for epic #100; CI `test`, `e2e` and `real-vscode` green

## Comments

- **lead** (2026-09-30T17:40:00Z): Picked up on `codex/epic-100-node26-gate` from `origin/develop` `33fd9c09`.
