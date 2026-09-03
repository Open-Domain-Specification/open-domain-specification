---
column: review
labels: [frontend, infra]
priority: high
updatedAt: 2026-09-02T15:00:00.000Z
live: false
---
# Extension scaffold in apps with the load, mutate, dump loop

Create apps/ods-vscode as a private workspace package, bundled with esbuild into a single CommonJS file and shipped with vsce, so lerna publish skips it. Workspaces live as JSON files in a .ods folder at the root of the VS Code folder (card 07 defines the set model). The extension loads every workspace in the folder with Workspace.fromSchema, keeps those instances as the only mutation path, and writes Workspace.toSchema back per file with one schema.json beside them. Native VS Code UI throughout.

## Checklist

- [x] Package scaffold, esbuild bundle, launch config, depends on @open-domain-specification/core
- [x] Discover .ods/*.json in each open folder, setting to override the folder name
- [x] Command to create a new workspace file in .ods, writing schema.json if missing
- [ ] Depends on card 07 for loading a set of workspaces that reference each other
- [x] Load on activation, dump after every mutation, atomic write so a watcher never sees a partial file
- [x] schema.json copied from the core build; $schema in each workspace file points at the local sibling file by relative path by default, with a setting to switch to the published docs URL
- [x] README with the authoring model: the JSON is the artefact, the extension and any LLM meet at the file

## Comments

- **claude** (2026-09-02T15:00:00.000Z): apps/ods-vscode scaffolded: esbuild bundle (esbuild.mjs copies the core schema to schema.json at build), root .vscode launch and task, OdsProject in src/project.ts loads every .ods/**/*.json per folder with Workspace.fromSchema, dumps with toSchema plus a $schema pointing at the sibling schema.json, atomic temp-and-rename writes, Create Workspace command. The docs-URL setting for $schema is deferred until card 02 publishes the schema. WorkspaceSchema gained an optional $schema property in core so files validate. ods-example-ws now also emits .ods/petstore.json so the launch config opens something. Builds, 4 unit tests and 89 core tests green. Not yet exercised inside a running VS Code; the card 07 set loader is still to come, so files load independently.
