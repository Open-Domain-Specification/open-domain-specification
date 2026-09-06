---
column: backlog
labels: [chore]
priority: low
agent: developer-lite
updatedAt: 2026-09-10T08:20:00.000Z
---
# A formatting pass at the root

`npx @biomejs/biome check --write .` at the repository root reformats a dozen files outside any package's own check (`lerna.json`, `apps/docs/docusaurus.config.ts`, `scripts/qa-review.mjs`, `packages/pages/src/lib/molecules/hover-placement.ts`, every `models/*/.ods/*.json`) and reports one pre-existing lint error in `packages/pages/src/lib/templates/WorkspacePage.test.ts`. The gate runs biome only inside `packages/pages`. Noticed by card 107's developer.

## Checklist

- [ ] Decide which of those files biome should own (generated `.ods/*.json` should be ignored, not reformatted) and record it in `biome.json`
- [ ] Reformat what it owns; fix or suppress the one lint error with a reason
- [ ] `bash scripts/verify-all.sh` green

## Comments
