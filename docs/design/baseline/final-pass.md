# Final baseline capture (issue #53, epic #61)

Browser and static-export evidence only, from `packages/pages/e2e/baseline-capture.spec.ts`
run over the matrix in [inventory.md](inventory.md). The "before" run is
`docs/design/audit/6469b16/manifest.json` (pre-fix); the "after" run is
`docs/design/audit/464614f6/manifest.json`. PNGs are git-ignored, so every screenshot path
below is relative to `docs/design/audit/464614f6/` in the worktree that ran the capture and
must be regenerated to be viewed elsewhere.

## Tested commit

| | |
| --- | --- |
| Commit | `464614f643b82b9c6c2e9b92d3850f8239bb95fe` (`epic-61/accessible-navigation`) |
| Capture | Tue 2026-09-29, about 17:38 to 17:49 UTC (11.0 min, 20 Playwright tests, all passed); manifest `generatedAt` 2026-09-29T17:49:43Z |
| Browser | Playwright Chromium 151.0.7922.34, headless, axe-core via `@axe-core/playwright` |
| Hosts | viewer (built `app/` served under `/viewer/`, `?url=` import answered from the reference models), export-http (`exportSite` folder over http), export-file (same folder opened from `file://`) |
| Themes | light and dark (`prefers-color-scheme`) |
| Viewports | 1300x900 (all hosts), 800x900 and 390x844 (viewer, export-http), 1150x700 (viewer, export-http, `context` and `relationship` only) |
| Shots | 370 (viewer 164, export-http 158, export-file 48), 0 failed |

The manifest says `dirtyWorkingTree: true`. The only untracked file was the throwaway
Playwright config in `packages/pages` (deleted afterwards); no tracked file differed from the
commit.

Not run, with reasons:

- Export-file at 800x900, 390x844 and 1150x700: out of scope in the inventory (one size shows the `file://` difference).
- Clinic model: no page of its own in the inventory.
- Diagram disclosure card (from a relationship badge): no stable accessible name for the harness; needs a hand pass.
- Behavioural checks (focus after route change, TOC and in-page links, diagram node keyboard use, modal focus trap and return, reduced motion, upload and example cards): screenshots cannot show them; not exercised by this harness.
- Forced colors: optional in the inventory, not run.

## Before vs after, per axe rule

Entries are shots with at least one violation of the rule; nodes are summed over those shots.

| Rule | 6469b16 entries / nodes | 464614f6 entries / nodes |
| --- | --- | --- |
| landmark-unique | 300 / 300 | 0 / 0 (fixed) |
| empty-table-header | 114 / 318 | 114 / 318 |
| color-contrast | 81 / 379 | 81 / 379 |
| link-in-text-block | 66 / 212 | 66 / 212 |
| heading-order | 18 / 18 | 18 / 18 |
| any new rule | none | none |

Only landmark-unique moved. The other four are identical to the node, so nothing in the
integrated head touched them; they are still open. Axe on the `file://` export cannot read the
cross-origin stylesheet (see below), so export-file counts are lower for color-contrast and
link-in-text-block (workspace: 7 contrast nodes-entries vs 21 on the other hosts). Compare
those rules on viewer and export-http only.

Examples were re-run with axe on the export over http at 1300x900 to get selectors (the
manifest stores only rule and node count).

### empty-table-header (114 entries: 6 page families on viewer and export-http, all viewports and themes; 2 on export-file)

Families: BoundedContext (also petstore context), Aggregate, Entity, ValueObject, Consumable,
DataSchema, plus the modal, hover and keyboard-focus states (which sit on the context page).
Cause is one component: the attributes table's leading 16px icon column has an empty `<th>`.
- Ref `#/boundedcontexts/customer_&_kyc/valueobjects/address`, export-http, light, 1300x900: `#attributes > .frame > table > thead > tr > th:nth-child(1)`, `<th scope="col" class="svelte-174vpdg" style="width: 16px;">`.

### color-contrast (81 entries)

