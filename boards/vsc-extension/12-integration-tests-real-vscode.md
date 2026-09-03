---
column: review
labels: [frontend]
priority: high
agent: claude
live: false
clean-code-swept: true
updatedAt: 2026-09-03T01:30:00.000Z
---
# Integration tests inside a real VS Code window

Verify the extension in a real VS Code window using the recommended practice: `@vscode/test-cli` and `@vscode/test-electron` launch an Extension Development Host over `packages/ods-example-ws`, and Mocha tests inside the host drive the commands. The webview DOM is not reachable from the host API, so the proof that the pages bundle loaded, mounted and routed is the message round trip: the real webview posts `ready` and then `navigated` with the opened ref. Covers `ods.openPage` (first open and reuse), `ods.exportSite` and `ods.revealInJson`. A small test seam exposes the project and the panel from `activate()` and an event for webview messages. Follows boards/project-backlog/26-unit-and-e2e-tests.md.

## Checklist

- [x] `.vscode-test.mjs`, `tsconfig.test.json`, `test:vscode` script, ignores
- [x] Test API from `activate()` and `onDidReceiveWebviewMessage` on the panel
- [x] Tests: activation and four workspaces; open page proves `ready` then `navigated`; reuse yields `navigated` only; export writes the site; reveal selects in the JSON
- [x] Suite green in a downloaded VS Code

## Gates

- [x] clean-code-swept — reviewer sweep of the test seam and suite; message waits made event-driven, duplicated file lookup folded into a helper, misleading default timeout removed; 5 passing in VS Code 1.96.4 (claude, 2026-09-03T01:30:00.000Z)

## Comments

- **claude** (2026-09-03T00:20:00.000Z): Raised from the request to verify the webview inside real VS Code. Delegated to a subagent with the spec above.
- **claude** (2026-09-03T01:30:00.000Z): Suite in place and green in a downloaded VS Code 1.96.4: apps/ods-vscode/.vscode-test.mjs:1-20 launches the Extension Development Host over packages/ods-example-ws, apps/ods-vscode/src/test/extension.test.ts:1-230 drives activation, `ods.openPage` (the real webview posts `ready` then `navigated` with the ref, then `navigated` alone on reuse), `ods.exportSite` and `ods.revealInJson`. Test seams: `activate` returns `OdsTestApi` (apps/ods-vscode/src/extension.ts) and the panel exposes `onDidReceiveWebviewMessage` (apps/ods-vscode/src/pages/panel.ts:25-31). The first run exposed a release-blocking bug no other suite could see: the built extension failed to activate because the pages `site` entry resolved its app folder from `__dirname` at module load, which esbuild's CommonJS bundle turned into an undefined URL. Fixed at the source: `exportSite` now takes `appDir` explicitly (packages/pages/src/site.ts:19-28), the extension passes media/app (apps/ods-vscode/src/extension.ts:111-116), and the tsup shims are gone. Run with `npm run test:vscode` in apps/ods-vscode.
