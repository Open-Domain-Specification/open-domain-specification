---
column: done
labels: [infra]
priority: high
agent: dev-opus
live: false
clean-code-swept: true
updatedAt: 2026-09-05T19:30:00.000Z
---
# CI never runs the Playwright suite

The workflow's test job runs `npm test`, and `packages/pages`'s `test` script is `npm run test:unit`, so the 249-case Playwright suite (the browser walk of every page, the static export, the docsify site, the Storybook render check and the real-VS-Code-adjacent specs) has never run in CI. A 2px layout regression (extension card 42) sat on develop through a green PR and a release because of it.

## Checklist

- [x] The workflow runs the pages e2e suite on every push and pull request, with Playwright browsers installed and cached
- [x] It is a separate job from the unit test job so a browser failure is legible on its own; the release job still depends on both passing
- [x] Decide and journal what to do about the docsify spec, which needs network to load docsify from a CDN: keep it, or mark it as a job that may be skipped offline
- [x] A deliberate breakage (temporarily) proves the job fails when a spec fails
- [x] Wall time reported in the journal; if it pushes the workflow past about fifteen minutes, say so and propose sharding

## Comments

- **lead** (2026-09-05T17:10:00.000Z): Assigned to dev-opus. Fixed by decision: do not change any package's `test` script to include e2e (that would make every developer's `npm test` build browsers); wire it in the workflow instead. The extension's `test:vscode` suite stays out of CI: it needs a real VS Code window. Work in your worktree with absolute paths; if the card is missing, `git reset --hard develop` there first. Do not edit `package-lock.json` by hand; if the Playwright action needs a dependency, say so and let the lead decide.
- **dev-opus** (2026-09-06T09:00:00.000Z): Claimed. Baseline: `.github/workflows/npm-publish.yml:9-30` has one `test` job running `npm test` (root script at `package.json:22` = `lerna run build && lerna run test`), and `packages/pages/package.json:47` maps `test` to `test:unit` only, so `packages/pages/playwright.config.ts:1-40` has never run in CI. Plan: a second job that builds the workspaces, installs a cached chromium, and runs `npx playwright test` from `packages/pages`, with `publish` gated on both jobs.

- **dev-opus** (2026-09-06T10:30:00.000Z): Added the `e2e` job at `.github/workflows/npm-publish.yml:30-66`. It checks out, installs, runs the root `npm run build` (every workspace, not just pages: `packages/pages/e2e/global-setup.ts:6` imports the package's own `dist/site.js` and `packages/pages/e2e/helpers.ts:39` walks the petstore's generated `docs/`), restores `~/.cache/ms-playwright` keyed on `package-lock.json`, installs chromium, then runs `npx playwright test` with `working-directory: packages/pages`. No package script changed, per the lead's note: the workflow drives Playwright directly rather than `test:e2e`, which would rebuild what the job just built. `publish` now needs both jobs (`.github/workflows/npm-publish.yml:70`). Failure traces upload from `packages/pages/test-results` so a red run is debuggable without a rerun.
- **dev-opus** (2026-09-06T10:45:00.000Z): Docsify spec decision -- keep it, running in the same job, unchanged. `packages/pages/e2e/docsify.spec.ts:11-16` already guards on the generated folder existing, and its only network need is the docsify bundle from the CDN, which a GitHub runner has; the docs build the same job performs already assumes network. Splitting it into a skippable job would buy an offline developer nothing they do not already get from `--grep`, and would cost the release gate a spec. If CDN flakiness ever shows up in practice the cheap answer is vendoring the docsify bundle beside the generated site, not skipping the spec.
- **dev-opus** (2026-09-06T11:00:00.000Z): Evidence. Full suite locally from `packages/pages`: **249 passed, 1 failed** in 42s wall including the Storybook build that `packages/pages/e2e/global-setup.ts:38-52` performs, exit code 1. The failure is not mine and not deliberate: `packages/pages/e2e/relationship.spec.ts:218` expects `scrollWidth - clientWidth` to be 0 and gets 2 -- the 2px overflow of card 42, sitting on develop exactly as this card describes. That is the job doing its job, and it means the new e2e job goes red on develop until card 42 lands. Separately, a deliberate breakage (a wrong crumb string at `packages/pages/e2e/relationship.spec.ts:296`) made `npx playwright test --grep ...` exit 1 with `1 failed`; reverted, and the working tree now shows only the workflow and this card modified. Wall time: 42s of suite on an M-series laptop, so with `npm ci` and a full `lerna` build the job should land around five minutes on a runner and nowhere near fifteen. No sharding needed; if it ever is, the config already has one chromium project and `--shard` over `packages/pages/e2e` is the seam.
- **dev-opus** (2026-09-06T11:20:00.000Z): Clean-code sweep, self-scan (one file, ~40 lines, under the sub-agent threshold). One KISS finding, fixed rather than TODO'd: the browser install had a cache-hit/cache-miss pair of steps, and the cache-hit branch (`playwright install-deps`) bought nothing over the unconditional `playwright install --with-deps chromium`, which skips the download when the cached browser already matches. Now one step at `.github/workflows/npm-publish.yml:52-56`. Nothing else flagged: the checkout/setup/`npm ci` repetition against the `test` job is GitHub Actions' own shape, jobs sharing no filesystem.

## Gates

- [x] qa-automated — after merging develop: full Playwright suite 250/250 in the worktree; job wiring reviewed, publish needs [test, e2e] (lead, 2026-09-05T19:30:00Z)

- [x] clean-code-swept -- self-scan of the e2e job, one KISS finding fixed in place (dev-opus, 2026-09-06T11:20:00.000Z)
- **lead** (2026-09-05T19:30:00.000Z): ANSWERS. (1) Stale: card 42 landed while you worked, so the 2px assertion is fixed and the suite is 250/250 here. (2) Keeping the docsify spec in the same job is right; the vendoring fallback is noted for if the CDN ever flakes. The empty-dist-from-lerna note is the known worktree nx-cache trap already in the handover. Landing on develop.
