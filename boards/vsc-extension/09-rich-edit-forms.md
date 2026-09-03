---
column: backlog
labels: [frontend]
priority: high
updatedAt: 2026-09-02T14:30:00.000Z
live: false
---
# Rich forms for add and update

Quick picks are too thin for attributes, relations and consumptions. Add and update open a form webview with dropdowns for enums and reference pickers for targets, built from the same field metadata as the JSON schema so the form and the schema cannot drift. Submitting calls the workspace methods from card 01 and dumps.

## Checklist

- [ ] Form component set on VS Code CSS variables and codicons: text, markdown, select, reference picker, multi reference picker, boolean
- [ ] Form definitions per element type derived from the schema descriptions and enums
- [ ] Reference pickers list valid targets only, across workspaces per card 07
- [ ] Validation preview: run validate against a trial mutation before commit where feasible, otherwise show diagnostics after
- [ ] Update form pre-filled from the element; id shown read-only with a separate change id action
