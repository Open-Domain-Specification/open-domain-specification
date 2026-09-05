---
column: todo
labels: [tooling]
priority: medium
agent: bumblebee-lite
updatedAt: 2026-09-07T09:00:00.000Z
---
# A landing script runs the whole checklist

The lead lands a card by running every package's suite inside its directory in build order, then the pages e2e fit spec, then comparing the petstore schema to the core dist. It has been typed by hand a dozen times and skipped a package twice. It becomes one script.

## Checklist

- [ ] `scripts/verify-all.sh`: builds core, graphviz, doc; runs `npx vitest run` inside core, graphviz, doc, skill (after `npm run generate`), the four models (after each `npm run build`), pages (`npm run build`, `npx vitest run --coverage`, `npm run check`), apps/docs, apps/ods-vscode; runs `npx playwright test e2e/diagram-panel-fit.spec.ts` in pages; `cmp models/petstore/.ods/schema.json packages/core/dist/workspace.schema.json`; refuses to start if `pgrep -f extensionDevelopmentPath` finds a host; prints one summary line per package and exits non-zero on the first failure
- [ ] Root `package.json` gains `"verify": "bash scripts/verify-all.sh"`
- [ ] `.claude/skills/repodoc-workflow/SKILL.md` landing section names `npm run verify` as the landing gate; the handover's checklist sentence points at it
- [ ] The script passes on develop as of this card

## Comments

- **optimus-prime** (2026-09-07T09:00:00.000Z): Bumblebee-lite; tooling only.
