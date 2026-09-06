---
column: done
labels: [tooling]
priority: medium
agent: dev-lite
clean-code-swept: true
live: false
updatedAt: 2026-09-05T12:00:00.000Z
---
# A landing script runs the whole checklist

The lead lands a card by running every package's suite inside its directory in build order, then the pages e2e fit spec, then comparing the petstore schema to the core dist. It has been typed by hand a dozen times and skipped a package twice. It becomes one script.

## Checklist

- [x] `scripts/verify-all.sh`: builds core, graphviz, doc; runs `npx vitest run` inside core, graphviz, doc, skill (after `npm run generate`), the four models (after each `npm run build`), pages (`npm run build`, `npx vitest run --coverage`, `npm run check`), apps/docs, apps/ods-vscode; runs `npx playwright test e2e/diagram-panel-fit.spec.ts` in pages; `cmp models/petstore/.ods/schema.json packages/core/dist/workspace.schema.json`; refuses to start if `pgrep -f extensionDevelopmentPath` finds a host; prints one summary line per package and exits non-zero on the first failure
- [x] Root `package.json` gains `"verify": "bash scripts/verify-all.sh"`
- [x] `.claude/skills/repodoc-workflow/SKILL.md` landing section names `npm run verify` as the landing gate; the handover's checklist sentence points at it
- [x] The script passes on develop as of this card

## Gates

- [x] verify-all — `bash scripts/verify-all.sh` green end to end, all 12 summary lines passed (dev-lite, 2026-09-05T12:00:00.000Z)

## Comments

- **lead** (2026-09-07T09:00:00.000Z): dev-lite; tooling only.
- **dev-lite** (2026-09-05T12:00:00.000Z): Wrote `scripts/verify-all.sh:1-118` — resolves its own dir to an absolute `ROOT`, runs each package's build/test inside that package's own directory (never `lerna run`/`nx`; in a nested worktree nx resolves its cache to the main checkout, not this worktree, which is exactly why the script shells directly into each package dir instead), refuses to start if `pgrep -f extensionDevelopmentPath` finds a running extension host, parses each vitest run's `Tests  N passed (N)` summary line into one printed line per package, checks for a playwright browser cache before the e2e run and prints the `npx playwright install --with-deps chromium` command instead of an obscure failure if browsers are missing, and stops on the first non-zero exit via `set -euo pipefail` plus explicit `PIPESTATUS` checks around the `tee` pipes. Added `packages/pages` `npm run check` (svelte-check) after the pages build/test as the checklist specifies. Added root `package.json:12` `"verify": "bash scripts/verify-all.sh"`. Added a "Landing a card" section to `.claude/skills/repodoc-workflow/SKILL.md` naming `npm run verify` as the landing gate. The "handover's checklist sentence" is the lead's own landing checklist in `.claude/skills/tech-lead-team/SKILL.md:97` ("Review and landing (lead)"); updated its "Run the suites..." bullet to run `npm run verify` first. Ran `npm run verify` end to end on develop (fa6556f): all 11 package suites plus the pages e2e fit spec plus the schema comparison passed, script exited 0 — see report to lead for the summary block.
