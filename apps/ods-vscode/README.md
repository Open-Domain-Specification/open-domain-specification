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

## Development

Run the "Run ODS Extension" launch configuration from the repository root. It builds the extension and opens the example workspace package.

```sh
npm run build -w ods-vscode
npm run package -w ods-vscode
```
