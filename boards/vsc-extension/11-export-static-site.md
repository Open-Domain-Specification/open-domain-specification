---
column: done
labels: [frontend]
priority: med
agent: claude
live: false
updatedAt: 2026-09-03T13:20:00.000Z
---
# Export the model as a static site

An `ODS: Export Static Site` command that renders every element page with the panel's renderer into an `ods-site` folder beside `.ods`, with a sidebar navigation in place of the tree view and a light/dark theme stylesheet standing in for VS Code's theme variables, then offers to open it in the browser. Proof of concept for decisions/12-one-renderer-three-hosts.md; the renderer moves to a shared package in boards/project-backlog/23-shared-pages-package.md.

## Checklist

- [x] Host-neutral site generator with ref links rewritten to relative hrefs and leaf refs as fragments
- [x] `site.css` theme variables and sidebar layout
- [x] `page.js` runs without the VS Code bridge
- [x] Command, manifest entry and progress notification
- [x] Test that every link in the exported petstore resolves to a file

## Gates

- [x] qa-automated — root npm test green incl. extension unit tests (4); 5 real-VS-Code integration tests (activation, webview boot and routing, panel reuse, static export, open-at-ref); 36 Playwright e2e over the shared pages bundle (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T16:00:00.000Z): Built the export in apps/ods-vscode/src/pages/site.ts:1-290, theme and sidebar in apps/ods-vscode/media/site.css:1-120, host detection in apps/ods-vscode/media/page.js:1-10, command in apps/ods-vscode/src/extension.ts:70-110. Test at apps/ods-vscode/src/pages/site.test.ts:1-70. Exported the petstore example, served it and checked the workspace and Order aggregate pages in a browser: identical to the panel. Gaps: no search, fixed output folder, nav omits policies, schemas and glossary.
