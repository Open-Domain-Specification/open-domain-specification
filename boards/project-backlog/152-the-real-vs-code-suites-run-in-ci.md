---
column: doing
labels: [ci, vscode]
priority: medium
agent: developer
live: true
updatedAt: 2026-09-30T13:18:03Z
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

- [x] CI `real-vscode` green (and `test`, `e2e`) on a15bef32, the last commit that changes code: push run 36707942927. The PR records the final head's run
- [x] Failure propagation demonstrated for each suite (a temporary failing commit per suite: the job ends red, the other suite still reports): 46584f1f broke `test:vscode`, run 36707268430 red; e2c5d7f7 broke `test:vscode:keyboard`, run 36707274645 red; restored in a15bef32, whose tree equals 99d23fbd
- [x] `bash scripts/verify-all.sh` green on a15bef32 (11:20:57–11:23:07Z), including the new `scripts (real-host checker)` step with 22 tests

## Comments

- **developer** (2026-09-30T11:06:14Z): Green on run 36705744230, head b21a39ce, runner image `ubuntu24` 20260920.314.1, VS Code 1.96.4. Executed: petstore 9 passed and 4 skipped (the screenshots), hostile-links 1, cross-surface 4, keyboard 23 of 23. The first green took three pushes: the runner context is not available to job-level `env` (the workflow was invalid), then the reporter required `mocha` 12, an ES module the extension host cannot `require`, so it now takes the spec reporter from `@vscode/test-cli`'s own Mocha 11.
- **developer** (2026-09-30T11:06:14Z): Nothing Linux-specific failed. The install step sets `kernel.apparmor_restrict_unprivileged_userns=0` for Electron's sandbox on Ubuntu 24.04 as a precaution; whether the suites need it was not tested. The D-Bus connection errors in the log are harmless in a headless host.
- **lead** (2026-09-30T11:27:16Z): Added the checker's tests to the landing gate (99d23fbd), so the gate still runs every suite.
- **lead** (2026-09-30T11:27:16Z): Failure propagation, one temporary commit per suite, each on its own CI run:
  - 46584f1f changed the hostile-links expected href. Run 36707268430: `real-vscode` failure. `test:vscode` hostile-links had 1 failing, while the keyboard suite still ran and passed 23. The judge printed `the vscode suite step ended failure` and named the failing test.
  - e2c5d7f7 restored that and changed a #47 node name. Run 36707274645: `real-vscode` failure. The keyboard suite had 22 passed and 1 failed, while `test:vscode` passed. The judge named the #47 journey.
  - `test` and `e2e` stayed green in both. The `real-vscode-evidence` artifact uploaded on both red runs, at about 142–149 MB each (a trace per keyboard launch, kept 7 days).
  - a15bef32 restores the assertion. Its tree is identical to 99d23fbd, and no failure marker remains.
- **lead** (2026-09-30T11:27:16Z): On a15bef32:
  - the landing gate is green (core 1040, pages 994, apps/ods-vscode 15, the real-host checker 22, pages e2e 408 passed and 20 skipped);
  - locally on macOS 27 arm64 with VS Code 1.96.4, `npm run test:vscode` passed three runs out of three (9 passing and 4 pending screenshots; hostile-links 1; cross-surface 4), and `npm run test:vscode:keyboard` passed three out of three (23 passed);
  - CI push run 36707942927 is green (`test`, `e2e`, `real-vscode`).
No branch protection or ruleset exists on develop or main. The check becomes merge-blocking only when a maintainer requires the status check `real-vscode`.
- **developer** (2026-09-30T13:11:33Z): Owner review of PR #95 found two cases where the checker said success against its own policy; both fixed in 9cecda7a. (1) A Mocha test that failed its first attempt and passed its retry was recorded as a clean pass, because Mocha emits `retry`, not `fail`, for an attempt it will repeat. The reporter (now plain CommonJS, `src/test/results-reporter.cjs`, so the scripts tests run it unbuilt) records `retry` events and each pass's `currentRetry()`; the checker rejects any test with either, naming the config and the test. (2) A Playwright `test.fail()` test that fails reports outcome `expected` with `expectedStatus: failed`, and was counted as a pass. A journey now counts as passed only when its outcome is `expected`, `expectedStatus` is `passed` and it has exactly one attempt with status `passed`; expected failures, `test.fixme`, unallowlisted skips, flaky passes, and missing or unrecognised statuses, results or record shapes (Mocha side too) are rejected. Regression tests use records from a real Mocha 11 run (`this.retries(1)`: clean accepted, retry-only rejected, terminal failure rejected) and from a real `@playwright/test` run of a fixture spec (pass accepted; failure, `test.fail()` and fixme rejected, each named). The old checker on the same real records accepted the retry-only pass and counted the `test.fail()` failure as 1 passed; the new one rejects both. `npm run test:scripts` is 31 tests (was 22). CI run 36719041633 on 9cecda7a is green (`test`, `e2e`, `real-vscode`) with the same counts: petstore 9 and 4 skipped, hostile-links 1, cross-surface 4, keyboard 23.
- **lead** (2026-09-30T13:18:03Z): Review of 8b8c0746, both findings fixed in 9cecda7a:
  - a Mocha pass that needed a retry is rejected by name;
  - a Playwright journey counts only if `expectedStatus` is `passed` and its single attempt passed, so `test.fail()`, fixme, missing and unrecognised results are rejected.
  The regressions use a real Mocha 11 run and a real Playwright 1.62.1 JSON report, and the pre-fix checker accepted both cases. 3caa2a82 moves the Playwright fixture's run output out of the checkout, and removes three run-output files 9cecda7a had committed.
- **lead** (2026-09-30T13:18:03Z): On 3caa2a82:
  - the landing gate is green, 13:13:05–13:15:21Z (the real-host checker 31 tests, pages e2e 408 passed and 20 skipped), and the tree stayed clean;
  - locally on macOS 27 arm64 with VS Code 1.96.4, `test:vscode` passed 3 of 3 runs (9 passing and 4 pending screenshots; 1; 4) and `test:vscode:keyboard` 3 of 3 (23 passed).
  The failure-propagation runs 36707268430 and 36707274645 predate the checker change. They exercise the step-outcome path, which is unchanged; the new rejections are covered by the real-runner tests.
  Correction to the entry above: develop's branch data shows required-check enforcement off and no required contexts. Branch rules were read with a token that may lack administrative scope (the owner's administrative read got a 403), so "no ruleset exists" is what this token could see, not a confirmed absence.
