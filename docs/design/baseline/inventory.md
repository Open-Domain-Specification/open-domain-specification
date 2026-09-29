# Baseline sweep inventory (issue #53, epic #61)

What a full design and accessibility sweep has to cover, so that the sweep
starts from a known floor. It continues card 83
(`boards/vsc-extension/83-designer-baseline-sweep.md`), whose first pass was
incomplete. This file is the inventory; the capture harness that walks it is
`packages/pages/e2e/baseline-capture.spec.ts`; the final evidence pass on the
integrated head is a later step and records its tested commit separately.

Sources: the router (`packages/pages/src/lib/router.svelte.ts`), the page
switch (`packages/pages/src/lib/Page.svelte`, `resolve.ts`), the templates under
`packages/pages/src/lib/templates`, the app shell (`src/app`), `assets/site.css`
and [design-language-v2](../design-language-v2.md).

Status words: **planned** means the harness or the final pass covers it;
**out of scope** carries its reason. Nothing is left blank.

## 1. Page families

`Page.svelte` renders one template inside `PageLayout` (content column, sticky
table of contents). `resolvePage` maps a ref to exactly one target, so there
are 17 route families backed by 16 template files plus the health route.
Refs are chosen on the richest reference model (northbank: 20 contexts, 38
relationships, evidence, strategic positions, a pinned set of diagnostics; refs
with `&`, `(`, `'` also exercise ref encoding). The harness `id` is the
capture's file name.

| # | Family (template) | Harness id | Model and route | What it exercises |
| --- | --- | --- | --- | --- |
| 1 | Workspace (`WorkspacePage`) | `workspace` | northbank `#` | Problem-space tables, the 20-context map diagram, context table, teams, embedded health summary, evidence |
| 2 | Health (`HealthPage`) | `health` | northbank `#/health` | Structure problems, refactor and tolerated evidence, no-comments disclosure |
| 3 | Team (`TeamPage`) | `team` | northbank `#/teams/customer_platform_team` | Team lockup and owned contexts |
| 4 | Domain (`DomainPage`) | `domain` | northbank `#/domains/customer` | Subdomain table, diagram |
| 5 | Subdomain (`SubdomainPage`) | `subdomain` | northbank `#/domains/banking_products/subdomains/ledger` | Classification, serving contexts, diagram |
| 6 | Bounded context (`ContextPage`) | `context` | northbank `#/boundedcontexts/customer_&_kyc` | Strategic position table (card 42), relationship modal, pattern hover, aggregates, services, value objects, policies, processes, schemas, glossary, four diagram kinds |
| 7 | Relationship (`RelationshipPage`) | `relationship` | northbank `#/relationships/customer_&_kyc~upstream-downstream~accounts` | Epic 62 relationship view, crossings table, generated description, agreement, evidence |
| 8 | Aggregate (`AggregatePage`) | `aggregate` | northbank `#/boundedcontexts/ledger/aggregates/journal_entry` | Relation diagram, consumable diagram, entities, invariants, attributes |
| 9 | Entity (`EntityPage`) | `entity` | northbank `#/boundedcontexts/customer_&_kyc/aggregates/customer/entities/identity_document` | Attributes table |
| 10 | Value object (`ValueObjectPage`) | `valueobject` | northbank `#/boundedcontexts/customer_&_kyc/valueobjects/address` | Attributes, holders |
| 11 | Invariant (`InvariantPage`) | `invariant-aggregate`, `invariant-valueobject`, `invariant-context` | northbank `.../aggregates/customer/invariants/adult_only`, `#/boundedcontexts/cards/valueobjects/pan/invariants/pan_luhn_valid`, `#/boundedcontexts/payments_hub/invariants/daily_limit` | Three owner kinds, `sectionsFor` varies per invariant |
| 12 | Consumable (`ConsumablePage`) | `consumable-aggregate`, `consumable-service` | northbank `.../customer/provides/customer_verified`, `.../services/onboarding_app/provides/start_onboarding` | Aggregate-provided event and service-provided command, schema and returns |
| 13 | Service (`ServicePage`) | `service` | northbank `#/boundedcontexts/customer_&_kyc/services/onboarding_app` | Provides and consumes tables, diagram |
| 14 | Data schema (`SchemaPage`) | `schema` | northbank `.../customer_&_kyc/schemas/customer_verified` | Attribute table |
| 15 | Policy (`PolicyPage`) | `policy` | northbank `#/boundedcontexts/accounts/policies/freeze_on_fraud_case` | Events and commands, diagram |
| 16 | Process (`ProcessPage`) | `process` | northbank `#/boundedcontexts/payments_hub/processes/instruction_lifecycle` | Start and end events, flow diagram |
| 17 | Glossary term (`TermPage`) | `term` | northbank `#/boundedcontexts/ledger/glossary/posting` | Term and context |

