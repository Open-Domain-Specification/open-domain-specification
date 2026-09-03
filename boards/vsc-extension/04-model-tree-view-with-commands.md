---
column: doing
labels: [frontend]
priority: medium
updatedAt: 2026-09-02T15:00:00.000Z
live: false
---
# Tree view of the model with add, update and remove commands

A side bar view driven from the in-memory workspaces, with the same navigation structure as the ods-ui Navbar. Contexts serve many subdomains, so the tree is not one nesting: each workspace root has three sections, Domains (domain, subdomain, with link nodes for the contexts serving each subdomain), Bounded Contexts (context, then aggregates and services and their members), and Teams and Relationships. Selecting a node opens its detail page (card 08). Context menu commands open the forms from card 09 and trigger a dump.

## Checklist

- [ ] Tree data provider over the visitor from core
- [x] Three sections per workspace root; link nodes reveal the real node
- [x] Labels show the name with the id as the subtle description text
- [ ] Selection opens the detail page; Reveal in JSON is a secondary command
- [ ] Add, update and remove commands in the context menu, remove confirms and lists the references that will be cleaned up
- [x] Diagnostic badges on nodes using the theme error and warning icons

## Comments

- **claude** (2026-09-02T15:00:00.000Z): Read-only tree in src/tree.ts: Domains, Bounded Contexts, Teams, Relationships per workspace; subdomains list serving contexts as link nodes and Consumes lists consumables as links, both revealing the real node. Selection reveals the JSON for now; detail pages (card 08) and add/update/remove (needs card 01) remain.
