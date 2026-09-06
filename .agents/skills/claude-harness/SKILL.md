---
name: claude-harness
description: Launch Claude Code programmatically for scoped tasks or code reviews, selecting a shared model class and an available agent.
---

# Claude harness

Use Claude only when requested. Run from the trusted target repository; check `claude --help` for installed flags and model aliases before launching.

## Shared model classes

| Class | Purpose | Claude `--model` |
| --- | --- | --- |
| `frontier` | Most capable reasoning | `fable` |
| `standard` | General difficult work | `opus` |
| `fast` | Routine, bounded work | `sonnet` |

These are project conventions, not cross-vendor benchmark equivalence. Default to `standard` unless specified; an explicit model overrides the class. Effort is separate: `low`, `medium` (default), or `high` via `--effort`. If the selected model or flag is unavailable, report it; do not silently substitute.

## Programmatic launch

Use `-p` to print and exit, `--model` and `--effort` explicitly, and `--output-format json` for machine-readable results. For review, restrict tools and use plan permissions:

```sh
git diff --no-ext-diff --no-textconv HEAD | claude -p \
  --model opus --effort medium --output-format json \
  --permission-mode plan --permission-prompts none --tools Read,Glob,Grep \
  'Review the supplied working-tree diff against HEAD. Read related files as needed. Do not edit, commit, or post. Report actionable findings with severity, file:line, evidence, and verification gaps; say explicitly if none.'
```

This example excludes untracked files. Resolve the requested target first: local changes, a commit, or a verified branch comparison; supply that diff and identify omissions. Keep the prompt scoped to the user's review or implementation request. For implementation, use only permissions already authorized; never enable permission bypass. Check process exit status and result errors before reporting success. Review does not authorize applying fixes or publishing comments.

## Available agents

Discover definitions recursively in `.claude/agents/` and `~/.claude/agents/`; installed bot definitions live under `bots/`. Read their frontmatter `name` and description; names vary with the installed variant. `claude agents` lists background sessions in this version, not available definitions.

Select an existing definition with `--agent NAME`. Alternatively define a session-only reviewer with `--agents '{"reviewer":{"description":"Read-only code review","prompt":"Review only; report evidence-backed findings without changes."}}' --agent reviewer`. Keep explicit model, effort, and permission flags; do not assume an agent's defaults match the requested class. Omit `--agent` to use the normal Claude session.