Cross-model additions, so one model's shape is not the whole floor:
`workspace-petstore` (petstore `#`), `context-petstore` (petstore
`#/boundedcontexts/sales_bc`), `workspace-rivermart` (rivermart `#`) and
`workspace-streamline` (streamline `#`) carry the other reference maps.
Clinic has no page of its own here; its `.ods` file is
`outpatient_clinic.json`, not `clinic.json`, and the harness does not load it
(out of scope: same renderer, smaller model than northbank).

`PageLayout` (`PageLayout.svelte`) is the shell of every page above, not a
family of its own.

## 2. Global surfaces

| Surface | Where it lives | Coverage |
| --- | --- | --- |
| Import screen | `src/app/ImportScreen.svelte`, viewer only. Three ways in: URL form or `?url=`, file upload, example cards. | Planned: harness states `import-empty` (desktop and phone), `import-error`, `import-loading`. Upload and example cards are interactions for the final pass. |
| Workspace picker | `src/app/WorkspacePicker.svelte`, export with more than one workspace | Planned: harness state `export-picker` |
| Sidebar tree | `organisms/Sidebar.svelte`, in `.site-nav` (260px column). Dropped when embedded in the webview (the native tree view is the navigation). | Planned: visible in every viewer and export page shot; keyboard use is an interaction (#46, #50) |
| Table of contents | `organisms/Toc.svelte`, `aside.toc`. Hidden under 900px. | Planned: visible in every wide shot; narrow shots prove its absence |
| Search or spotlight | None in the renderer. The extension has a native Quick Pick (`apps/ods-vscode/src/search.ts`). | Out of scope for the browser hosts: nothing to review. Real-host pass only, through the extension. |
| Health report | `HealthPage` (`#/health`) and the embedded summary on the workspace page | Planned: family 2 and family 1 |
| Modal | `atoms/Modal.svelte`, opened from the strategic table row | Planned: harness state `modal-relationship-evidence`, on northbank `#/boundedcontexts/branch_&_contact_centre` (the context whose relationship is marked for refactoring, so its strategic table has evidence toggles; Customer & KYC has none) |
| Hover card | `molecules/PatternHover.svelte` (`role=tooltip`) | Planned: harness state `hover-pattern` (opened by focus) |
| Diagram disclosure card | `organisms/DisclosureCard.svelte`, opened from a relationship badge on a map | Out of the harness (the badge has no stable accessible name); planned by hand in the final pass under #48 |
| Fullscreen diagram | `flow/DiagramOptionsPanel.svelte`, "Enter fullscreen" | Planned: harness state `diagram-fullscreen` (the manifest records a failure if headless Chromium refuses) |
| Keyboard focus ring | Global | Planned: harness state `keyboard-focus` (three Tabs from load) shows first stops; full traversal is the final pass under #46 and #47 |

## 3. Interactions, by epic #61 child

| Child | What is checked | Where | Status |
| --- | --- | --- | --- |
| #45 import loading and failure | Loading label and disabled form, 404 message, non-JSON file, focus and announcement of the error | Import screen | Shots planned in harness (`import-loading`, `import-error`); announcement and focus by hand or spec in the final pass. The not-JSON case is already an e2e test (`viewer-import.spec.ts`). |
| #46 page link and TOC navigation, focus | Where focus goes after a route change and after a TOC or in-page link; hash-only links; deep links | Every family; viewer and export | Planned, final pass (behavioural; a screenshot cannot show focus movement). `keyboard-focus` state gives the starting stops. |
| #50 current page and landmarks | `aria-current` on the tree item, `main`, `nav`, `aside` landmarks and their labels, heading order, one `h1` | Every family; axe covers landmark rules | Automated part planned: axe in the manifest per shot. Reading with a screen reader is the final pass. |
| #52 hover, focus and active states in the static theme | Links, tree rows, table rows, buttons with the static export's fallback tokens | Export (http and file), light and dark | Planned: `export-*` shots, `keyboard-focus`, `hover-pattern`. Pointer hover and active on tree and rows is the final pass. |
| #47 diagram node keyboard use | Nodes reachable and operable by keyboard, panels, fullscreen exit | Families with diagrams: 1, 4, 5, 6, 8, 13, 15, 16 | Planned, final pass (behavioural). Harness supplies the diagram shots and `diagram-fullscreen`. |
| #48 evidence disclosure | `aria-expanded` and `aria-controls` on toggles, modal focus trap and return, Escape, the disclosure card on a map | Families 1, 2, 6, 7 | Planned: `modal-relationship-evidence` shot; behaviour in the final pass. |
| #51 reduced motion | Nothing animates under `prefers-reduced-motion: reduce` (flash on anchor, diagram fit, hover fades) | Any family with a diagram; the anchor flash on any page | Planned, final pass, with Playwright `reducedMotion: "reduce"`. Observation: a search of `src` and `assets` found no `prefers-reduced-motion` rule at all. |
| #42 strategic table at 1300x900 with the tree | The table fits beside the tree without sideways page scroll, prose floor holds | Family 6 (and 7's crossings table) | Planned: `context` at `desktop-1300x900`, viewer and export, overflow recorded per shot. Existing assertions: `expectNoSidewaysScroll` and `expectProseRow` in `e2e/helpers.ts`. |

## 4. Matrix

### Hosts

| Host | How it is exercised | Status |
| --- | --- | --- |
| Viewer (hosted, the pages `app/` bundle that `apps/ods-ui` copies to `dist/`) | Playwright, harness serves `app/` under `/viewer/` and answers the `?url=` import from the reference model files. Bundle equals the deployable except that ods-ui adds example cards and favicon links. | Planned: harness `viewer` |
| Static export over http (`exportSite`, one folder per model) | Playwright, harness serves the folder as any static host does | Planned: harness `export-http` |
| Static export from `file://` | Playwright opening `index.html` from disk. The export promises to open from a folder, and `file://` is where classic-script and CORS behaviour differs. | Planned: harness `export-file` at desktop only, both themes |
| VS Code webview (embedded, no sidebar, `--vscode-*` tokens real) | Real host only: `npm run test:vscode` for behaviour, `npm run screenshots` (`ODS_SCREENSHOTS=1`) for pictures. Whether Playwright Electron drives it for the final pass is the lead's call. A browser cannot fake the host's tokens or the `vscode-*` body classes faithfully. | Planned for the final pass, not in this harness (lead decides the driver) |
| ods-ui deployable itself (`apps/ods-ui/dist`) | Same bundle as the viewer row | Out of scope for capture: one build step from `app/`, covered by the gate's build. Worth one smoke shot in the final pass. |
| Markdown (`packages/doc`) | Not a rendered page | Out of scope: no browser surface |

### Themes

What exists (from `assets/site.css`, `flow/theme.svelte.ts`, design doc section 2):

- Viewer and static export: light by default, dark under
  `prefers-color-scheme: dark`. No `data-theme` attribute and no toggle. No
  high-contrast or `forced-colors` rules.
- Diagram colour mode: `"system"` outside a webview, so it follows the same media
  query.
- VS Code webview: the host's own tokens, in light, dark, high contrast and high
  contrast light, with `vscode-*` body classes read only for the high-contrast
  hover outlines and the diagram colour mode.

| Theme | Hosts | Status |
| --- | --- | --- |
| Light (`prefers-color-scheme: light`) | viewer, export-http, export-file | Planned: harness |
| Dark (`prefers-color-scheme: dark`) | viewer, export-http, export-file | Planned: harness |
| VS Code light and dark | webview | Planned, final pass, real host |
| VS Code high contrast and high contrast light | webview | Planned, final pass, real host only (the tokens come from the host) |
| Browser forced colors (`forcedColors: "active"`) | viewer, export | Planned as an optional final-pass spot check; nothing in the CSS targets it, so it is a discovery, not a regression check |

### Viewports

| Viewport | Why | Status |
| --- | --- | --- |
| 1300x900, tree open | Card 42's measure: the strategic table beside the 260px tree and the 200px contents column. The widest layout. | Planned: all hosts |
| 800x900 | Under the 900px breakpoint in three places: `DataTable`'s narrow tier, `PageLayout` dropping the contents column and `site.css` stacking the tree over the page. | Planned: viewer, export-http |
| 390x844 (phone) | The viewer is a public site and `index.html` sets `width=device-width`, but no CSS rule targets anything narrower than 900px, so this shows what the one-column layout does with real content. | Planned: viewer, export-http |
| 1150x700 (editor tab) | The size the Modal spec reads a relationship at in an editor tab | Planned: viewer, export-http, `context` and `relationship` only |
| 1300x900 for `file://` | One size is enough to see what `file://` changes | Planned: export-file only |

### Cells

Pages are 26 refs (section 1) and states are the harness's
`import-*`, `export-picker`, `modal-relationship-evidence`, `hover-pattern`,
`diagram-fullscreen` and `keyboard-focus`.

| Host | Light | Dark | 1300x900 | 800x900 | 390x844 | 1150x700 |
| --- | --- | --- | --- | --- | --- | --- |
| Viewer | planned | planned | planned | planned | planned | planned (2 pages) |
| Export over http | planned | planned | planned | planned | planned | planned (2 pages) |
| Export from `file://` | planned | planned | planned | out of scope: one size shows the `file://` difference | out of scope: same | out of scope: same |
| VS Code webview | final pass (real host) | final pass (real host) | out of scope: the tab size is the user's | out of scope: same | out of scope: no phone editor | final pass, editor-tab size |

Import-screen states are viewer-only (the export has no import screen); the
picker state is export-only.

## 5. How to run the harness

```
cd packages/pages && npm run build
# throwaway config, no webServer or globalSetup, outside the repo:
#   export default { testDir: "<abs>/packages/pages/e2e",
#     testMatch: "baseline-capture.spec.ts", timeout: 900000, workers: 1,
#     reporter: [["list"]], projects: [{ name: "chromium" }] };
ODS_BASELINE=1 npx playwright test -c <config>
```

It listens on 4194 (`ODS_BASELINE_PORT`), writes
`docs/design/audit/<commit>/<host>/<viewport>/<theme>/<id>.png` (git-ignored)
and `docs/design/audit/<commit>/manifest.json` beside them (not ignored).
`ODS_BASELINE_AXE=0` skips the axe scan and `ODS_BASELINE_ONLY=<text>` keeps
only ids containing it. The manifest records the commit, whether the
`packages` and `apps` trees were dirty, and per shot the host, family, model,
ref, theme, viewport, status, horizontal overflow, console and network
problems, and axe violations. It asserts nothing; the lead decides what
becomes a finding. Browser evidence, static-export evidence and real-host
evidence are recorded in separate sections of the final pass, never merged.
