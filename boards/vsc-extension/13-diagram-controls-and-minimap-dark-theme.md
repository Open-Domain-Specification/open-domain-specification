---
column: backlog
labels: [bug, frontend]
priority: high
live: false
updatedAt: 2026-09-03T12:35:00.000Z
---
# Diagram controls and minimap theme styling in dark mode

In the VS Code extension detail webview (and standalone pages app), when viewing interactive diagrams (context maps, consumable maps, and relation maps), the Svelte Flow canvas, legend, options panel, and nodes render correctly in dark mode according to the VS Code theme, but the zoom/fit controls in the bottom-left corner and the minimap in the bottom-right corner render with stark white backgrounds and borders.

## Problem Details

In packages/pages/src/lib/organisms/InteractiveDiagram.svelte:54, the `<SvelteFlow>` component is declared with `colorMode="system"`. This relies on the browser's `(prefers-color-scheme: dark)` media query, which does not reflect the active VS Code editor theme inside the webview when the host OS is light or when the user chooses a dark theme independent of OS settings.

Furthermore, `@xyflow/svelte` expects `.svelte-flow.dark` on the container or root to apply its dark theme variable overrides (`@xyflow/svelte/dist/style.css:53-97`). Because this class is not triggered, `<Controls />` and `<MiniMap />` fall back to the default light-theme CSS variables (`--xy-controls-button-background-color-default: #fefefe`, `--xy-minimap-background-color-default: #fff`, and `--xy-controls-button-border-color-default: #eee`).

Even when dark mode is forced, Svelte Flow defaults use hardcoded colors rather than the host editor theme variables defined in packages/pages/assets/page.css:1-22 (`--card`, `--border`, `--fg`, `--bg`).

## Checklist

- [ ] Detect host theme reactively (inspecting `.vscode-dark` / `.vscode-high-contrast` on `document.body` or theme context) and pass the resolved mode (`"dark"` or `"light"`) to `colorMode` in packages/pages/src/lib/organisms/InteractiveDiagram.svelte:54
- [ ] Map Svelte Flow controls CSS variables to VS Code theme variables (`--xy-controls-button-background-color: var(--card)`, `--xy-controls-button-background-color-hover: var(--vscode-toolbar-hoverBackground)`, `--xy-controls-button-color: var(--fg)`, `--xy-controls-button-border-color: var(--border)`) in packages/pages/assets/page.css:450-614
- [ ] Map Svelte Flow minimap CSS variables to theme variables (`--xy-minimap-background-color: var(--card)`, `--xy-minimap-mask-background-color`, `--xy-minimap-node-background-color: var(--border)`) with a 1px border matching `var(--border)`
- [ ] Style the Svelte Flow attribution badge to blend seamlessly with `var(--bg)` and `var(--muted)`
- [ ] Verify controls and minimap rendering across light, dark, and high-contrast VS Code themes in apps/ods-vscode/src/pages/panel.ts:152-176
- [ ] Update Storybook stories and unit tests in packages/pages

## Comments

- **jonathan** (2026-09-03T12:35:00.000Z): Raised issue from visual QA of the VS Code detail webview. In dark mode, the canvas and cards follow theme tokens, but the minimap on the bottom-right and controls on the bottom-left stick out in bright white. Need theming aligned with VS Code tokens.
