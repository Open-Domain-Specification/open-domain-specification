---
column: review
labels: [frontend, docs]
priority: high
agent: claude
live: false
updatedAt: 2026-09-02T15:45:00.000Z
---
# Install the AI skill from the extension

Add an `ODS: Install AI Skill` command that writes the `@open-domain-specification/skill` bundle into the agent skill folders a user picks (`.claude/skills`, `.agents/skills`, `.codex/skills`, project or user level) and optionally appends a pointer paragraph to `AGENTS.md` or `.github/copilot-instructions.md`. On activation, when a `.ods` folder exists and an installed copy is stale, offer a one-time update. Depends on boards/project-backlog/22-agent-skill-package.md.

## Checklist

- [x] Add `@open-domain-specification/skill` as a dependency and bundle it with esbuild
- [x] `ods.installSkill` command: folder pick, multi-select of targets, user-level toggle, rules-file pointer
- [x] Stale check on activation with a one-time "Update" prompt stored in workspaceState
- [x] README section "Install the AI skill"

## Comments

- **claude** (2026-09-02T15:45:00.000Z): Command and stale prompt live in apps/ods-vscode/src/skill.ts:1-190: `installSkillCommand` asks for targets (multi-select, Claude Code preselected), project or user folder, and whether to append `rulesSnippet()` to AGENTS.md or copilot-instructions.md, writing through `vscode.workspace.fs`; `promptWhenSkillStale` compares the version stamp per target and offers one update per skill version via workspaceState. Wired at apps/ods-vscode/src/extension.ts:71-73 and :98, contributed in apps/ods-vscode/package.json (`ods.installSkill`), documented in apps/ods-vscode/README.md. The esbuild bundle picks the skill library up from its dist, so no asset copy step was needed. Extension typechecks, bundles and its tests pass; the quick-pick flow itself has not been driven in an extension host this session.
