---
column: doing
labels: [pages, diagrams, bug]
priority: medium
agent: opus-coordinator
live: true
status: CI setup correction proved; new clean landing gate next
progress: 80
clean-code-swept: true
updatedAt: 2026-10-03T05:28:39.898302+00:00
---
# A diagram fits the canvas it is given, and no panel covers a node

Epic #102, issues #89, #90 and #86. A reader opening an inline or fullscreen diagram sees the whole graph at the largest size the canvas allows, with every node clear of the legend, the options panel, the minimap and the zoom controls. The shared renderer serves the VS Code webview, the static export and the hosted viewer; Markdown diagrams are Graphviz and do not use this fit. No metamodel or validator change.

## Checklist

- [x] Reproduce #89 and #90 on `develop` in both themes at 1300x900 and at an editor-sized host
- [x] Reproduce #86 with a hand-driven fullscreen transition after the layout settles
- [x] #90: the fit reserves the minimap and the controls; a panel opened or closed by the reader refits while the fit owns the view; Fit View is the panel-aware fit
- [x] #89: the fit keeps only the gutter inset; the air step leaves the relief order, with a dated amendment to `flow-diagram-panels.md`
- [x] #86: entering and leaving fullscreen refit once Svelte Flow has measured the new canvas
- [x] #103 delivered separately in PR133; actual drag correction retained after rebase
- [x] Independent issue-level and integrated review
- [ ] STATUS.md and sprint 03

## Gates

- [x] Focused: pages unit; Playwright fit specs on the viewer and the static export, both themes, inline and fullscreen, dense and sparse maps; each new regression fails on the code before its fix
- [x] Real VS Code: `npm run test:vscode` and `npm run test:vscode:keyboard` where the webview's fit or fullscreen changes
- [x] Clean-code sweep
- [ ] `bash scripts/verify-all.sh` green on the final integrated head under Node 26, with no `NODE_OPTIONS`
- [ ] One PR to `develop` for epic #102; CI `test`, `e2e` and `real-vscode` green

## Comments

- **lead** (2026-09-30T19:40:00Z): Picked up on `codex/epic-102-diagram-fit` from `origin/develop` `a0e88e97`. Reproduced in the viewer on NorthBank, settled (the viewport, legend and options boxes unchanged for 30 frames) before measuring:
  - #90 at 1300x900, both themes identical: the minimap covers Payments Hub on the workspace map, Regulatory Reporting on the Ledger subdomain map and Credit Decisioning on the Customer & KYC context map. At 1150x700 it covers Payments Hub and Shared Kernel on the workspace map and Regulatory Reporting on Ledger. The fit measures only the legend and the options panel, never the minimap or the controls. With the fit as it stands the legend never covered a node after a fit; the reported legend overlap is the reader opening it afterwards, which nothing refits.
  - #89 at 1300x900: every map keeps 10% air on each free side (`BASE_PADDING` 0.25) however small it is drawn. OnboardingApp's consumable map fits at zoom 0.267 with 77px of air left and right, the graph 608x221 in a 760x540 canvas; the Customer & KYC context map at 0.376 fills 80% of the width. The wide map is width-bound, so the 220px band the report saw is its aspect; the lost scale is the air.
  - #86 is not a capture-timing artifact. Clicking Enter fullscreen and waiting for the overlay to settle leaves the workspace map at zoom 0.2 in the top-left 646x439 of a 1300x900 screen; leaving fullscreen then draws it at 0.356, half again wider than the 760x540 canvas. Svelte Flow reads its size with `bind:clientWidth`, a ResizeObserver that reports after the refit's tick and frame, so the refit fits to the previous size each way.
- **lead** (2026-09-30T19:45:00Z): #90 in `ab8e0a87`:
  - The fit measures the controls and the minimap as well as the legend and the options.
  - Each panel's strip, column or band, is chosen for the map being fitted: every combination is tried and the largest fit wins. A strip the 40% cap cuts short is offered only when neither strip clears the panel. A first cut chose one, and it put the petstore's legend over Catalog at 1280x720.
  - A panel changing size refits while the view is still the fit's, and Fit View is panel-aware.

  The Sonnet review found the panel observer watched nothing, because `container` is bound after PanelFit mounts. The Ledger toggles could not show that, since reopening a panel lands on the starting layout. `f6e19146` observes after the first tick, and adds the workspace map, where the reader opens a legend the fit had closed. With the observer dead, that case covers nodes. The spec's 35 cases: 20 fail on `develop`.
