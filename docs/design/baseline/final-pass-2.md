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

## Page-family review

| | |
| --- | --- |
| Reviewer | Designer (lead designer), on behalf of issue #53 |
| Time | 2026-09-29 21:57 UTC (`date -u`) |
| Tested commit | `290489491d7fcb27395bfa4054742dc4a71c8ee9`; capture record in d7a2d289 |
| Method | Every PNG below opened with the Read tool at native size; six regions of the `context` shots were cropped with ffmpeg to read the 6067px-tall page at 1:1 (the crops are of the same files and are not counted). Judged against `docs/design/design-language-v2.md` and `docs/design/v2-specs/`. |

Shorthand in the "Files opened" column: `v` viewer, `eh` export-http, `ef` export-file; `L` light, `D` dark;
`1300` = desktop-1300x900, `800` = narrow-800x900, `390` = phone-390x844, `1150` = editor-tab-1150x700.

Classification: **Blocks** = contradicts an epic #61 acceptance criterion; **#n** = already raised;
**New-n** = a new separate defect, body below; **By design** = cites the design language;
**Polish** = noted, not raised.

### Families

| Family (harness id) | Files opened | Verdict | Findings and classification |
| --- | --- | --- | --- |
| Workspace (`workspace`) | v/L/1300, eh/D/1300, v/L/800 | Pass | Problem-space tables, context table, teams table and the Health section all read as dense 22px rows with sentence-case secondary headers, no pills, no cards; the one badge is the heading count; Problems-panel treatment on the three structure findings; both themes hold with identical layout. `big ball of mud` drops under the lockup in the Serves column as the Lockup spec says (by design). At 800 the tree stacks above the whole page (#82). The map's Legend/Options panels are open or closed by `localStorage` from the previous capture, so their state differs between models: capture-order leakage, not a defect. Inline map graph occupies roughly half the frame (New-3). |
| Workspace (`workspace-petstore`) | v/L/1300, eh/D/1300, v/D/390 | Pass | Same shape on a small model. 390: 96px sideways overflow (#82); the tree above the content pushes the page title below the fold (#82). |
| Workspace (`workspace-rivermart`) | v/L/1300, eh/D/1300, eh/L/800 | Pass | As `workspace`. No new finding. |
| Workspace (`workspace-streamline`) | v/L/1300, eh/D/1300, v/D/800 | Pass | As `workspace`. No new finding. |
| Health (`health`) | v/L/1300, eh/D/1300, v/L/800 | Pass | PageHeader with the plain title behind the pulse codicon, as ruled in section 11. Refactor as a grouped table with Comments under the row, `refactor` in the warning colour with the warning codicon, `No comments 36` as a disclosure with the count badge. Both themes hold. Title focus ring shows because the harness focuses the heading on arrival (by design: Heading spec). |
| Team (`team`) | v/L/1300, eh/D/1300, v/L/390 | Pass | Owns and Problem space as two tables, counts as badges, classification as a plain keyword (section 10.2, by design). 390: 92px overflow (#82). |
| Domain (`domain`) | v/L/1300, eh/D/1300, eh/D/800 | Pass | Subdomain table with lockups and keywords; current tree row `Customer` washed and alone. Inline map fills about 40% of the canvas height (New-3). |
| Subdomain (`subdomain`) | v/L/1300, eh/D/1300, v/L/800 | Pass with notes | Classification keyword under the title and a Classification definition row (by design: template-subdomain-page). The open Legend panel and the minimap sit over diagram nodes (`Sovereign Core (legacy)` and `Regulatory Reporting` are half hidden) (New-4). The ancestor row `Banking Products` and the page row `Ledger` carry the same wash, so a sighted reader tells them apart by depth only; this is what the Sidebar spec asks for (wash on the path, `aria-current` on one link) — by design, noted for the lead. |
| Bounded context (`context`) | v/L/1300, eh/D/1300, v/L/800, v/L/1150, v/D/1150, eh/L/1150, eh/D/1150 | Pass with notes | Strategic position table at 1300 beside the tree: five rows, prose column at its floor, nothing clipped, no page-level sideways scroll (matches the #42 outcome; the regression test is in `e2e/relationship.spec.ts`). At 1150 the Downstream column is beyond the table frame and the frame scrolls (by design: DataTable three widths). Provides table's `Consumed by` column clipped at the frame edge at 1300 (by design, same rule). `generated` keyword and secondary sentence as spec 1 of relationship-provenance (by design). Ubiquitous language table wraps every definition one or two words per line while `Embodied by` takes the free width: the prose column is not the grow column (New-1). Attribute tables break `date-time` at the hyphen and `'passport' | 'driving-licence'` across four lines with an empty Description column beside them (New-2). Empty `Policies` heading kept with its one-line empty state (by design, principle 9). `internal` keyword in the warning tone (by design: ConsumableKeywords comment). 800: tree above content (#82). |
| Bounded context (`context-petstore`) | v/L/1300, eh/D/1300, eh/L/390 | Pass | Strategic table with `tolerated` disposition (info codicon, secondary colour) reads correctly in both themes. 390: 59px overflow on the northbank sibling, the petstore page clips its tables at the frame (#82). |
| Relationship (`relationship`) | v/L/1300, eh/D/1300, v/L/800, v/L/1150, v/D/1150, eh/L/1150, eh/D/1150 | Pass with existing issues | Title lockup pair with the arrow, type as a keyword, roles as a definition list, Comments, Crossings table, Links, all empty states in one secondary sentence. Fits an 1150x700 tab without sideways scroll. Crossings row breaks the event icon from `CustomerVerified` (#85). Role code and role name run together (`PL Published Language — ...`) (#84). Heading order (#81). |
| Aggregate (`aggregate`) | v/L/1300, eh/D/1300, v/L/800 | Pass with notes | Structure as level-3 subsections with `aggregate root` keyword, attribute tables, relation lines; invariants as rows; Provides as subsections with definition lists; two diagrams between hairlines. `Consumed by  AccountServicing,ReportingApp` has no space after the comma (Polish: `Joined` list separator; not raised, one-line fix for the lead to schedule). Money's `ISO 4217 code` type wraps one token per line (New-2). |
| Entity (`entity`) | v/L/1300, eh/D/1300, eh/D/390 | Pass | Attributes, Outgoing/Incoming pair kept when one side is empty (by design, section 11). Type column breaks the union across four lines (New-2). Current row `Customer` under `Customer & KYC` both washed. 390: tables clipped at the frame (#82). |
| Value object (`valueobject`) | v/L/1300, eh/D/1300, eh/L/800 | Pass | Attributes, Used as a type by, four empty sections each with one secondary sentence; every heading anchored from the TOC. |
| Invariant, aggregate owner (`invariant-aggregate`) | v/L/1300, eh/D/1300, v/L/390 | Pass | `aggregate invariant` keyword under the title, Constrains table, Guarded by empty state. 390: 104px overflow comes from the long single-line empty sentence under Guarded by (#82). |
| Invariant, value owner (`invariant-valueobject`) | v/L/1300, eh/D/1300, eh/D/390 | Pass | `sectionsFor` varies: Guarded by lead reads as the value's rule. 390: 152px overflow, same cause as above (#82). A sliver of `list.activeSelection` wash shows at the bottom edge of the 900px tree viewport (the washed `Cards` row is just below the fold): the tree does not scroll its current row into view on load (New-5). |
| Invariant, context owner (`invariant-context`) | v/L/1300, eh/D/1300, v/L/800 | Pass | `Checked by` heading with the operation as a lockup row. |
| Consumable, event (`consumable-aggregate`) | v/L/1300, eh/D/1300, v/D/800 | Pass | Definition list header, Payload table, Raised by, Reacted to by, Part of, Consumed by, Comments, Language. Consumed-by row breaks the icon from `CustomerVerified` and `Note a verified customer` wraps to three lines in a narrow Made By column (same family as #85). |
| Consumable, operation (`consumable-service`) | v/L/1300, eh/D/1300, eh/L/390 | Pass | Seven sections, six empty, each kept with its sentence (principle 9). TOC says `Issued by` while the heading says `Issued by policies` (Polish: same string in `ConsumablePage.svelte` lines 19 and 250; not raised). |
| Service (`service`) | v/L/1300, eh/D/1300, v/L/800 | Pass with notes | Kind sentence and Context as definitions; Provides/Consumes tables. Consumable map graph sits in the middle third of a 600px canvas (New-3). TOC lists only `Integration` (by design: one h2). |
| Data schema (`schema`) | v/L/1300, eh/D/1300, v/L/390 | Pass | Attributes and Carried by tables. `date-time` breaks at the hyphen (New-2). 390: 6px overflow (#82). |
| Policy (`policy`) | v/L/1300, eh/D/1300, eh/D/800 | Pass | When/Then tables, flow map with legend. Legend open over the top-left of the graph without covering a node here. |
| Process (`process`) | v/L/1300, eh/D/1300, v/D/390 | Pass with notes | Four tables; the Description column of While it runs and Ends is cut at the frame edge at 1300 with no visible scrollbar or fade in a static shot (by design: DataTable frame scrolls; the cut is the documented behaviour). `internal` keyword in the warning tone (by design). 390: 52px overflow (#82). |
| Glossary term (`term`) | v/L/1300, eh/D/1300, eh/L/800 | Pass | Embodied by row, Same word elsewhere empty state. |

### States

| State (harness id) | Files opened | Verdict | Findings and classification |
| --- | --- | --- | --- |
| Import, empty (`import-empty`) | v/L/1300, v/D/1300, v/L/390 | Pass with notes | One column, two labelled ways in, secondary help line; dark theme tokens applied to the input and button. The file control is the browser's native `Choose File` button, unthemed in both themes (New-6). No example cards in this bundle (they are ods-ui's, by design per inventory). |
| Import, error (`import-error`) | v/L/1300, v/D/1300 | Pass with notes | Message is cause then next step, word for word as section 2 requires; the form is back to `Load`. The alert is red text alone with no error codicon, unlike the Problems-panel treatment used everywhere else (New-7). Contrast of the red on dark is #78's territory. |
| Import, loading (`import-loading`) | v/L/1300, v/D/1300 | Pass | Button reads `Loading…` and is disabled, status line `Loading the workspace…` under the form, both themes. |
| Workspace picker (`export-picker`) | eh/L/1300, eh/D/1300 | Pass | Logo, title, two workspace lockups with the file name as detail. Dense list, no cards. |
| Evidence modal (`modal-relationship-evidence`) | v/L/1300, v/D/1300, eh/L/1300, eh/D/1300 | Pass with existing issue | Centred panel on the widget surface with hairline under the title row and a close button, scrim at the constant wash, page behind it untouched with the row's chevron toggles visible. Body fits without scrolling. Roles text runs the two role codes together (#84). Identical on viewer and export, light and dark. |
| Pattern hover (`hover-pattern`) | v/L/1300, v/D/1300, eh/L/1300, eh/D/1300 | Pass | Opened by focus: the keyword carries the `focusBorder` ring, the card sits under the word with its left edge on the word's, heading, meaning, hairline, then the rule; editorHoverWidget tokens in both themes; identical on the export. |
| Fullscreen diagram (`diagram-fullscreen`) | v/L/1300, v/D/1300, eh/L/1300, eh/D/1300 | Existing issue | Panels and controls are in the corners as spec'd; the graph occupies the top-left 55% of the viewport and is not re-fitted (#86). |
| Keyboard focus (`keyboard-focus`) | v/L/1300, v/D/1300, eh/L/1300, eh/D/1300 | Pass | Third Tab from load lands on the `Onboarding & KYC` tree link with a 1px `focusBorder` ring visible in both themes and on the static export (the #52 outcome). No skip link visible at Tab 1 (#83). |
| Export from `file://` (spot check) | ef/L/1300 `context`, ef/D/1300 `workspace` | Pass | Pixel-identical to the export-http shots of the same pages. The console errors are axe's stylesheet XHR (recorded above). |

### Blocking findings

None. Each acceptance criterion was checked against what a screenshot can show:

- Keyboard reader imports, moves, activates a node, inspects and dismisses evidence: focus ring visible on the tree (`keyboard-focus`), on the pattern keyword (`hover-pattern`), the modal's close button and trap are in place (`modal-relationship-evidence`). Movement and dismissal are behavioural and covered by `e2e/*.spec.ts` and `apps/ods-vscode/e2e-keyboard/journeys.spec.ts`, not by this pass.
- Loading, errors, current location and controls named: `import-loading` and `import-error` show the status and alert text; the tree marks the page row; every section is a named heading.
- Focus, hover and active in the static theme: export-http shots match the viewer for the ring and the selection wash; pointer hover is not capturable here.
- Strategic table at 1300 with one documented overflow behaviour: `context` at 1300 shows the table fitting; the behaviour is documented in the DataTable row of design-language-v2 section 7 and tested in `e2e/relationship.spec.ts`.
- Browser evidence records commit, family, viewport, theme, host: `manifest.json` and the checklist above.

### Screenshots opened: 107

Workspace family (12): `viewer/desktop-1300x900/light/{workspace,workspace-petstore,workspace-rivermart,workspace-streamline}.png`, `export-http/desktop-1300x900/dark/{workspace,workspace-petstore,workspace-rivermart,workspace-streamline}.png`, `viewer/narrow-800x900/light/workspace.png`, `viewer/phone-390x844/dark/workspace-petstore.png`, `export-http/narrow-800x900/light/workspace-rivermart.png`, `viewer/narrow-800x900/dark/workspace-streamline.png`.
Health, Team (6): `viewer/desktop-1300x900/light/{health,team}.png`, `export-http/desktop-1300x900/dark/{health,team}.png`, `viewer/narrow-800x900/light/health.png`, `viewer/phone-390x844/light/team.png`.
Domain, Subdomain (6): `viewer/desktop-1300x900/light/{domain,subdomain}.png`, `export-http/desktop-1300x900/dark/{domain,subdomain}.png`, `export-http/narrow-800x900/dark/domain.png`, `viewer/narrow-800x900/light/subdomain.png`.
Bounded context (10): `viewer/desktop-1300x900/light/{context,context-petstore}.png`, `export-http/desktop-1300x900/dark/{context,context-petstore}.png`, `viewer/narrow-800x900/light/context.png`, `export-http/phone-390x844/light/context-petstore.png`, `{viewer,export-http}/editor-tab-1150x700/{light,dark}/context.png`.
Relationship (7): `viewer/desktop-1300x900/light/relationship.png`, `export-http/desktop-1300x900/dark/relationship.png`, `viewer/narrow-800x900/light/relationship.png`, `{viewer,export-http}/editor-tab-1150x700/{light,dark}/relationship.png`.
Aggregate, Entity, Value object (9): `viewer/desktop-1300x900/light/{aggregate,entity,valueobject}.png`, `export-http/desktop-1300x900/dark/{aggregate,entity,valueobject}.png`, `viewer/narrow-800x900/light/aggregate.png`, `export-http/phone-390x844/dark/entity.png`, `export-http/narrow-800x900/light/valueobject.png`.
Invariant, Consumable (15): `viewer/desktop-1300x900/light/{invariant-aggregate,invariant-valueobject,invariant-context,consumable-aggregate,consumable-service}.png`, `export-http/desktop-1300x900/dark/{same five}.png`, `viewer/phone-390x844/light/invariant-aggregate.png`, `export-http/phone-390x844/dark/invariant-valueobject.png`, `viewer/narrow-800x900/light/invariant-context.png`, `viewer/narrow-800x900/dark/consumable-aggregate.png`, `export-http/phone-390x844/light/consumable-service.png`.
Service, Schema, Policy, Process, Term (15): `viewer/desktop-1300x900/light/{service,schema,policy,process,term}.png`, `export-http/desktop-1300x900/dark/{same five}.png`, `viewer/narrow-800x900/light/service.png`, `viewer/phone-390x844/light/schema.png`, `export-http/narrow-800x900/dark/policy.png`, `viewer/phone-390x844/dark/process.png`, `export-http/narrow-800x900/light/term.png`.
States (25): `viewer/desktop-1300x900/{light,dark}/{import-empty,import-error,import-loading}.png`, `viewer/phone-390x844/light/import-empty.png`, `export-http/desktop-1300x900/{light,dark}/export-picker.png`, `{viewer,export-http}/desktop-1300x900/{light,dark}/{modal-relationship-evidence,hover-pattern,diagram-fullscreen,keyboard-focus}.png`.
Export from `file://` (2): `export-file/desktop-1300x900/light/context.png`, `export-file/desktop-1300x900/dark/workspace.png`.

### New defects, ready to paste

**New-1. The context page's Ubiquitous language table wraps each definition a word or two per line**

As a reader of a bounded context page, I want the glossary definitions to read as sentences, so that I can scan the language table the way I scan every other table.

Today: on `#/boundedcontexts/customer_&_kyc` at 1300x900 (and on the petstore `sales_bc` page), the Definition column is about 70px wide and "A verified person. Branches say member; payments say party" takes eight lines, while the last column, Embodied by, holds one short lockup and all the free width. Both themes, viewer, export-http and export-file.

Expected: the Definition column is the table's one prose column (DataTable `grow`), at least 24ch, and Embodied by is a token column; one definition reads on one to two lines at 1300.

**New-2. Attribute tables break a type token across lines while the Description column stands empty**

As a developer reading an entity, value object, schema or aggregate page, I want a type to stay on one line, so that `date-time` and a string union read as one token.

Today: at 1300x900 the Type column of every attribute table is sized to its shortest value, so `date-time` breaks as `date-` / `time` (schema, consumable-aggregate, context Schemas), `ISO 4217 code` and `'debit' | 'credit'` take three lines (aggregate), `'passport' | 'driving-licence'` takes four (entity), while the Description column to the right is empty and wide. Both themes, all three hosts.

Expected: a type is one token in the editor font and never breaks inside itself (principle 6, Lockup and Keyword rules); the Description column, as the prose column, gives up width first, and a union breaks only between its alternatives.

**New-3. An inline diagram fits its graph to about half of the frame**

As an architect scanning a context, service, domain or workspace map, I want the graph to fill the canvas it is given, so that node labels are legible without zooming.

Today: on `service` (OnboardingApp) the canvas is about 600px tall and the graph occupies a band of about 220px in its middle; on `context` the consumable map and flow map show the same, on `domain` the graph fills about 40% of the height and on `workspace` about half the width. Labels inside nodes are unreadable at 1300x900 in both themes. Fullscreen has its own issue (#86); this is the inline fit.

Expected: the fit uses the canvas minus the open panels' footprint, so the graph's longer side reaches the frame with the 8px inset the panel spec names, in both themes and on every host.

**New-4. The open legend and the minimap cover diagram nodes**

As a reader of a subdomain page, I want every node of the context map visible, so that I do not miss a context because a panel sits on it.

Today: on `#/domains/banking_products/subdomains/ledger` at 1300x900 with the legend open, the legend panel covers the left half of `Sovereign Core (legacy)` and the minimap covers `Regulatory Reporting`; the graph was fitted to the whole frame, not the frame minus the panels. Both themes, viewer and export.

Expected: fitting leaves the panel and minimap footprints clear, or a panel opening re-fits; a node is never under a panel after a fit.

**New-5. The tree does not scroll its current row into view on load**

As a reader arriving on a deep link, I want the tree's current row on screen, so that I can see where I am without scrolling the tree.

Today: on `#/boundedcontexts/cards/valueobjects/pan/invariants/pan_luhn_valid` at 1300x900 the washed `Cards` row is just below the tree's 900px viewport; only a 2px sliver of `list.activeSelectionBackground` shows at the bottom edge. Any page whose row is below the fold behaves the same (teams, later contexts). Both themes, viewer and export.

Expected: on load and after a route change, the row carrying `aria-current="page"` is scrolled into the tree's viewport (`scrollIntoView({ block: "nearest" })`), respecting reduced motion.

**New-6. The import screen's file control is the browser's native button**

As a reader of the viewer, I want the file picker to look like the URL field and the Load button beside it, so that the import screen reads as one themed surface.

Today: `From a file` renders the platform's default `<input type="file">`: a grey `Choose File` button with `No file chosen` in the system font, unthemed in light and dark at 1300 and 390.

Expected: a themed button (`button.background`, `button.foreground`, editor font) labelled `Choose a file…`, with the chosen file name in the secondary colour beside it, and the native input visually hidden but still the focus target.

**New-7. The import failure is red text with no error icon**

As a reader of the viewer, I want an import failure to carry the Problems panel's error icon, so that it reads as an error before I read the words and not by colour alone.

Today: the `role="alert"` message under the form is set entirely in `editorError.foreground`, including the URL, with no codicon (`import-error`, both themes).

Expected: the `error` codicon in the error colour in a gutter, then the message in the foreground colour with the URL as plain text, matching `Problems.svelte`'s row treatment.

### Not covered by this pass

- Screen readers: what is announced on load, on route change, on the alert and the status region, and the names of landmarks. Behavioural; the browser suites assert the ARIA, not a reader.
- VS Code high contrast and high contrast light: the tokens come from the host and cannot be faked in the browser harness.
- Browser `forced-colors`: nothing in the CSS targets it; no shot was taken.
- The real webview's appearance: not captured. Its behaviour (Escape layers, focus movement, current row) is covered by `apps/ods-vscode/e2e-keyboard/journeys.spec.ts`.
- Pointer hover and active states on tree rows, table rows and buttons: a static shot cannot hold a pointer; `keyboard-focus` and `hover-pattern` show the focus-driven equivalents.
- Reduced motion: no shot can show it; it is the #51 Playwright check.

### Issues raised (lead, 2026-09-29T22:00:28Z)

New-1 to New-7 are raised as #87, #88, #89, #90, #91, #92 and #93, in that order. The two polish items are #94. None blocks epic #61. The shared wash on the current row and its ancestors stays as the Sidebar spec draws it; only the current row carries `aria-current` (#50).
