---
column: todo
labels: [frontend]
priority: high
agent: dev-opus
updatedAt: 2026-09-03T18:50:00.000Z
---
# Fullscreen mode for interactive diagram navigation

Interactive diagrams (context maps, consumable maps, and relation maps) are currently embedded in a fixed-height container on detail pages (`.interactive { height: 60vh; min-height: 320px; }` in packages/pages/src/lib/organisms/InteractiveDiagram.svelte:65 inside packages/pages/src/lib/organisms/DiagramFigure.svelte:20-27). For non-trivial domain models with numerous bounded contexts, clusters, and relations, navigating within a 60vh box in an editor split panel is cramped and makes spatial comprehension difficult.

## Requirements

Provide an "Open Fullscreen" option that lets users expand any diagram into a full-canvas view to pan and zoom comfortably across the entire drawing, with a clean exit back to the detail page.

## Implementation Details

- Add a fullscreen toggle button with standard VS Code codicons (`codicon-screen-full` / `codicon-screen-normal`) to packages/pages/src/lib/flow/DiagramOptionsPanel.svelte:23-49 or the diagram controls toolbar.
- Implement fullscreen toggling using the standard Fullscreen API (`element.requestFullscreen()`), paired with a robust CSS fixed-overlay fallback (`position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 1000; background: var(--bg);`) for VS Code webviews where iframe permissions (`allow="fullscreen"`) might be restricted.
- Automatically call Svelte Flow's `fitView()` upon entering and exiting fullscreen so the diagram re-centers and scales to the new viewport size.
- Listen for the `Escape` key to immediately exit fullscreen mode.
- Ensure node click navigation (`location.hash = node.id` in packages/pages/src/lib/organisms/InteractiveDiagram.svelte:54) continues to navigate or exit cleanly when jumping to a referenced element page.

## Checklist

- [ ] Add fullscreen toggle button with `codicon-screen-full` / `codicon-screen-normal` to packages/pages/src/lib/flow/DiagramOptionsPanel.svelte:23-49 or the diagram toolbar
- [ ] Implement fullscreen state management supporting Fullscreen API and CSS fixed-overlay fallback for webview hosting
- [ ] Bind `Escape` key to exit fullscreen mode
- [ ] Trigger Svelte Flow `fitView()` on fullscreen enter and exit transitions
- [ ] Style fullscreen view with theme background `var(--bg)` and ensure controls, minimap, and legend remain properly positioned
- [ ] Verify node click navigation behaviour while in fullscreen mode
- [ ] Test across VS Code webview panel (apps/ods-vscode/src/pages/panel.ts:60-69), static site export, and browser viewer

## Comments

- **jonathan** (2026-09-03T12:35:00.000Z): Raised feature request to open drawings fullscreen. Navigating complex context and relation maps in the small 60vh embedded window is too constrained; need a fullscreen view for full-canvas exploration.
- **lead** (2026-09-03T15:00:00.000Z): Assigned to dev-opus. Fixed by decision: CSS overlay only. Do not call requestFullscreen; the webview iframe will not grant it and one code path is enough. A `fullscreen` boolean on InteractiveDiagram.svelte toggles a class on `.interactive` giving `position: fixed; inset: 0; z-index: 1000; background: var(--bg)`. The toggle button lives in DiagramOptionsPanel.svelte with codicon-screen-full / codicon-screen-normal and a title. Escape exits (window keydown listener attached only while fullscreen). After toggling, call `fitView()` from `useSvelteFlow()` on the next frame (a tick, then requestAnimationFrame) so the canvas has resized. Node click: exit fullscreen first, then set location.hash. Keep coverage at 100% branches: put the toggle/escape logic in a small `fullscreen.svelte.ts` module with unit tests. Tests that prove it: unit tests on the module, pages unit suite with coverage, and one e2e case in e2e/diagrams.spec.ts that clicks the button, asserts the overlay fills the viewport, presses Escape and asserts it is gone. This card starts after cards 13 and 15 land, rebase onto the branch the lead names. Work in your worktree; `npm ci` there first if node_modules is missing.
- **lead** (2026-09-03T18:50:00.000Z): Cards 13 and 15 are on develop; start from develop head. InteractiveDiagram.svelte now reads `colorMode={hostColorMode.value}` and `diagramOptions.handlesFor(kind)`; the options panel initialises handles via `handlesFor`. Build on those, do not revert them.
