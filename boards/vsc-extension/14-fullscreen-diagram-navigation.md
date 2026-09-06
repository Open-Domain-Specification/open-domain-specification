---
column: done
live: false
labels: [frontend]
priority: high
agent: dev-sonnet
clean-code-swept: true
updatedAt: 2026-09-05T17:02:24.857910+00:00
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

- [x] Add fullscreen toggle button with `codicon-screen-full` / `codicon-screen-normal` to packages/pages/src/lib/flow/DiagramOptionsPanel.svelte:23-49 or the diagram toolbar
- [x] Implement fullscreen state management supporting Fullscreen API and CSS fixed-overlay fallback for webview hosting
- [x] Bind `Escape` key to exit fullscreen mode
- [x] Trigger Svelte Flow `fitView()` on fullscreen enter and exit transitions
- [x] Style fullscreen view with theme background `var(--bg)` and ensure controls, minimap, and legend remain properly positioned
- [x] Verify node click navigation behaviour while in fullscreen mode
- [ ] Test across VS Code webview panel (apps/ods-vscode/src/pages/panel.ts:60-69), static site export, and browser viewer

## Gates

- **qa-automated** (2026-09-03T21:40:00.000Z): `packages/pages` unit suite green, 385/385 tests, 100% lines/branches/statements/functions coverage (`npx vitest run --coverage`). `npm run test:e2e -- diagrams.spec.ts` green, 4/4, including the new fullscreen case in packages/pages/e2e/diagrams.spec.ts:73-108. `npx tsc --noEmit -p packages/pages` clean. `npx @biomejs/biome check` clean on the touched files (one pre-existing false-positive `noFocusedTests` warning on the `fit` identifier in packages/pages/src/lib/flow/fullscreen.svelte.ts:35, not an error, left as is).

## Comments

- **jonathan** (2026-09-03T12:35:00.000Z): Raised feature request to open drawings fullscreen. Navigating complex context and relation maps in the small 60vh embedded window is too constrained; need a fullscreen view for full-canvas exploration.
- **lead** (2026-09-03T15:00:00.000Z): Assigned to dev-opus. Fixed by decision: CSS overlay only. Do not call requestFullscreen; the webview iframe will not grant it and one code path is enough. A `fullscreen` boolean on InteractiveDiagram.svelte toggles a class on `.interactive` giving `position: fixed; inset: 0; z-index: 1000; background: var(--bg)`. The toggle button lives in DiagramOptionsPanel.svelte with codicon-screen-full / codicon-screen-normal and a title. Escape exits (window keydown listener attached only while fullscreen). After toggling, call `fitView()` from `useSvelteFlow()` on the next frame (a tick, then requestAnimationFrame) so the canvas has resized. Node click: exit fullscreen first, then set location.hash. Keep coverage at 100% branches: put the toggle/escape logic in a small `fullscreen.svelte.ts` module with unit tests. Tests that prove it: unit tests on the module, pages unit suite with coverage, and one e2e case in e2e/diagrams.spec.ts that clicks the button, asserts the overlay fills the viewport, presses Escape and asserts it is gone. This card starts after cards 13 and 15 land, rebase onto the branch the lead names. Work in your worktree; `npm ci` there first if node_modules is missing.
- **lead** (2026-09-03T18:50:00.000Z): Cards 13 and 15 are on develop; start from develop head. InteractiveDiagram.svelte now reads `colorMode={hostColorMode.value}` and `diagramOptions.handlesFor(kind)`; the options panel initialises handles via `handlesFor`. Build on those, do not revert them.
- **dev-opus** (2026-09-03T19:10:00.000Z): Claimed. Started from develop head (2b6f0b4) in my worktree, `npm ci` running. Read the cited files: the fixed-height box is packages/pages/src/lib/organisms/InteractiveDiagram.svelte:57 and :62, the options panel is packages/pages/src/lib/flow/DiagramOptionsPanel.svelte:26-51, node click is packages/pages/src/lib/organisms/InteractiveDiagram.svelte:55. Plan per the lead's answer: a `createFullscreen` factory in packages/pages/src/lib/flow/fullscreen.svelte.ts owning the boolean, the window keydown listener and the tick+rAF refit, created in InteractiveDiagram and passed to the options panel as a prop.
- **lead** (2026-09-03T21:10:00.000Z): dev-opus was cut off repeatedly by API overload after writing the implementation: packages/pages/src/lib/flow/fullscreen.svelte.ts and fullscreen.test.ts, the toggle in DiagramOptionsPanel.svelte, the overlay in InteractiveDiagram.svelte, and an e2e case in packages/pages/e2e/diagrams.spec.ts. Reassigned to dev-sonnet to finish in this same worktree: read the diff as it stands, do not redesign it, make the unit suite pass with 100% coverage, make the e2e case pass, tick the checklist items the tests prove, run the sweep, set review. The last checklist item (VS Code webview / export / browser) is the lead's; leave it unticked.
- **dev-sonnet** (2026-09-03T21:40:00.000Z): Claimed to finish. The full `packages/pages` unit suite was already green (51 files, 385 tests) except `functions` coverage sat at 99.61%: v8 flagged the `let fit: () => void = () => {};` default initialiser in packages/pages/src/lib/flow/fullscreen.svelte.ts as an uninstrumented function — it can never run, since every call to `set()` that would use the default first goes through `toggle`, which always assigns a real `fit` before flipping `active`. Fixed by typing `fit` as `(() => void) | undefined` and calling it with `fit?.()` in packages/pages/src/lib/flow/fullscreen.svelte.ts:32-40, removing the unreachable function literal instead of writing a test to force-cover dead code. Reran `npx vitest run --coverage`: 51 files, 385 tests, 100% lines/branches/statements/functions. Ran `npx @biomejs/biome check --write` on the touched files, which reordered the `fullscreen.svelte` import in InteractiveDiagram.svelte and renamed a test-local `escape` helper to `pressEscape` in fullscreen.test.ts (it shadowed the global `escape`, packages/pages/src/lib/flow/fullscreen.test.ts:8). Ran `npm run test:e2e -- diagrams.spec.ts`: 4/4 passed, including the new "the fullscreen toggle fills the viewport and Escape brings the figure back" case (packages/pages/e2e/diagrams.spec.ts:73-108). `npx tsc --noEmit -p packages/pages` clean. Ticked every checklist item the tests prove; left the VS Code webview/export/browser verification item unticked as instructed. Ran the clean-code-review self-scan (diff is ~168 lines / 7 files, over the 50-line threshold, but the change is one small well-named module plus its two call sites — no SRP, DRY, naming, coupling, dead-code, or KISS violation scored above 0.5). `clean-code-swept: true`. Set `column: review`.
- **lead** (2026-09-03T21:40:00.000Z): Reviewed fullscreen.svelte.ts, the panel toggle and the overlay class. Landing on develop.

- **lead** (2026-09-05T17:02:24.857910+00:00): Designer baseline retest found an acceptance regression in the existing native Petstore host: entering fullscreen leaves the Order relation graph small/off-centre; Escape returns an oversized graph clipped at right/bottom. the design lead report and reproduction: docs/team/design/2026-09-05-design-lead-baseline.md:1. Native loaded-bundle provenance is unverified; treat as exploratory runtime evidence and reproduce against the final bundle before closure. Current source moved from6ec06ed to f7a43c3 during background work. Acceptance remains automatic fit on entry/exit across all three diagram kinds and both hosts; manual Fit View is a workaround, not a pass. Existing review status preserved; no duplicate feature ticket or human approval recorded.

- 2026-09-11, lead: driven in a browser against the built app and confirmed against this card's own claim; moved to done.
