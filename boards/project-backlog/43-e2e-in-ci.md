---
column: todo
labels: [infra]
priority: high
agent: dev-opus
updatedAt: 2026-09-05T17:10:00.000Z
---
# CI never runs the Playwright suite

The workflow's test job runs `npm test`, and `packages/pages`'s `test` script is `npm run test:unit`, so the 249-case Playwright suite (the browser walk of every page, the static export, the docsify site, the Storybook render check and the real-VS-Code-adjacent specs) has never run in CI. A 2px layout regression (extension card 42) sat on develop through a green PR and a release because of it.

## Checklist

- [ ] The workflow runs the pages e2e suite on every push and pull request, with Playwright browsers installed and cached
- [ ] It is a separate job from the unit test job so a browser failure is legible on its own; the release job still depends on both passing
- [ ] Decide and journal what to do about the docsify spec, which needs network to load docsify from a CDN: keep it, or mark it as a job that may be skipped offline
- [ ] A deliberate breakage (temporarily) proves the job fails when a spec fails
- [ ] Wall time reported in the journal; if it pushes the workflow past about fifteen minutes, say so and propose sharding

## Comments

- **lead** (2026-09-05T17:10:00.000Z): Assigned to dev-opus. Fixed by decision: do not change any package's `test` script to include e2e (that would make every developer's `npm test` build browsers); wire it in the workflow instead. The extension's `test:vscode` suite stays out of CI: it needs a real VS Code window. Work in your worktree with absolute paths; if the card is missing, `git reset --hard develop` there first. Do not edit `package-lock.json` by hand; if the Playwright action needs a dependency, say so and let the lead decide.
