---
column: todo
labels: [bug, frontend]
priority: high
agent: dev-opus
updatedAt: 2026-09-03T15:00:00.000Z
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
- **lead** (2026-09-03T15:00:00.000Z): Assigned to dev-opus. Fixed by decision: (1) Mode detection lives in a new `packages/pages/src/lib/flow/theme.svelte.ts` exporting a reactive `colorMode` getter: `document.body` class `vscode-dark` or `vscode-high-contrast` => "dark"; `vscode-light` or `vscode-high-contrast-light` => "light"; neither => "system". Watch body class changes with a MutationObserver so a theme switch in VS Code updates live; unit test with jsdom by toggling the class. Pass it to `colorMode` in InteractiveDiagram.svelte. (2) Token mapping in packages/pages/assets/page.css scoped under `.interactive .svelte-flow`: controls use `--card`, `--fg`, `--border`, hover `var(--vscode-toolbar-hoverBackground, var(--border))`; minimap background `--card`, mask `color-mix(in srgb, var(--bg) 60%, transparent)`, nodes `--border`, 1px `--border` border and `--radius`. (3) Attribution stays (xyflow licence) but styled `color: var(--muted); background: transparent; font-size: 10px`. Do not change colour constants elsewhere. Card 14 will edit InteractiveDiagram.svelte after you; keep your edit there to the one prop. Coverage stays at 100% branches; keep logic in the .svelte.ts module, not in template expressions. Tests that prove it: pages unit suite with coverage (`npm run test:unit -w packages/pages`), a Storybook story for InteractiveDiagram with the dark body class if one is easy to add, and `cd apps/ods-vscode && npm run test:vscode` if that suite already covers themes; the lead does the visual check headed. The checklist item about verifying across three VS Code themes is the lead's; leave it unticked. Work in your worktree; `npm ci` there first if node_modules is missing.
