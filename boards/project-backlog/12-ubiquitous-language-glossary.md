---
column: review
labels: [ddd, backend, docs]
priority: high
updatedAt: 2026-09-03T13:05:00.000Z
live: false
---
# Add a ubiquitous language glossary per bounded context

The README pitches shared vocabulary as the core value, but names are the only vocabulary carrier. Add a glossary (term, definition, optional aliases and ref to the building block that embodies it) per bounded context, rendered in docs and UI.

## Checklist

- [x] Add GlossaryTermSchema and BoundedContext.addTerm
- [x] Generate a glossary page in packages/doc
- [x] Add a glossary section to the UI bounded context page

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T12:50:21.000Z): GlossaryTermSchema (name, definition, aliases, embodiedBy ref) on BoundedContextSchema.glossary with termRef (packages/core/src/schema.ts:150-165,250-262). GlossaryTerm class with embody(), BoundedContext.addTerm, Workspace.getTermByRef, and a generic Workspace.getByRef that dispatches on the collection segment of a ref; the older polymorphic lookups now narrow its result instead of keeping their own predicates (packages/core/src/workspace.ts:175-200,380-440,1640-1700). Loader links embodiedBy last so any element can be targeted (packages/core/src/workspace-from-schema.ts:329-345). Doc: glossary table on each context page and a workspace-level glossary page linked from the sidebar (packages/doc/src/glossary.md.ts); UI: Glossary accordion with a link to the embodying element and spotlight entries. Petstore has terms for Catalog, Sales and Inventory. Build and 123 tests green. Six-agent audit: three agents flagged the resolver duplicating the isXRef predicates (up to 0.45), fixed by unifying on getByRef; coupling asked for a method instead of field assignment, added embody().
