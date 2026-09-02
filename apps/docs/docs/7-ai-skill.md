# AI Skill

`@open-domain-specification/skill` is an installable agent skill that teaches an AI coding
agent (Claude Code, Codex, or anything that reads the Agent Skills layout) to author ODS
workspaces well. It is the successor of the copy-paste "LLM context" prompt this page used to
carry: instead of pointing a model at raw source files, it ships a `SKILL.md` and a set of
reference documents that are generated from the core package, so they can never drift from
the model the tooling implements.

## What the skill does

- **Detects how the workspace is authored.** A project either keeps its model as JSON files
  in a `.ods` folder, edited by the VS Code extension, or builds it with the TypeScript DSL and
  generates the JSON. The skill looks for a generator script first, falls back to the `.ods`
  folder, and asks only when neither exists. In DSL mode it edits the source and re-runs the
  generator; in JSON mode it edits the files and validates them.
- **Interviews before it models.** Most developers do not know DDD, and the skill does not
  expect them to. It plays the role of a facilitator: plain-language questions about the
  business areas, who owns which part, how the parts talk to each other, what the things
  inside one part are and what must never happen to them. Each answer is reflected back as
  the element it would record before anything is written.
- **Translates.** A translation table maps what people say ("we copy their data and reshape
  it", "when an order is placed we then reserve stock") onto ODS elements (an
  anti-corruption-layer consumption, an event, a policy and an operation).
- **Teaches lightly.** The first time a DDD term comes up, the skill explains it in one
  sentence tied to the user's own example, then moves on.
- **Validates every change** with the same `Workspace.validate()` rules the extension and the
  core library apply, and explains each diagnostic in plain words with the fix it proposes.
  See [Validation](./3-core/4-validation.md) for the rules themselves.

## Installing it

From VS Code, run `ODS: Install AI Skill`. Pick the agents to install for and whether the
skill goes into the project or your user folder. The command writes the bundle to:

| Agent | Folder |
|---|---|
| Claude Code | `.claude/skills/ods-authoring/` |
| Agent Skills (Codex and others) | `.agents/skills/ods-authoring/` |
| OpenAI Codex | `.codex/skills/ods-authoring/` |

For agents that read a rules file instead, the command can append a short pointer paragraph to
`AGENTS.md` or `.github/copilot-instructions.md`. When a newer extension carries a newer skill
than the one installed in a project, it offers to update it once.

Without VS Code, copy the `skill/` folder of the npm package into the same location:

```sh
npm pack @open-domain-specification/skill
tar -xzf open-domain-specification-skill-*.tgz
cp -r package/skill .claude/skills/ods-authoring
```

## What is in the bundle

| File | Purpose |
|---|---|
| `SKILL.md` | The always-loaded instructions: role, mode detection, the read, interview, translate, edit, validate loop, defaults and a do-not list. |
| `references/interview-playbook.md` | The facilitator script, in seven phases from orientation to validation. |
| `references/translation-table.md` | What people say, the ODS element, where it lives in JSON and the DSL call that creates it. |
| `references/ddd-glossary.md` | One sentence per DDD term, phrased to be filled with the user's example. |
| `references/json-mode.md`, `references/dsl-mode.md` | Mechanics of each authoring mode, including how to validate. |
| `references/dsl-api.md` | The core DSL surface. |
| `references/model-reference.md` | Generated from the JSON Schema: every element, field, type and requirement, plus the ref grammar. |
| `references/validation-rules.md` | Generated from the core rule catalog: what each rule requires, why it matters and the usual fix. |
| `examples/` | A minimal workspace as JSON and as DSL, a validation script, and patterns excerpted from the Petstore example. |

The minimal workspace the skill starts from:

```json file=../../../packages/skill/skill/examples/minimal.ods.json
```
