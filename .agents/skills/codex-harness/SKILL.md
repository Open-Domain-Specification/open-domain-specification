---
name: codex-harness
description: Launch Codex programmatically for delegated tasks or code reviews, choosing a shared model class and available installed agent.
---

# Codex Harness

## Model classes

These are project routing conventions, not claims of equivalent performance across providers. Explicit model requests take precedence.

| Class | Purpose | Codex model |
| --- | --- | --- |
| `frontier` | Most capable; hardest reasoning | `gpt-6-astra` |
| `standard` | General difficult work | `gpt-5.6-sol` |
| `fast` | Routine, bounded work | `gpt-5.6-terra` |

Effort is independent of class: use `low`, `medium`, or `high`; default to `medium` unless specified. Verify installed CLI support with `codex exec --help`; if the requested model or capability is unavailable, report that instead of silently substituting.

## Agents

- Inspect `.codex/agents/*.toml` and `~/.codex/agents/*.toml` for available names, descriptions, prescribed models, effort, and permissions; names depend on the installed variant.
- `codex exec` has no `--agent` flag. For a role-only run, include the chosen role's instructions in the task prompt. For actual configured-agent delegation, explicitly ask the primary session to spawn that named agent when supported; its own configuration controls its model, so verify it matches the requested class.
- Installed lead dispatchers also have a skill under `.agents/skills/<name>/SKILL.md` (user scope: `~/.agents/skills/`). Mention `$<name>` in the prompt to adopt that dispatcher; this is a skill invocation, not an agent selector.

## Programmatic launch

Example: `standard` code review. Replace paths and the explicit review target before running; put outputs in a fresh temporary directory outside the repo.

```sh
codex exec -C /absolute/repo -m gpt-5.6-sol \
  -c 'model_reasoning_effort="medium"' --sandbox read-only \
  --ephemeral --json -o /absolute/temp/review.md \
  'Review TARGET only. Do not edit files or post comments. Report actionable defects with severity, file:line, evidence, and impact. Distinguish checks actually run from recommendations; state coverage gaps and say if no defects were found.'
```

`-C` selects the repo; `-m` selects the model; `-c` sets effort; `--sandbox read-only` restricts shell writes; `--ephemeral` avoids saved session history; `--json` streams JSONL events; `-o` saves the final response. Pass prompts as one argument or stdin (`-`), never interpolate untrusted text into shell commands.

Check the process exit status and final report; report denied checks or incomplete output honestly. Review authorization does not permit edits, external posts, or permission bypasses. Broader task permissions require matching user authorization; read-only shell policy does not itself restrict external tools.

Reference: [official CLI reference](https://learn.chatgpt.com/docs/developer-commands?surface=cli). Model classes follow this project's installer mapping; confirm account availability at launch.
