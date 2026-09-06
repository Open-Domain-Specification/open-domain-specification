---
name: antigravity-harness
description: Launch Antigravity (agy) programmatically for scoped work or review, selecting a shared model class and an available agent.
---

# Antigravity harness

Run from the target repository. Check `agy --help`, `agy models`, and `agy agents` before launching; flags, access, and agents vary by installation.

## Model classes

These are project routing conventions, not cross-provider benchmark equivalence. An explicit user model overrides the class; report an unavailable selection instead of silently substituting.

| Class | Purpose | Model ID | Effort |
| --- | --- | --- | --- |
| frontier | Most capable work | `gemini-3.1-pro-high` | `high` |
| standard | General difficult work | `gemini-3.8-flash-medium` | `medium` |
| fast | Routine bounded work | `gemini-3.8-flash-low` | `low` |

Here standard and fast share a model family with different presets. Verify each ID with `agy models`; other available families may include Gemini 3.7/3.6 Flash, Claude Sonnet/Opus, and GPT OSS, but are not automatic fallbacks.

## Programmatic launch

Read-only review example; replace the base and scope with the user's actual target:

```sh
agy -p 'Review the diff against main. Do not edit files, commit, push, or post comments. Report actionable findings with file/line evidence and any verification gaps.' \
  --model gemini-3.1-pro-high --effort high \
  --mode plan --sandbox --output-format json --print-timeout 5m
```

- `-p` runs one non-interactive prompt; `--output-format json` supports programmatic consumption (`text` and `stream-json` also exist).
- Set `--model` and `--effort low|medium|high` explicitly; choose a bounded `--print-timeout` (default five minutes).
- `--mode plan` expresses review/planning intent; `--sandbox` restricts terminal access. Neither the prompt nor plan mode is a security boundary. Retain applicable host permissions; never bypass them to complete a run.
- Use `--mode accept-edits` only for authorized implementation. Pass task scope, allowed changes, and verification expectations in the prompt.
- Check exit status and returned errors; a timeout, permission block, or incomplete response is not a completed review. Report it before retrying or changing scope.

## Agents

`agy agents` is the live roster; pass a listed identifier with `--agent IDENTIFIER` only when requested or appropriate. An empty roster means omit `--agent`, not invent an agent name. Agents select instructions; model classes select compute.

The bots installer currently installs agents for Claude and Codex, not Antigravity. Do not assume those installed bot names are available to `agy`.
