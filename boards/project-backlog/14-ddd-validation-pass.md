---
column: done
labels: [ddd, backend]
priority: high
updatedAt: 2026-09-03T13:20:00.000Z
live: false
---
# Add a validation pass for DDD rules

There is no validation beyond ref resolution. An aggregate may have zero or many root entities, and provider/consumer pattern combinations are never checked for coherence. Add a `validate()` on Workspace returning structured diagnostics, and run it in the example and UI import.

## Checklist

- [x] Rule: exactly one root entity per aggregate
- [x] Rule: coherent consumable/consumption pattern pairs
- [x] Rule: cross-aggregate references target roots
- [x] Surface diagnostics in the UI import modal

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T12:58:49.000Z): New packages/core/src/validate.ts with six pure rules (aggregate-root, cross-aggregate-reference, role-coherence, separate-ways, policy-complete, context-serves-subdomain) returning Diagnostic records, exposed as Workspace.validate() (packages/core/src/workspace.ts:340-346) and covered by packages/core/src/validate.test.ts. The import page summarises errors and warnings in the load notification (apps/ods-ui/src/pages/ImportWorkspacePage.tsx:28-52) and the home page lists them in apps/ods-ui/src/components/DiagnosticsTable.tsx with links to the offending element. The doc workspace page gets a Diagnostics table and the example generator prints diagnostics. The petstore validates clean; the rich fixture's deliberately unserved Reporting BC is the only warning. Build and 130 tests green. Six-agent audit: nothing above 0.5; hoisted the double validate() call, named the separate-ways rule's variables, extracted a pure summary helper.
