# Open Domain Specification

A metamodel for describing a software system the Domain-Driven Design way, a validator that
checks a model against it, and the surfaces that render one. The model is data: a workspace is
JSON, authored through a TypeScript DSL or written directly, and everything else reads it.

## Four ways to read a model, all permanent

One Svelte renderer in `packages/pages` serves the first three; `packages/doc` writes the
fourth. None of them is being retired, and a change to the renderer or to the core model has to
keep all four working.

1. **The VS Code extension** (`apps/ods-vscode`) renders pages in a webview beside the JSON it
   edits. This is where a model is authored.
2. **The static site export**, run from the extension, writes a folder anyone can host.
3. **The viewer at [open-ds.io](https://open-ds.io)**, deployed from `apps/ods-ui`, which is a
   thin deployable: its build copies the pages bundle into `dist/` for the host to publish. A
   reader imports a workspace by URL, form or upload and browses it.
4. **Markdown** from `packages/doc`, which is how a model reaches a repository, a wiki or a
   pull request.

Decision 12 is titled for the package it retired, the old React and Mantine implementation of
the viewer. A package was retired, not a site. Read its current position, not its title.

## Layout

| Path | What it is |
| --- | --- |
| `packages/core` | The metamodel (`schema.ts`), the validator (`validate.ts`), the DSL (`workspace.ts`), the derived maps and the reaction walk |
| `packages/pages` | The Svelte renderer and component library behind three of the four surfaces |
| `packages/graphviz` | Diagram rendering |
| `packages/doc` | Markdown generation |
| `packages/skill` | The bundle an LLM reads to author a model; part generated from core, part hand-written |
| `apps/ods-vscode` | The extension |
| `apps/ods-ui` | The viewer's deployable |
| `apps/docs` | The documentation site |
| `models/` | Five reference models: petstore, rivermart, streamline, northbank, clinic |
| `decisions/` | Numbered decision records |
| `boards/` | RepoDoc cards |
| `STATUS.md` | Where the work stands |

## Ground rules

- **No backwards compatibility.** A schema change needs no migration, no deprecated alias and
  no compatibility period. Change it and change everything that reads it.
- **The landing gate is `bash scripts/verify-all.sh`.** It builds every package, runs every
  suite including the full Playwright end-to-end run, checks the published ESM entries import,
  and compares the generated JSON schema against the petstore's copy. It takes twelve to
  fifteen minutes and refuses to start while a VS Code extension development host is running or
  port 4173 is in use. Nothing lands without it.
- **The reference models are the specification's test.** Each pins the exact diagnostics it
  means to carry, and its `DISCOVERY.md` explains why. If a change moves a model's diagnostics,
  either the change or the model is wrong; do not edit the pinned list to make a build pass.
- **Generated files are generated.** The JSON schema, the model reference, the validation rules
  reference and every model's `.ods` output and `docs/` folder come from a build. Rerun it;
  never hand-edit them.
- **The hand-written surfaces must not lie.** `packages/skill/skill/SKILL.md`, its hand-written
  references, and the documentation site describe what the validator does. When you change a
  rule's reach, change every surface that states it; a drift test in `packages/skill` fails when
  they disagree.

## Decisions

Every rule has a reason, and the reason lives in `decisions/`. Each record opens with a dated
**Current position** stating what holds today; read that first and the amendments below it only
for history. Records are appended to, not rewritten: a superseded sentence stays as written on
the day, and a later amendment, note or correction says what changed and why.

What the model leaves out, it leaves out on purpose. The list of those preferences, each with
its price and a testable condition for reopening it, is decision 15, the "What the model leaves
out on purpose" section of the tactical documentation page, and
`packages/skill/skill/references/preferences.md`. They are this model's preferences, not
Domain-Driven Design's laws, and the record says so.

## Working

Work is carried on RepoDoc cards under `boards/`. A card names its checklist, its gates and a
journal; it lands when the gate is green and its column reads `done`. `STATUS.md` says what is
live, what is next and what is blocked, and is written for whoever picks the work up next.
Anything that is the owner's to decide is a GitHub issue, not a card.
