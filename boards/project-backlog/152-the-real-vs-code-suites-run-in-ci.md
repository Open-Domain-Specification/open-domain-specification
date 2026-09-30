---
column: doing
labels: [ci, vscode]
priority: medium
agent: developer
live: true
updatedAt: 2026-09-30T11:06:14Z
---
# The real VS Code suites run in CI

Issue #69. The two suites that drive a real VS Code 1.96.4, `npm run test:vscode` (mocha inside an Extension Development Host) and `npm run test:vscode:keyboard` (Playwright driving Electron with real key events), ran only when the lead ran them by hand, so a change could land with the extension's real-host behaviour unchecked. The `real-vscode` job in `.github/workflows/npm-publish.yml` now runs both on every push and pull request, one after the other in the same checkout under `xvfb-run`, and `publish` waits for it. The job fails on a failure in either suite (the second suite still runs, so both results are reported), on a suite that never reported, on zero tests executed, and on any skip except the four optional marketplace screenshot tests, which the checker names by title and requires to be present. A check blocks a merge only when a maintainer requires `real-vscode` in the branch rules.

## Checklist

- [x] Job `real-vscode` on `ubuntu-24.04` with Node 24: `npm ci`, `npm run build`, VS Code 1.96.4 cached on the OS and version, Electron's libraries and Xvfb installed
- [x] The suites run one after the other, each with `continue-on-error`, and a final `always()` step judges both
- [x] Isolated directories per run: the extension suite's user data under `$RUNNER_TEMP` (`ODS_VSCODE_USER_DATA`), the keyboard suite's scratch dirs already unique (`mkdtemp`) and now under `$RUNNER_TEMP` through `TMPDIR`
- [x] `scripts/check-real-host-results.mjs` reads a mocha JSON record (`src/test/results-reporter.ts`) per config and Playwright's JSON report, and fails on missing results, zero tests, failures, flaky passes, unexpected skips and a vanished allowed skip
- [x] Allowed skips named by full title, not by count
- [x] Unit tests for the checker (`npm run test:scripts`, run in the `test` job)
- [x] `$GITHUB_STEP_SUMMARY`: counts per suite and config, allowed skips by name, VS Code version, runner image
- [x] Evidence artifact `real-vscode-evidence` (7 days): both suite logs, the JSON results, VS Code's logs, and a trace, screenshot and log folder per keyboard launch
- [x] Cleanup in an `if: always()` step
- [x] `publish.needs` is `[test, e2e, real-vscode]`; the manual-trigger conditions are unchanged
- [x] `AGENTS.md` and a comment in `scripts/verify-all.sh` state how CI relates to the landing gate; the gate's guard is untouched

## Gates

- [ ] CI `real-vscode` green (and `test`, `e2e`) on the final head
- [ ] Failure propagation demonstrated for each suite (a temporary failing commit per suite: the job ends red, the other suite still reports)
- [ ] `bash scripts/verify-all.sh` green

## Comments

- **developer** (2026-09-30T11:06:14Z): Green on run 36705744230, head b21a39ce, runner image `ubuntu24` 20260920.314.1, VS Code 1.96.4. Executed: petstore 9 passed and 4 skipped (the screenshots), hostile-links 1, cross-surface 4, keyboard 23 of 23. The first green took three pushes: the runner context is not available to job-level `env` (the workflow was invalid), then the reporter required `mocha` 12, an ES module the extension host cannot `require`, so it now takes the spec reporter from `@vscode/test-cli`'s own Mocha 11.
- **developer** (2026-09-30T11:06:14Z): Nothing Linux-specific failed. The install step sets `kernel.apparmor_restrict_unprivileged_userns=0` for Electron's sandbox on Ubuntu 24.04 as a precaution; whether the suites need it was not tested. The D-Bus connection errors in the log are harmless in a headless host.
