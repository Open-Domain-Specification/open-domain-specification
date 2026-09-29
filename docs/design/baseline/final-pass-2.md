# Baseline capture on the final epic head (issue #53, epic #61)

A second run of the capture harness, after the owner's review brought fixes to #48 (Escape
layers) and #50 (`aria-current`). It supersedes [final-pass.md](final-pass.md) as the state to
review; the method, `file://` diagnosis and "not covered" list there still stand. It records
what was captured and carries no review verdict.

## Tested

| | |
| --- | --- |
| Commit | `290489491d7fcb27395bfa4054742dc4a71c8ee9` (`epic-61/accessible-navigation`) |
| Time | 2026-09-29, about 21:36 to 21:45 UTC (9.8 min, 20 Playwright tests, all passed); manifest `generatedAt` 2026-09-29T21:45:34Z |
| Browser | Playwright Chromium 151.0.7922.34, headless; axe on |
| Matrix | Same as before: viewer, export-http and export-file; light and dark; 1300x900 everywhere, 800x900 and 390x844 on viewer and export-http, 1150x700 on `context` and `relationship`; export-file at 1300x900 only. 370 shots, 0 failed |
| Manifest | `docs/design/audit/29048949/manifest.json` (`dirtyWorkingTree: true` is the throwaway config, deleted after the run) |

Not added: per-family shots with a real focus ring on a control inside `main`. The existing
`keyboard-focus` state presses Tab three times from load on the Customer & KYC page, and a
per-family version needs a harness change (a stable first control per template), which was not
cheap. It stays a behavioural check.

## Axe, 464614f6 to 29048949 (entries / nodes)

| Rule | 464614f6 | 29048949 |
| --- | --- | --- |
| landmark-unique | 0 / 0 | 0 / 0 |
| empty-table-header | 114 / 318 | 114 / 318 |
| color-contrast | 81 / 379 | 81 / 379 |
| link-in-text-block | 66 / 212 | 66 / 212 |
| heading-order | 18 / 18 | 18 / 18 |

No count moved and no new rule appeared. Examples and selectors are in
[final-pass.md](final-pass.md); the #48 and #50 fixes are behavioural and are not measured by
these rules.

## Overflow and console errors

