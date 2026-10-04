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

- The JSON files in `.ods` are the artefact. Each file is one complete workspace with an id of its own, and the files of the folder are the set. There is no root document, no manifest and no order hint; the extension reads the files in code point order of their path.
- A `$ref` with only a fragment is local to its file, so two files may each have a `ledger`. A ref to another file writes the file's path, relative to the file that writes it and percent-encoded, straight before the pointer, for example `my%20team.json#/boundedcontexts/ledger`. `..` is allowed only while the path stays inside the `.ods` folder; an absolute path, a URL or a path outside the folder resolves to nothing and is reported as an unresolved ref on the element that wrote it.
- The extension loads the whole folder together and judges each file by the set it belongs to. Problems, the tree, search, Reveal in JSON and the page are per file: a finding appears on its own file at its own element, a tree row and a search hit name the file that holds the element, and Reveal in JSON opens that file at that element.
- A file that does not parse, is not a workspace file or does not load is left out of the set and reported on its own, and the rest still load. It stays on screen from its last good load, labelled stale. That load is for display only: it is never read to build an edit.
- The extension holds a `Workspace` instance per file, loaded with `Workspace.fromSchema`, and a workspace it creates is written back with `Workspace.toSchema`. Today the only mutation made through the extension is creating a workspace; the tree and pages are read-only until the editing commands land.
- The writer those commands will use changes only the file that owns the thing edited. It is not reachable from any command or form yet; it is exercised by unit tests and by checks in VS Code 1.96.4. It builds each edit from the text of every file of the folder read fresh each time (an open editor's text, else the disk), never from the stale load. The check that the file has not changed since it was read is not atomic with the edit, so a write that lands between that check and the edit can still be lost. A mismatch is retried once and then refused as `file-changed`.
- Anyone else, an LLM included, can edit the files directly. The extension reloads on external changes and reports load failures and validation results in the Problems panel.
- `schema.json` sits beside the workspace files and each file points at it with `$schema`, so editors and LLMs get the full contract without the extension.

The page is one webview that holds the whole folder. Opening a page of another file of the same folder navigates inside it and the Back and Forward history carries on across the files; opening a page from a different `.ods` folder starts the history over. The same-folder case is proved in a real VS Code host; the different-folder reset is proved by unit tests only.

Pages are organised around DDD: problem space and solution space on the workspace, strategic position and integration surface on a context, consistency boundary and behaviour on an aggregate. Contexts serving a subdomain appear under it in the tree as links.

## Install the AI skill

`ODS: Install AI Skill` writes the `@open-domain-specification/skill` bundle into the skill folders of the agents you pick: Claude Code (`.claude/skills`), Agent Skills (`.agents/skills`) and Codex (`.codex/skills`), in the project or in your user folder. The skill teaches an agent to detect whether the model is authored as JSON or with the TypeScript DSL, to interview you in plain language before modelling, and to validate every change. Optionally the command appends a pointer paragraph to `AGENTS.md` or `.github/copilot-instructions.md` for agents that read rules files instead. When the extension carries a newer skill than the one installed in a project, it offers an update once.

`ODS: Export Static Site` renders every element page into an `ods-site` folder beside `.ods`, with a sidebar navigation and a light/dark theme, and offers to open it in the browser. The pages are the same ones the extension shows; they come from the `@open-domain-specification/pages` package. A `.ods` folder is exported as the set it is: every file of it is a workspace of one site, a page of one file links into the others, and a file that does not load is exported from its last good load marked stale.

Not yet proved in a real host: a window with two `.ods` folders, remote workspaces, Windows paths, and file names that differ only in case or Unicode form. Do not rely on them.

## Development

Run the "Run ODS Extension" launch configuration from the repository root. It builds the extension and opens the example workspace package.

```sh
npm run build -w ods-vscode
npm run package -w ods-vscode
```

The screenshots above are generated, never taken by hand. `npm run screenshots -w ods-vscode` runs the integration suite with `ODS_SCREENSHOTS=1`, which sizes the Extension Development Host to 1440x900 and writes the four PNGs into `media/screenshots/`. It is macOS only, because the capture goes through `screencapture`; elsewhere the suite logs that it skipped them.

## Testing

`npm test` runs the unit suite. `npm run test:vscode` builds the extension, downloads VS Code into `.vscode-test/` on first run, opens the example workspace in an Extension Development Host and drives the commands from Mocha inside it; the webview is verified by the messages the real pages bundle posts back.
