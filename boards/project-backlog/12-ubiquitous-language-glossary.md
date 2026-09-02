---
column: backlog
labels: [ddd, backend, docs]
priority: high
updatedAt: 2026-09-02T12:00:00.000Z
---
# Add a ubiquitous language glossary per bounded context

The README pitches shared vocabulary as the core value, but names are the only vocabulary carrier. Add a glossary (term, definition, optional aliases and ref to the building block that embodies it) per bounded context, rendered in docs and UI.

## Checklist

- [ ] Add GlossaryTermSchema and BoundedContext.addTerm
- [ ] Generate a glossary page in packages/doc
- [ ] Add a glossary section to the UI bounded context page
