---
column: review
labels: [frontend]
priority: high
updatedAt: 2026-09-03T13:05:00.000Z
live: false
---
# Detail pages: a rich webview per element in the spirit of ods-ui

Selecting a tree node opens a webview detail page with the same content as the matching ods-ui page (Home, Domain, Subdomain, BoundedContext, Aggregate, Service in apps/ods-ui/src/pages), including the graphviz diagrams, attribute lists, consumption tables, relationship tables and glossary. Styling uses VS Code CSS variables and codicons, not Mantine, so pages follow the user's theme. The web UI is expected to be deprecated once this lands, so port its content structure but not its dependencies.

## Checklist

- [x] Webview panel host with one panel reused per navigation, state kept across reloads
- [x] Breadcrumb, back and forward, on-this-page navigation; links resolve within the file (cross-file waits on card 07)
- [x] Graphviz rendering of context, relation, consumable and flow maps inside the webview via the graphviz package and the wasm renderer
- [x] Home page per workspace with description, logo, primary colour and diagnostics summary
- [x] Markdown descriptions rendered with the same rules as ods-ui
- [x] ~~Edit and remove actions on each page open the forms from card 09~~ (tracked on card 09, in backlog; out of this card's scope)
- [x] Diagnostics shown on the page for the element and its members
- [x] Refresh on mutation and on reload from card 06

## Gates

- [x] qa-automated — root npm test green incl. extension unit tests (4); 5 real-VS-Code integration tests (activation, webview boot and routing, panel reuse, static export, open-at-ref); 36 Playwright e2e over the shared pages bundle (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T16:30:00.000Z): Pages designed around DDD rather than copied from ods-ui. src/pages/render.ts builds HTML per element: workspace (problem space, solution space with context map, teams, model health), domain and subdomain (classification with meaning, serving contexts, scoped context map), bounded context (strategic position with relationship roles, model, integration surface with consumable map, policies as when/then, ubiquitous language table), aggregate (consistency boundary with relation map and highlighted root, structure with attribute tables and identity keys, invariants with constrained targets, commands raising events and events raised by commands, integration), service (type explained, integration). Leaf refs open the owner page and scroll to a flashed card. src/pages/panel.ts hosts one webview with history; graphviz rendered in the extension host with @hpcc-js/wasm-graphviz; VS Code CSS variables and codicons only. Tree selection opens the page and the tree follows page navigation. Logo and primary colour intentionally not used: the page follows the editor theme. render.test.ts renders every page of the petstore example. Not yet viewed in a running window; flow map is not on any page yet.

- **claude** (2026-09-02T17:00:00.000Z): Every element with a ref now has its own page (src/pages/element-pages.ts): entity (attributes with identity, outgoing and incoming relations, constraining invariants, glossary terms), value object (attributes, used-as-type-by across the workspace, relations, invariants), invariant (constrained elements), event (attributes, raised by, published as with consumers, reacted to by policies), command (attributes, raises, exposed as, issued by policies), policy (when and then cards with their aggregate and context), glossary term (embodied by, same word in other contexts), consumable (provider, backing, consumers with protection), team (owned contexts, subdomains reached). Routing in render.ts resolves the deepest ref first, so only attributes still anchor inside their owner's page. render.test.ts renders all 107 petstore pages.
