---
column: doing
labels: [ddd, infra]
priority: high
agent: claude
live: true
status: Move complete and green; clean-code sweep in flight
progress: 90
updatedAt: 2026-09-03T04:30:00.000Z
---
# Each domain model in its own `models/` workspace, authored with the TypeScript DSL

Move the reference models out of `packages/ods-example-ws` into a new root workspace folder `models/`, one npm workspace per organisation (`models/petstore`, `models/rivermart`, `models/streamline`, `models/northbank`). Each is authored and maintained with the TypeScript DSL: `src/workspace.ts` is the source of truth, a build script generates `.ods/<id>.json` (with the schema beside it) and the docsify docs, `BRIEF.md` and `DISCOVERY.md` sit at the package root, and a test asserts the planted diagnostics, team coverage and round-trip. Consumers (pages fixtures and e2e, the VS Code integration test's workspace folder, docs, skill examples, README) point at the new locations. `packages/ods-example-ws` is deleted. See boards/project-backlog/27-reference-domain-models.md.

## Checklist

- [x] Root `workspaces` gains `models/*`; a shared `models/_shared` or per-package copy of the generator and the Money helper
- [x] Four packages with DSL source, briefs, discovery records, generator, tests
- [x] Consumers repointed: pages fixtures and e2e, VS Code `.vscode-test.mjs` workspace folder, docs, skill example, README
- [x] `packages/ods-example-ws` removed; root build and all suites green

## Comments

- **claude** (2026-09-03T03:00:00.000Z): Raised from the request that each model live in a `models/` workspace and be maintained through the DSL. Delegated the move to a subagent.
- **claude** (2026-09-03T04:30:00.000Z): Moved by a subagent. models/_shared is `@open-domain-specification/model-tools` (money helper and the generator); models/petstore, rivermart, streamline and northbank are private workspaces each with src/workspace.ts as the DSL source of truth, src/generate.ts, a per-organisation test, BRIEF.md and DISCOVERY.md at the root, and committed .ods output with the schema beside it. Consumers repointed: pages fixtures and e2e, the VS Code integration test now opens models/petstore, dev and launch configs, docs, skill example, README and copilot notes. packages/ods-example-ws deleted. Root build and tests green across eleven packages; e2e 25; VS Code suite 5.