- **lead** (2026-09-30T19:50:00Z): #89 in `eb5ad11a`:
  - The air step is retired and a free side keeps the 12px gutter. The 8px in the report is named nowhere in the spec, so it is not adopted.
  - Measuring RiverMart showed the relief walk counting the sketch style's hidden cluster nodes, which `fitView` leaves out. It gave way to the floor for a map that fitted at 0.209. `drawnBounds` measures only drawn nodes.
  - `expectFilled` asserts the graph stops the gutter short of the canvas's edge, or of the panel it clears, along the binding axis. 19 of the spec's 36 cases fail on the #90 head.

  The review's points are done in `67f297ad`: a current-position block, the costs named, a stale comment, and a headline test. OnboardingApp's width fill went from 0.80 to above 0.9. Its inline zoom is 0.320, up from 0.267, and fullscreen is 0.56. The inline map still sits in a 760px canvas, so further legibility there would need a layout change, not a fit.
- **lead** (2026-09-30T19:55:00Z): #86 in `b4c6740e` and `6e4fbb99`:
  - Not a capture artifact: the refit ran a tick and a frame after the toggle, before Svelte Flow's ResizeObserver measured the overlay.
  - PanelFit follows Svelte Flow's measured size, and fullscreen hands the view back to the fit. An overlay the same size as the canvas fits at once.
  - Each transition moves the viewport once, at the new size. A resized window used to leave nodes under a panel and now refits.
  - All 8 fullscreen cases fail on the #89 head.
- **lead** (2026-09-30T19:58:00Z): Real VS Code in `b698e17c`: a keyboard journey reads the webview through the same settled-fit measure. It covers the map inline, a toggled legend, and fullscreen entered by Enter and left by Escape. It fails on `develop`, with 71px of air either side. `npm run test:vscode:keyboard` passed 24 of 24 and `npm run test:vscode` 9, 1 and 5 passing with 4 pending, on the code before `b7410cbe`.

  The integrated review found no blocker. `b7410cbe` covers a legend that arrives after mount, the clean-code DRY finding (0.55) and two nits. The review suspected the style switch or the resize could refit mid-drag and worsen #103. 150 instrumented runs of the drag on this code show one scale before mouseup in every run, so the root is unchanged: auto-pan frame count. #103 stays separate.
- **lead** (2026-09-30T20:34:00Z): Codex's review of PR #106 at `70d04bd8` found two blockers that CI on Linux showed, and both are fixed in the same PR:
  - #90, `8e6575f4` and `1f2cf802`. Ledger at 1150x700 put Sovereign Core (legacy) under the open legend, `data-fit` none, in both themes.
    - Cause: the legend's 244px column is exactly the 40% cap of the 610px canvas on macOS fonts and a pixel over it on Linux, and its band is over the cap too. The fit fell back to a strip cut to the cap, which stopped short of the legend. The relief walk never asked whether a panel could be cleared.
    - Fix: a panel no strip within the cap clears now gives way. One the reader opens anyway is cleared past the cap, as long as the chosen strips leave the map a fifth of each axis; otherwise every panel is cut to the cap. My statement above that a cut strip is offered only when neither strip clears is superseded.
    - Evidence: the matrix gains 1100x700, where the same failure happens on any fonts; it fails on `70d04bd8` in both themes. The petstore at 1150x700 now gives way to the legend (0.492, not 0.346).
  - #86, `ad2bed3f`. The Linux webview's fullscreen canvas was 996px beside a 981px document.
    - Cause: `100vw` counts the classic scrollbar, so the fit drew under it.
    - Fix: the overlay is `inset: 0` with its height reset.
    - Evidence: `e2e/diagram-fullscreen-scrollbar.spec.ts` launches Chromium without `--hide-scrollbars` and gives the root a 15px scrollbar, asserting it takes room. The overlay must equal the visible viewport, and the node nearest the scrollbar must be hit-testable. It fails on `70d04bd8`. The macOS webview floats its scrollbars even when styled, so CI's Linux `real-vscode` job holds the webview case.

  An independent Sonnet review of the corrections found no blocker; its two should-fixes are in `1f2cf802`. On the corrected code, `npm run test:vscode:keyboard` passed 24 of 24 and `npm run test:vscode` 9, 1 and 5 passing with 4 pending. The #103 evidence is posted on that issue as separate tracking: #89's removal of the air puts the drag's target 101px past the canvas edge instead of 49px, so auto-pan timing decides more of it. The test is not changed here.


