# Open Domain Specification for VS Code

Your domain model is one artefact: a DDD workspace held as JSON in a `.ods` folder in the repo, met consistently across three surfaces. During authoring, the editor renders live pages and diagrams, search finds every element, and validation reports in the Problems panel. Across the other two surfaces, static export publishes the same pages for your team, and the AI skill equips a coding agent as a DDD copilot to help you learn and model the DDD way.

![The Workspaces tree beside the workspace page](https://raw.githubusercontent.com/Open-Domain-Specification/open-domain-specification/main/apps/ods-vscode/media/screenshots/workspaces-tree.png)

_How the overall architecture partitions into strategic problem and solution spaces_

![An aggregate page](https://raw.githubusercontent.com/Open-Domain-Specification/open-domain-specification/main/apps/ods-vscode/media/screenshots/aggregate-page.png)

_Which entities share the consistency boundary and how domain behaviour enforces invariants_

![The search spotlight](https://raw.githubusercontent.com/Open-Domain-Specification/open-domain-specification/main/apps/ods-vscode/media/screenshots/search-spotlight.png)

_How to locate any concept, relationship or identifier across all loaded workspaces_

![A bounded context page with its context map, in dark theme](https://raw.githubusercontent.com/Open-Domain-Specification/open-domain-specification/main/apps/ods-vscode/media/screenshots/context-map-dark.png)

_How upstream and downstream relationships define integration boundaries with surrounding systems_

## Features

- **Workspaces tree** — Navigate domains, subdomains, bounded contexts, aggregates, services, policies, glossary terms, teams and explicit relationships.
- **Interactive diagrams** — Pan, zoom and drag the nodes of a context, consumable or relation map, and click any node to open that element's page.
- **Spotlight search** — Press Cmd+Alt+O to filter elements by name, kind, identifier or path and jump straight to their live page.
- **Core rule validation** — ODS rules enforce model constraints and pinpoint issues to the exact line in your file.
- **Agent skill installer** — Writes bundles for Claude Code, Agent Skills and Codex so assistants interview you in plain language and validate every change.
- **Static site export** — Generates a standalone website with sidebar navigation and light and dark themes ready to host anywhere.

## The authoring model

- The JSON files in `.ods` are the artefact. Each file is one complete workspace.
- The extension holds a `Workspace` instance per file, loaded with `Workspace.fromSchema`. Every edit made through the extension goes through the workspace methods and is written back with `Workspace.toSchema`, so there is one way to mutate the model. Today the only mutation is creating a workspace; the tree and pages are read-only until the editing commands land.
- Anyone else, an LLM included, can edit the files directly. The extension reloads on external changes and reports load failures and validation results in the Problems panel.
- `schema.json` sits beside the workspace files and each file points at it with `$schema`, so editors and LLMs get the full contract without the extension.

Pages are organised around DDD: problem space and solution space on the workspace, strategic position and integration surface on a context, consistency boundary and behaviour on an aggregate. Contexts serving a subdomain appear under it in the tree as links.

## Install the AI skill

`ODS: Install AI Skill` writes the `@open-domain-specification/skill` bundle into the skill folders of the agents you pick: Claude Code (`.claude/skills`), Agent Skills (`.agents/skills`) and Codex (`.codex/skills`), in the project or in your user folder. The skill teaches an agent to detect whether the model is authored as JSON or with the TypeScript DSL, to interview you in plain language before modelling, and to validate every change. Optionally the command appends a pointer paragraph to `AGENTS.md` or `.github/copilot-instructions.md` for agents that read rules files instead. When the extension carries a newer skill than the one installed in a project, it offers an update once.

`ODS: Export Static Site` renders every element page into an `ods-site` folder beside `.ods`, with a sidebar navigation and a light/dark theme, and offers to open it in the browser. The pages are the same ones the extension shows; they come from the `@open-domain-specification/pages` package.

## Development

Run the "Run ODS Extension" launch configuration from the repository root. It builds the extension and opens the example workspace package.

```sh
npm run build -w ods-vscode
npm run package -w ods-vscode
```

The screenshots above are generated, never taken by hand. `npm run screenshots -w ods-vscode` runs the integration suite with `ODS_SCREENSHOTS=1`, which sizes the Extension Development Host to 1440x900 and writes the four PNGs into `media/screenshots/`. It is macOS only, because the capture goes through `screencapture`; elsewhere the suite logs that it skipped them.

## Testing

`npm test` runs the unit suite. `npm run test:vscode` builds the extension, downloads VS Code into `.vscode-test/` on first run, opens the example workspace in an Extension Development Host and drives the commands from Mocha inside it; the webview is verified by the messages the real pages bundle posts back.