Families: Workspace (21 entries per hosting), Health, Domain, Aggregate, Process, BoundedContext (petstore), modal and fullscreen-diagram states. Mostly the amber `warn` keyword and disposition badge in light, and the "big ball of mud" text in dark.
- Ref `#`, export-http, light, 1300x900: `td:nth-child(3) > .joined > .context:nth-child(2) > .warn.keyword`, "big ball of mud" span, 3.11:1 (`#bf8803` on `#ffffff`, 13px), needs 4.5:1.
- Ref `#`, export-http, dark, 1300x900: `.mud > .head > strong` ("Sovereign Core (legacy)"), 3.59:1 (`#cccccc` on `#696563`, 12px bold).
- Ref `#/domains/customer`, light: `.refactor > .port-label[aria-haspopup="dialog"]`, 2.93:1 (`#bf8803` on `#f8f8f8`, 9px).
- Ref `#/boundedcontexts/ledger/aggregates/journal_entry`, light: `internal` keyword `.warn`, 3.11:1. Same on Process (6 nodes, `internal` on provides rows) and Health (`.disposition.refactor`, 3.11:1).

### link-in-text-block (66 entries)

Families: Workspace, Health, and the modal and fullscreen-diagram states. Links inside
sentences are distinguished from body text by colour alone at 1.77:1 (light) and 1.54:1 (dark).
- Ref `#`, export-http, light, 1300x900: `#solution > .problems > div > span > .ref`, `<a class="ref" href="#/boundedcontexts/identity_&_access">go to ...`, link `#005fb8` vs text `#3b3b3b`, 1.77:1 (min 3:1).
- Same node dark: `#4daafc` vs `#cccccc`, 1.54:1.
- Ref `#/health`, light: `a[title="code"]` (external link in a sentence), 1.77:1.

### heading-order (18 entries)

One family: ContextRelationship, all three hosts (8 on viewer, 8 on export-http, 2 on export-file).
- Ref `#/relationships/customer_&_kyc~upstream-downstream~accounts`, any host, any theme: `#roles > h3`, `<h3 class="heading h3" tabindex="-1">Roles`, "Heading order invalid" (an h3 follows the page h1 with no h2 between).

## Overflow (page scrolls sideways)

| Viewport | 6469b16 | 464614f6 |
| --- | --- | --- |
| 1300x900 | 0 | 0 |
| 1150x700 | 0 | 0 |
| 800x900 | 0 | 0 |
| 390x844 | 36 shots | 36 shots |

Unchanged. The 36 are 9 pages, each on viewer and export-http, light and dark, with the
overflow in px past the viewport: invariant-valueobject 152, invariant-aggregate 104,
workspace-petstore 96, team 92, context 59, process 52, policy 45, schema 6, consumable-service 3.
Nothing else overflows, so card 42's 1300x900 measure holds on both hosts. Observation: on
`context` at 1300x900 the Provides table's last column ("Consumers") is clipped inside its frame
(an internal scroll, not page overflow), visible in
`export-http/desktop-1300x900/light/context.png`.

## Console and network errors

| | 6469b16 | 464614f6 |
| --- | --- | --- |
| Entries with errors | 50 | 50 |
| export-file | 48 of 48 | 48 of 48 |
| viewer | 2 | 2 |
| export-http | 0 | 0 |

The 2 viewer entries are the `import-error` state (light and dark) requesting the deliberately
missing `https://workspaces.test/missing.json`: a 404 and "Failed to load resource", expected.

### The `file://` message

Every export-file page logs, in this order: `Access to XMLHttpRequest at 'file:///.../assets/index-<hash>.css' from origin 'null' has been blocked by CORS policy`, a console warning `Couldn't load preload assets: ProgressEvent`, and `Failed to load resource: net::ERR_FAILED` for the same `.css`, plus a `requestfailed` for it.