- Sideways overflow: 36 shots, all at 390x844 (9 pages on viewer and export-http, both themes), identical to 464614f6: invariant-valueobject 152px, invariant-aggregate 104, workspace-petstore 96, team 92, context 59, process 52, policy 45, schema 6, consumable-service 3. None at 1300, 1150 or 800.
- Console and network errors: 50 entries, identical to before. 48 are the export-file pages (axe's stylesheet XHR under `file://`, see final-pass.md) and 2 are the expected `import-error` 404 on the viewer. export-http has none.

## Page-family checklist

Paths are relative to
`/Users/jonathanturnock/Projects/open-domain-specification/.claude/worktrees/agent-ac7d5e90fffb1a83b/docs/design/audit/29048949/`
(PNGs are git-ignored; regenerate with the recipe in inventory.md to view them elsewhere).
`{light,dark}` means both files exist. Widths: 1300 is 1300x900, 800 is 800x900, 390 is 390x844,
1150 is 1150x700. Export-file shots (1300x900, both themes) are under `export-file/desktop-1300x900/`
for the 24 page ids only (48 shots), not the states. Import states are viewer-only and the picker is
export-only, by design.

| Harness id | Family | Viewer | Export over http |
| --- | --- | --- | --- |
| `workspace` | Workspace | 1300: `viewer/desktop-1300x900/{light,dark}/workspace.png`<br>800: `viewer/narrow-800x900/{light,dark}/workspace.png`<br>390: `viewer/phone-390x844/{light,dark}/workspace.png` | 1300: `export-http/desktop-1300x900/{light,dark}/workspace.png`<br>800: `export-http/narrow-800x900/{light,dark}/workspace.png`<br>390: `export-http/phone-390x844/{light,dark}/workspace.png` |
| `health` | Health | 1300: `viewer/desktop-1300x900/{light,dark}/health.png`<br>800: `viewer/narrow-800x900/{light,dark}/health.png`<br>390: `viewer/phone-390x844/{light,dark}/health.png` | 1300: `export-http/desktop-1300x900/{light,dark}/health.png`<br>800: `export-http/narrow-800x900/{light,dark}/health.png`<br>390: `export-http/phone-390x844/{light,dark}/health.png` |
| `team` | Team | 1300: `viewer/desktop-1300x900/{light,dark}/team.png`<br>800: `viewer/narrow-800x900/{light,dark}/team.png`<br>390: `viewer/phone-390x844/{light,dark}/team.png` | 1300: `export-http/desktop-1300x900/{light,dark}/team.png`<br>800: `export-http/narrow-800x900/{light,dark}/team.png`<br>390: `export-http/phone-390x844/{light,dark}/team.png` |
| `domain` | Domain | 1300: `viewer/desktop-1300x900/{light,dark}/domain.png`<br>800: `viewer/narrow-800x900/{light,dark}/domain.png`<br>390: `viewer/phone-390x844/{light,dark}/domain.png` | 1300: `export-http/desktop-1300x900/{light,dark}/domain.png`<br>800: `export-http/narrow-800x900/{light,dark}/domain.png`<br>390: `export-http/phone-390x844/{light,dark}/domain.png` |
| `subdomain` | Subdomain | 1300: `viewer/desktop-1300x900/{light,dark}/subdomain.png`<br>800: `viewer/narrow-800x900/{light,dark}/subdomain.png`<br>390: `viewer/phone-390x844/{light,dark}/subdomain.png` | 1300: `export-http/desktop-1300x900/{light,dark}/subdomain.png`<br>800: `export-http/narrow-800x900/{light,dark}/subdomain.png`<br>390: `export-http/phone-390x844/{light,dark}/subdomain.png` |
| `context` | BoundedContext | 1300: `viewer/desktop-1300x900/{light,dark}/context.png`<br>800: `viewer/narrow-800x900/{light,dark}/context.png`<br>390: `viewer/phone-390x844/{light,dark}/context.png`<br>1150: `viewer/editor-tab-1150x700/{light,dark}/context.png` | 1300: `export-http/desktop-1300x900/{light,dark}/context.png`<br>800: `export-http/narrow-800x900/{light,dark}/context.png`<br>390: `export-http/phone-390x844/{light,dark}/context.png`<br>1150: `export-http/editor-tab-1150x700/{light,dark}/context.png` |
| `relationship` | ContextRelationship | 1300: `viewer/desktop-1300x900/{light,dark}/relationship.png`<br>800: `viewer/narrow-800x900/{light,dark}/relationship.png`<br>390: `viewer/phone-390x844/{light,dark}/relationship.png`<br>1150: `viewer/editor-tab-1150x700/{light,dark}/relationship.png` | 1300: `export-http/desktop-1300x900/{light,dark}/relationship.png`<br>800: `export-http/narrow-800x900/{light,dark}/relationship.png`<br>390: `export-http/phone-390x844/{light,dark}/relationship.png`<br>1150: `export-http/editor-tab-1150x700/{light,dark}/relationship.png` |
| `aggregate` | Aggregate | 1300: `viewer/desktop-1300x900/{light,dark}/aggregate.png`<br>800: `viewer/narrow-800x900/{light,dark}/aggregate.png`<br>390: `viewer/phone-390x844/{light,dark}/aggregate.png` | 1300: `export-http/desktop-1300x900/{light,dark}/aggregate.png`<br>800: `export-http/narrow-800x900/{light,dark}/aggregate.png`<br>390: `export-http/phone-390x844/{light,dark}/aggregate.png` |
| `entity` | Entity | 1300: `viewer/desktop-1300x900/{light,dark}/entity.png`<br>800: `viewer/narrow-800x900/{light,dark}/entity.png`<br>390: `viewer/phone-390x844/{light,dark}/entity.png` | 1300: `export-http/desktop-1300x900/{light,dark}/entity.png`<br>800: `export-http/narrow-800x900/{light,dark}/entity.png`<br>390: `export-http/phone-390x844/{light,dark}/entity.png` |
| `valueobject` | ValueObject | 1300: `viewer/desktop-1300x900/{light,dark}/valueobject.png`<br>800: `viewer/narrow-800x900/{light,dark}/valueobject.png`<br>390: `viewer/phone-390x844/{light,dark}/valueobject.png` | 1300: `export-http/desktop-1300x900/{light,dark}/valueobject.png`<br>800: `export-http/narrow-800x900/{light,dark}/valueobject.png`<br>390: `export-http/phone-390x844/{light,dark}/valueobject.png` |
| `invariant-aggregate` | Invariant | 1300: `viewer/desktop-1300x900/{light,dark}/invariant-aggregate.png`<br>800: `viewer/narrow-800x900/{light,dark}/invariant-aggregate.png`<br>390: `viewer/phone-390x844/{light,dark}/invariant-aggregate.png` | 1300: `export-http/desktop-1300x900/{light,dark}/invariant-aggregate.png`<br>800: `export-http/narrow-800x900/{light,dark}/invariant-aggregate.png`<br>390: `export-http/phone-390x844/{light,dark}/invariant-aggregate.png` |
| `invariant-valueobject` | Invariant | 1300: `viewer/desktop-1300x900/{light,dark}/invariant-valueobject.png`<br>800: `viewer/narrow-800x900/{light,dark}/invariant-valueobject.png`<br>390: `viewer/phone-390x844/{light,dark}/invariant-valueobject.png` | 1300: `export-http/desktop-1300x900/{light,dark}/invariant-valueobject.png`<br>800: `export-http/narrow-800x900/{light,dark}/invariant-valueobject.png`<br>390: `export-http/phone-390x844/{light,dark}/invariant-valueobject.png` |
| `invariant-context` | Invariant | 1300: `viewer/desktop-1300x900/{light,dark}/invariant-context.png`<br>800: `viewer/narrow-800x900/{light,dark}/invariant-context.png`<br>390: `viewer/phone-390x844/{light,dark}/invariant-context.png` | 1300: `export-http/desktop-1300x900/{light,dark}/invariant-context.png`<br>800: `export-http/narrow-800x900/{light,dark}/invariant-context.png`<br>390: `export-http/phone-390x844/{light,dark}/invariant-context.png` |
| `consumable-aggregate` | Consumable | 1300: `viewer/desktop-1300x900/{light,dark}/consumable-aggregate.png`<br>800: `viewer/narrow-800x900/{light,dark}/consumable-aggregate.png`<br>390: `viewer/phone-390x844/{light,dark}/consumable-aggregate.png` | 1300: `export-http/desktop-1300x900/{light,dark}/consumable-aggregate.png`<br>800: `export-http/narrow-800x900/{light,dark}/consumable-aggregate.png`<br>390: `export-http/phone-390x844/{light,dark}/consumable-aggregate.png` |
| `consumable-service` | Consumable | 1300: `viewer/desktop-1300x900/{light,dark}/consumable-service.png`<br>800: `viewer/narrow-800x900/{light,dark}/consumable-service.png`<br>390: `viewer/phone-390x844/{light,dark}/consumable-service.png` | 1300: `export-http/desktop-1300x900/{light,dark}/consumable-service.png`<br>800: `export-http/narrow-800x900/{light,dark}/consumable-service.png`<br>390: `export-http/phone-390x844/{light,dark}/consumable-service.png` |
| `service` | Service | 1300: `viewer/desktop-1300x900/{light,dark}/service.png`<br>800: `viewer/narrow-800x900/{light,dark}/service.png`<br>390: `viewer/phone-390x844/{light,dark}/service.png` | 1300: `export-http/desktop-1300x900/{light,dark}/service.png`<br>800: `export-http/narrow-800x900/{light,dark}/service.png`<br>390: `export-http/phone-390x844/{light,dark}/service.png` |
| `schema` | DataSchema | 1300: `viewer/desktop-1300x900/{light,dark}/schema.png`<br>800: `viewer/narrow-800x900/{light,dark}/schema.png`<br>390: `viewer/phone-390x844/{light,dark}/schema.png` | 1300: `export-http/desktop-1300x900/{light,dark}/schema.png`<br>800: `export-http/narrow-800x900/{light,dark}/schema.png`<br>390: `export-http/phone-390x844/{light,dark}/schema.png` |
| `policy` | Policy | 1300: `viewer/desktop-1300x900/{light,dark}/policy.png`<br>800: `viewer/narrow-800x900/{light,dark}/policy.png`<br>390: `viewer/phone-390x844/{light,dark}/policy.png` | 1300: `export-http/desktop-1300x900/{light,dark}/policy.png`<br>800: `export-http/narrow-800x900/{light,dark}/policy.png`<br>390: `export-http/phone-390x844/{light,dark}/policy.png` |
| `process` | Process | 1300: `viewer/desktop-1300x900/{light,dark}/process.png`<br>800: `viewer/narrow-800x900/{light,dark}/process.png`<br>390: `viewer/phone-390x844/{light,dark}/process.png` | 1300: `export-http/desktop-1300x900/{light,dark}/process.png`<br>800: `export-http/narrow-800x900/{light,dark}/process.png`<br>390: `export-http/phone-390x844/{light,dark}/process.png` |
| `term` | GlossaryTerm | 1300: `viewer/desktop-1300x900/{light,dark}/term.png`<br>800: `viewer/narrow-800x900/{light,dark}/term.png`<br>390: `viewer/phone-390x844/{light,dark}/term.png` | 1300: `export-http/desktop-1300x900/{light,dark}/term.png`<br>800: `export-http/narrow-800x900/{light,dark}/term.png`<br>390: `export-http/phone-390x844/{light,dark}/term.png` |
| `workspace-petstore` | Workspace | 1300: `viewer/desktop-1300x900/{light,dark}/workspace-petstore.png`<br>800: `viewer/narrow-800x900/{light,dark}/workspace-petstore.png`<br>390: `viewer/phone-390x844/{light,dark}/workspace-petstore.png` | 1300: `export-http/desktop-1300x900/{light,dark}/workspace-petstore.png`<br>800: `export-http/narrow-800x900/{light,dark}/workspace-petstore.png`<br>390: `export-http/phone-390x844/{light,dark}/workspace-petstore.png` |
| `context-petstore` | BoundedContext | 1300: `viewer/desktop-1300x900/{light,dark}/context-petstore.png`<br>800: `viewer/narrow-800x900/{light,dark}/context-petstore.png`<br>390: `viewer/phone-390x844/{light,dark}/context-petstore.png` | 1300: `export-http/desktop-1300x900/{light,dark}/context-petstore.png`<br>800: `export-http/narrow-800x900/{light,dark}/context-petstore.png`<br>390: `export-http/phone-390x844/{light,dark}/context-petstore.png` |
| `workspace-rivermart` | Workspace | 1300: `viewer/desktop-1300x900/{light,dark}/workspace-rivermart.png`<br>800: `viewer/narrow-800x900/{light,dark}/workspace-rivermart.png`<br>390: `viewer/phone-390x844/{light,dark}/workspace-rivermart.png` | 1300: `export-http/desktop-1300x900/{light,dark}/workspace-rivermart.png`<br>800: `export-http/narrow-800x900/{light,dark}/workspace-rivermart.png`<br>390: `export-http/phone-390x844/{light,dark}/workspace-rivermart.png` |
| `workspace-streamline` | Workspace | 1300: `viewer/desktop-1300x900/{light,dark}/workspace-streamline.png`<br>800: `viewer/narrow-800x900/{light,dark}/workspace-streamline.png`<br>390: `viewer/phone-390x844/{light,dark}/workspace-streamline.png` | 1300: `export-http/desktop-1300x900/{light,dark}/workspace-streamline.png`<br>800: `export-http/narrow-800x900/{light,dark}/workspace-streamline.png`<br>390: `export-http/phone-390x844/{light,dark}/workspace-streamline.png` |
| `import-empty` | Import screen | 1300: `viewer/desktop-1300x900/{light,dark}/import-empty.png`<br>390: `viewer/phone-390x844/{light,dark}/import-empty.png` | not captured |
| `import-error` | Import screen | 1300: `viewer/desktop-1300x900/{light,dark}/import-error.png` | not captured |
| `import-loading` | Import screen | 1300: `viewer/desktop-1300x900/{light,dark}/import-loading.png` | not captured |
| `export-picker` | Workspace picker | not captured | 1300: `export-http/desktop-1300x900/{light,dark}/export-picker.png` |
| `modal-relationship-evidence` | Modal (strategic table row) | 1300: `viewer/desktop-1300x900/{light,dark}/modal-relationship-evidence.png` | 1300: `export-http/desktop-1300x900/{light,dark}/modal-relationship-evidence.png` |
| `hover-pattern` | Hover (pattern keyword) | 1300: `viewer/desktop-1300x900/{light,dark}/hover-pattern.png` | 1300: `export-http/desktop-1300x900/{light,dark}/hover-pattern.png` |
| `diagram-fullscreen` | Fullscreen diagram | 1300: `viewer/desktop-1300x900/{light,dark}/diagram-fullscreen.png` | 1300: `export-http/desktop-1300x900/{light,dark}/diagram-fullscreen.png` |
| `keyboard-focus` | Keyboard focus (first Tab stops) | 1300: `viewer/desktop-1300x900/{light,dark}/keyboard-focus.png` | 1300: `export-http/desktop-1300x900/{light,dark}/keyboard-focus.png` |
