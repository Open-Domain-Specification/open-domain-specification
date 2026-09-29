---
column: doing
labels: [pages, accessibility]
priority: medium
agent: developer
live: true
updatedAt: 2026-09-29T17:07:50.000Z
---
# A diagram node opens from the keyboard

Issue #47, a child of epic #61 (accessible navigation across the viewer, export and extension). A node on an interactive diagram was a mouse target: Svelte Flow made it a Tab stop, but it carried no accessible name, was announced as a "node" in a "group", and Enter and Space did nothing because the diagram has nothing to select (`elementsSelectable` is off) and the library's own keys only select. Every node now carries the name "<name>, <kind>" (for example "Sales BC, bounded context"), is announced as a link when it stands for a page, and Enter and Space open that page as a click does. The pointer interactions are unchanged. The same bundle runs in the webview, the viewer and the static export; the real VS Code host is the lead's integration pass.

## Checklist

- [x] A Playwright test with real key presses that failed first: no node had a name, and Tab, Enter and Space reached no page (viewer and static export)
- [x] `kind` on every graph node, set by each of the four map adapters, and the accessible name built from it in `flowNodes`
- [x] Clusters are decoration: not focusable, not named
- [x] Enter and Space on the focused node go where a click goes, and take the key so Space does not scroll the page
- [x] The description a node points at says what the keys do here, not "select" and "delete"
- [x] A focus ring in the workbench's own focus colour
- [x] Pointer click still opens a node (e2e, both hosts)
- [x] `npx vitest run --coverage` in packages/pages holds 100%, `npm run check` clean

## Gates

- [x] `npx @biomejs/biome check` on the touched files exits 0
- [ ] `bash scripts/verify-all.sh` green
- [ ] real VS Code host check (lead)

## Comments

- **developer** (2026-09-29T16:35:37.000Z): Failing first. `e2e/diagram-keyboard.spec.ts` on the unchanged bundle: 3 of 4 fail (`every node is named ... and reached with Tab`, `Enter opens the page of the focused node`, `Space opens it too`), the pointer test passes. Svelte Flow 1.6.6 already gives a node `tabindex=0` and `role="group"` (`NodeWrapper.svelte`, `nodesFocusable` defaults on), so reachability was there; the name, the link role and the keys were not. Its own `onKeyDown` only calls `handleNodeSelection`, which does nothing while elements are unselectable.
- **developer** (2026-09-29T16:35:37.000Z): Decision, the name. "<name>, <kind>" with the kind in the words the pages use: `bounded context`, `external system`, `big ball of mud`, `boundary-only bounded context`; `root entity`, `entity`, `value object`; `service`, `aggregate`; `event`, `operation` (the metamodel's `command`), `policy`, `process`. `kind` is a required field on `GraphNode` (`graph.ts:21`) so a new adapter cannot ship a node with no name. Built at `flow-nodes.ts:117`.
- **developer** (2026-09-29T16:35:37.000Z): Decision, the role. A node whose id is a ref opens a page, so it is `role="link"` (`flow-nodes.ts:119`); one that is not stays a `group` and does nothing on either input. `opensPage` (`flow-nodes.ts:51`) is the one test both the role and the keys use. Space activating a link is not native, which is why the handler takes the key itself.
- **developer** (2026-09-29T16:35:37.000Z): Decision, the keys. One `keydown` handler on the diagram wrapper (`InteractiveDiagram.svelte:97`), acting only when the key lands on the node's own element, so a control inside a card is left alone. It shares `open` (`InteractiveDiagram.svelte:86`) with `onnodeclick`, so the two cannot drift. No second interaction framework, and no `onnodekeydown` exists in the library to use.
- **developer** (2026-09-29T16:35:37.000Z): Decision, the order. Tab follows the array order of `flowNodes`, which is the graph's own order, which is the model's; it is stable between renders where a layout order would move with a drag. Clusters are `focusable: false` (`flow-nodes.ts:102`), so they are not stops.
- **developer** (2026-09-29T16:35:37.000Z): The library's node description read "Press enter or space to select a node. You can then use the arrow keys to move the node around. Press delete to remove it". None of that is true here. `ariaLabelConfig` (`InteractiveDiagram.svelte:40`) replaces both variants with "Press enter or space to open its page." The edge description, which is the same kind of untruth, is left alone (out of scope: issue 47 is about nodes).
- **developer** (2026-09-29T16:35:37.000Z): Focus ring at `page.css:341`, `1px solid var(--vscode-focusBorder, var(--accent))` with a 2px offset, on the node's box so a big ball of mud's clipped octagon does not clip the ring. The variable needs its fallback: the viewer and the export do not define `--vscode-focusBorder` on that page and the bare form computed to no outline at all, which the e2e caught.
- **developer** (2026-09-29T17:07:50.000Z): Follow-up from review: edges out of the Tab order. Clicking an edge does nothing on any of the four maps: there is no `onedgeclick` in `InteractiveDiagram.svelte`, and the badges on a context edge are their own buttons (card 150), so no kind of edge has an action to give keyboard parity to. So `edgesFocusable={false}` (`InteractiveDiagram.svelte:132`), and the order is badges, nodes, controls. Before, each edge was a stop named "Edge from A to B" carrying the library's "select an edge ... delete it" description. Failing first: `diagram-keyboard.spec.ts` ("Tab stops only on things that do something") found edge stops and a `select`/`delete` description on the unchanged bundle; it now passes on the viewer and the export, tabbing through the whole context map and asserting no stop is named "Edge from ..." and none is described with select, delete or move. Only the context map has edges with an action of any kind (the badges); the consumable, relation and flow maps' edges have none.