- Asset: the export's single stylesheet, `assets/index-D6m98CCs.css` (the same file `index.html` links with `<link rel="stylesheet">`).
- Code path: axe-core, not the app. A probe (throwaway script) loaded the export from `file://` with an `XMLHttpRequest.open` hook and a console listener: nothing was logged after load, no XHR, no error, and `document.styleSheets` showed the stylesheet present but `cssRules` unreadable. The XHR, the warning ("Couldn't load preload assets", axe's message) and the ERR_FAILED all appeared only when `AxeBuilder.analyze()` ran. Axe re-fetches cross-origin stylesheets by XHR to evaluate CSS, and `file://` refuses that.
- Rendering: unaffected. The `<link>` loads normally; `file://` screenshots are styled the same as export-http (viewed `context.png` light, side by side, identical layout; `health.png` is byte-identical in both themes; `workspace.png` and `context.png` differ in bytes, most likely diagram raster differences, not layout).
- Consequence: it is a harness artefact that appears in the manifest for export-file, and it makes axe's colour and link results on export-file partial. It says nothing about a user opening the folder. Not proven by this pass: what a real browser user's console shows on a plain open (the probe shows none).

## Screenshots to review

Paths are relative to `docs/design/audit/464614f6/` (absolute prefix in the report). Themes
are light unless the folder says dark.

Page families, one each:
1. `viewer/desktop-1300x900/light/workspace.png` (contrast, link-in-text-block)
2. `viewer/desktop-1300x900/dark/workspace.png` (dark contrast, link-in-text-block)
3. `viewer/desktop-1300x900/light/health.png`
4. `export-http/desktop-1300x900/light/team.png`
5. `export-http/desktop-1300x900/light/domain.png` (contrast)
6. `export-http/desktop-1300x900/light/subdomain.png`
7. `export-http/desktop-1300x900/light/context.png` (empty-table-header, clipped Provides table)
8. `viewer/desktop-1300x900/light/relationship.png` (heading-order)
9. `export-http/desktop-1300x900/light/aggregate.png` (contrast, empty-table-header)
10. `export-http/desktop-1300x900/light/entity.png` (empty-table-header)
11. `viewer/desktop-1300x900/light/valueobject.png`
12. `viewer/desktop-1300x900/light/invariant-aggregate.png`
13. `export-http/desktop-1300x900/light/consumable-aggregate.png`
14. `export-http/desktop-1300x900/light/service.png`
15. `export-http/desktop-1300x900/dark/schema.png`
16. `export-http/desktop-1300x900/light/policy.png`
17. `viewer/desktop-1300x900/light/process.png` (contrast)
18. `export-http/desktop-1300x900/dark/term.png`

Other models: `viewer/desktop-1300x900/light/workspace-petstore.png`, `viewer/desktop-1300x900/dark/workspace-rivermart.png`.

States:
19. `viewer/desktop-1300x900/light/keyboard-focus.png`
20. `export-http/desktop-1300x900/dark/keyboard-focus.png`
21. `viewer/desktop-1300x900/light/diagram-fullscreen.png` (contrast and link findings)
22. `viewer/desktop-1300x900/light/modal-relationship-evidence.png` (all three rules)
23. `export-http/desktop-1300x900/dark/hover-pattern.png`
24. `viewer/desktop-1300x900/light/import-empty.png`
25. `viewer/phone-390x844/light/import-empty.png`
26. `viewer/desktop-1300x900/dark/import-error.png`
27. `viewer/desktop-1300x900/light/import-loading.png`

Phone, tablet, host:
28. `viewer/phone-390x844/dark/invariant-valueobject.png` (worst overflow, 152px)
29. `export-http/phone-390x844/light/team.png` (overflow 92px)
30. `export-http/narrow-800x900/light/context.png`
31. `export-file/desktop-1300x900/dark/context.png` (file:// vs export-http comparison)

Each has a light or dark twin in the same folder layout; `export-picker` sits under `export-http`.

## Explicitly not covered

- Screen readers: none were run. Axe finds machine-checkable faults only.
- VS Code high-contrast and high-contrast-light themes, and VS Code light and dark with real host tokens.
- The real VS Code webview: covered by `apps/ods-vscode/e2e-keyboard/journeys.spec.ts` and `npm run test:vscode`, not by this harness.
- Behaviour listed under "Not run" above, and the ods-ui deployable smoke shot.