- **lead** (2026-10-03T03:29:55.405402+00:00): Current integration accepted for validation at 8ac154c5 on develop f06b8484; prior checkmarks reset because historical 70d/071 proof does not cover the current 19-context model. In packages/pages/src/lib/organisms/InteractiveDiagram.svelte:164, refitDrag and modelRefToHash survive the merge alongside panel/fullscreen behavior. Canonical modelHash plus intended-page checks in packages/pages/e2e/diagram-panel-fit.spec.ts:119, diagram-fullscreen-fit.spec.ts:39 and diagram-fullscreen-scrollbar.spec.ts:28 passed one focused56-case run. Pages1084tests100%coverage; no model/core/pin change. Currentbaseline/actualhosts, finalquality, cleanfullgate and requiredpre/postCI still pending. Root-authored acceptance matrix: /Users/jonathanturnock/.codex/ods-delivery/milestone-03/pr106-rebase/next-acceptance-matrix.md. No Astra/CI/publication/closure yet.

- **lead** (2026-10-03T04:30:05.499230+00:00): Accepted 168 candidate host cases and 336 individual identity checks; baseline identity checks are 84/84 independent of failing geometry. Standard invocation7 failed four boot/navigation assertions in one launch, baseline16 and diagnosticcandidate9 passed. Cause unproven; retain failures and authorize one CI-isolated fresh-profile standard run via existing environment, no tracked tooling correction. Geometry/keyboard proof retained; whole quality and gates withheld. Source packages/pages/src/lib/organisms/InteractiveDiagram.svelte:161 unchanged. External evidence pr106-host-probe/report.md and lead-next-disposition.json.

- **lead** (2026-10-03T04:35:19.454805+00:00): Unchanged source standard invocation11 passed16 with4 allowed optionalcapture skips, combined checker0 using prior same-source keyboard24; fresh empty short profile via existing CI environment. No assertion/source change, no diagnostic flags. Inv7 remains recorded and unexplained; this is acceptance under isolated conditions, not a repaired fault-rate claim. Root accepts fullhost evidence and authorizes one whole8principle quality sweep, then clean landing gate/necessary CI. Evidence pr106-standard-isolated/lead-acceptance.json; production packages/pages/src/lib/organisms/InteractiveDiagram.svelte:161 unchanged.

- **lead** (2026-10-03T04:46:01.610709+00:00): Accepted complete independent eight-principle Sonnet5.5 sweep under Opus5.5; no introduced>.5, highest.4. Low-severity suggestions retained; no scope expansion. Correct NAMING reference packages/pages/src/lib/flow/fit.svelte.ts:91, source unchanged. Hosts/baseline prove child diagram outcomes; finalclean gate and requiredpre/postCI remain. Quality evidence /Users/jonathanturnock/.codex/ods-delivery/milestone-03/pr106-whole-quality/lead-acceptance.json.

- **lead** (2026-10-03T05:28:39.898302+00:00): Initial39e2f334 unmodifiedgate0 (pages1084/browser485+20documentedskips); necessaryCI37098194910 unit/nativehostpassed butbrowser484+1 failedbeforeanydrag at packages/pages/e2e/diagrams-sketch.spec.ts:297. Test-only27e83b8f establishes camera room throughrealpan before grabbing sameid, retaining all geometricassertions. Thirtyfocusedchecks plus3controlled67pxroom cases passed; actual93px repairpan, sameidentity/growth/PIXEL1release/no-reverse/containment proved. Full8productreview retained andsmalldelta inline8 accepted; newcleanfinalgate/necessaryCI remain. Evidence /Users/jonathanturnock/.codex/ods-delivery/milestone-03/pr106-ci-setup-badspace/lead-acceptance.json; no scope/new/reopenedissues.
