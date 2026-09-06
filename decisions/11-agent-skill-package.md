---
status: Accepted
date: 2026-09-02
---
# Decision 11 — One agent skill package, generated from core, installed by the extension

## Current position (2026-09-10)

Stable. The skill package, its generated schema and validation references, the `RULE_CATALOG` in core, installation by the extension command, and the rule that the model's word is `operation` and the skill never emits `type: "command"` all stand unamended (decision 15, "Commands and operations are one thing", restates the last). The references regenerate whenever a rule or field changes, which later decisions rely on: each of 13, 14, 16, 18, 21 to 25 and 27 names a regenerated reference or an interview question added to the skill. The interview's playbook gained a rule to sweep for `identifies` (decision 14's amendment of 2026-09-09) and the question "who calls it" (decision 15's second amendment of 2026-09-10, card 120). Rule ids change under the catalogue, for example `context-invariant-guarded` merged into `context-invariant-is-checked` (decision 27, card 103).

## Context

The only help an LLM had for authoring ODS workspaces was a docs page with a copy-paste
prompt pointing at raw GitHub URLs of `schema.ts` and a test file. It drifted from the model
(no `.ods` folder, no extension, no validation rules), it could not be installed into an
agent, and it assumed the reader already knew DDD. The developers ODS is for mostly do not.

Agents now read skills from conventional folders: `.claude/skills` for Claude Code,
`.agents/skills` and `.codex/skills` for the Agent Skills layout, and rules files such as
`AGENTS.md` for the rest. The extension, the docs site and future packages all need the same
skill text.

## Decision

- A new published package `@open-domain-specification/skill` holds the skill bundle
  (`SKILL.md`, `references/`, `examples/`) and a small programmatic API (`skillFiles`,
  `installSkill`, `isInstalled`, `rulesSnippet`). The bundle is embedded into the library at
  build time so consumers need no filesystem access to `node_modules`.
- The schema reference and the validation reference are generated from core's build output
  at build time and committed, so a change in core shows up as a diff in the skill. Core
  exports a `RULE_CATALOG` describing each rule in plain words, with a test that every emitted
  diagnostic belongs to a catalogued rule.
- The skill is installed by the VS Code extension command `ODS: Install AI Skill`; there is
  no npx installer. Targets are Claude Code, Agent Skills and Codex, project or user level,
  with an optional pointer paragraph for rules-file agents.
- The skill detects the authoring mode (raw JSON in `.ods` or the TypeScript DSL) and edits
  the right artefact. It interviews users in plain language, maps answers through a
  translation table, and explains each DDD term once.
- The model's word for a request is `operation`; the skill may say "command" in conversation
  but never emits `type: "command"`.
- The docs page `7-llm-context.md` is replaced by `7-ai-skill.md`.

## Consequences

- `packages/core` builds before `packages/skill` (devDependency), and `apps/ods-vscode`
  bundles the skill library.
- Any change to the schema or to a validation rule regenerates two markdown files; the skill
  test fails until they are committed.
- Users without VS Code copy the `skill/` folder from the npm package by hand.
