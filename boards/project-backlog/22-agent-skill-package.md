---
column: done
labels: [ddd, docs, backend]
priority: high
agent: claude
live: false
updatedAt: 2026-09-03T13:20:00.000Z
---
# Agent skill package for authoring ODS workspaces

A new package `@open-domain-specification/skill` (`packages/skill`) that ships an installable agent skill (`SKILL.md` + references + examples) teaching an LLM to author ODS workspaces. The skill detects whether a project manages its model as raw `.ods/*.json` or via the TypeScript DSL, interviews developers who do not know DDD in plain language, maps answers to ODS elements and validates. The schema, validation and ref references are generated from `packages/core` at build time so they cannot drift. See decisions/11-agent-skill-package.md.

The VS Code extension installs it (boards/vsc-extension/10-install-ai-skill.md). The docs page `7-llm-context.md` is replaced by a skill page.

## Checklist

- [x] Export a rule catalog from core (`RULE_CATALOG`) with a test that every emitted diagnostic belongs to a catalogued rule
- [x] Scaffold `packages/skill` (package.json, tsconfig, tsup build, vitest)
- [x] Hand-written bundle: SKILL.md, interview playbook, translation table, DDD glossary, json-mode, dsl-mode, dsl-api, examples
- [x] Generator script for `model-reference.md` and `validation-rules.md` from core dist
- [x] Embed the bundle into dist and expose `skillFiles`, `installSkill`, `isInstalled`, `rulesSnippet`
- [x] Tests: examples valid, install paths per target, generated references current, SKILL.md constraints, dsl-api names exist in workspace.ts
- [x] Replace docs page `7-llm-context.md` with `7-ai-skill.md`
- [x] Decision record 11 and copilot-instructions build note

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T15:20:00.000Z): Picked up the card. Plan: core exports a rule catalog beside its rules, `packages/skill` holds the hand-written skill and generates the schema and validation references from core's dist, and the extension gets an install command tracked on the VSC board.
- **claude** (2026-09-02T15:45:00.000Z): Core now carries its rules as a catalogue with plain-language summary, why and fix per rule at packages/core/src/validate.ts:300-395, exported as `RULE_CATALOG`; packages/core/src/rule-catalog.test.ts:1-80 trips all nine rules on one fixture and asserts every diagnostic is catalogued with a declared severity. The skill bundle lives at packages/skill/skill/SKILL.md:1-124 with the playbook at packages/skill/skill/references/interview-playbook.md:1-96 and the translation table at packages/skill/skill/references/translation-table.md:1-50. packages/skill/scripts/generate.mts:1-230 renders model-reference.md from core's workspace.schema.json and validation-rules.md from the catalogue, then embeds the bundle into src/bundle.generated.ts; the library API is packages/skill/src/install.ts:1-75. Tests at packages/skill/src/bundle.test.ts:1-80 and packages/skill/src/install.test.ts:1-70 (16 green) check the examples load and validate clean, the DSL example equals the JSON example, the committed references match a fresh generation, and dsl-api.md names only methods present in workspace.ts. Docs page apps/docs/docs/7-ai-skill.md:1-70 replaces the LLM context page; apps/docs/docusaurus.config.ts:51 lets the code-import plugin read the example from outside the docs folder. Decision at decisions/11-agent-skill-package.md. Root build and all package tests green. Not done: a live dogfood session with an agent against a real project; the install API was exercised from Node into a scratch folder only.
