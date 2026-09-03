---
column: review
labels: [frontend]
priority: medium
updatedAt: 2026-09-03T13:05:00.000Z
live: false
---
# Diagnostics from validate and JSON schema registration

Run Workspace.validate after load and after every mutation and publish the diagnostics to the Problems panel. Each diagnostic ref has the same shape as the JSON path, so map it to a position in workspace.json for real line numbers. Register schema.json with the JSON language service so direct edits get completion and validation.

## Checklist

- [x] Diagnostic collection per workspace file from validate, severity mapped
- [x] Same diagnostics surfaced as badges on tree nodes and on detail pages
- [x] Ref to JSON position mapping using the jsonc parser
- [x] Parse and reference failures on load reported as diagnostics instead of errors
- [x] jsonValidation contribution pointing .ods/*.json at the sibling schema

## Gates

- [x] qa-automated — root npm test green incl. extension unit tests (4); 5 real-VS-Code integration tests (activation, webview boot and routing, panel reuse, static export, open-at-ref); 36 Playwright e2e over the shared pages bundle (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T15:00:00.000Z): src/diagnostics.ts publishes validate results per file with rule as code; src/locate.ts maps a ref to the element's key span with ancestor fallback (tested). Load failures are an error at the file start. Tree icons take the problems error/warning colours with a tooltip listing rules. jsonValidation contribution matches **/.ods/**/*.json against the bundled schema; detail-page badges wait on card 08.
