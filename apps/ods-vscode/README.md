# Open Domain Specification for VS Code

Authors Open Domain Specification (ODS) workspaces from JSON files in a `.ods` folder.

## The authoring model

- The JSON files in `.ods` are the artefact. Each file is one complete workspace.
- The extension holds a `Workspace` instance per file, loaded with `Workspace.fromSchema`. Every edit made through the extension goes through the workspace methods and is written back with `Workspace.toSchema`, so there is one way to mutate the model. Today the only mutation is creating a workspace; the tree and pages are read-only until the editing commands land.
- Anyone else, an LLM included, can edit the files directly. The extension reloads on external changes and reports load failures and validation results in the Problems panel.
- `schema.json` sits beside the workspace files and each file points at it with `$schema`, so editors and LLMs get the full contract without the extension.

## Features

- Workspaces view: domains and subdomains, bounded contexts with their aggregates, services, policies and glossary, teams and relationships. Contexts serving a subdomain appear under it as links.
- Pages: selecting anything in the tree opens a page for its workspace, domain, subdomain, bounded context, aggregate or service. Pages are organised around DDD: problem space and solution space on the workspace, strategic position and integration surface on a context, consistency boundary and behaviour on an aggregate. Diagrams are rendered with Graphviz in the extension host, and every name on a page is a link to that element's page.
- Search: the search icon on the view or Cmd+Alt+O (Ctrl+Alt+O) opens a spotlight over every element in every loaded workspace, matching on name, kind, id and path. Picking one opens its page.
- Problems from the core validation rules mapped to the element's position in the JSON file.
- Create Workspace command, which writes the file and `schema.json`.

## Install the AI skill

`ODS: Install AI Skill` writes the `@open-domain-specification/skill` bundle into the skill folders of the agents you pick: Claude Code (`.claude/skills`), Agent Skills (`.agents/skills`) and Codex (`.codex/skills`), in the project or in your user folder. The skill teaches an agent to detect whether the model is authored as JSON or with the TypeScript DSL, to interview you in plain language before modelling, and to validate every change. Optionally the command appends a pointer paragraph to `AGENTS.md` or `.github/copilot-instructions.md` for agents that read rules files instead. When the extension carries a newer skill than the one installed in a project, it offers an update once.

`ODS: Export Static Site` renders every element page into an `ods-site` folder beside `.ods`, with a sidebar navigation and a light/dark theme, and offers to open it in the browser. The pages are the same ones the extension shows; they come from the `@open-domain-specification/pages` package.

## Development

Run the "Run ODS Extension" launch configuration from the repository root. It builds the extension and opens the example workspace package.

```sh
npm run build -w ods-vscode
npm run package -w ods-vscode
```


## Testing

`npm test` runs the unit suite. `npm run test:vscode` builds the extension, downloads VS Code into `.vscode-test/` on first run, opens the example workspace in an Extension Development Host and drives the commands from Mocha inside it; the webview is verified by the messages the real pages bundle posts back.
