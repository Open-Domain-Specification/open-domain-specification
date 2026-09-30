---
column: doing
labels: [pages, accessibility, bug]
priority: medium
agent: lead
live: true
clean-code-swept: true
updatedAt: 2026-09-30T18:37:00Z
---
# A relationship page says which agreement it is and reads in order

Epic #98, issues #74, #81, #84 and #85. A reader of a context relationship can tell which named agreement they opened, follow the page's headings in order, tell each role apart, and read a consumable's icon and name as one lockup. The shared renderer serves the VS Code webview, the static export and the hosted viewer; generated Markdown is the fourth surface. No metamodel or validator change.

## Checklist

- [x] #74: reproduce; core's `relationshipTitle` names a named agreement; the page heading, health report, strategic toggle, extension tree and search, and Markdown agree
- [x] #81: reproduce; the page's parts are `h2` under its `h1` at the same look; the modal and map card keep `h3`
- [x] #84: reproduce on NorthBank; each role is its own item on the page, modal and map card; the other role surfaces checked
- [x] #85: reproduce at 1300x900 with the tree; a link with an icon is a lockup that never breaks; narrower widths stay usable
- [x] Independent issue-level and integrated review
- [x] STATUS.md and sprint 03

## Gates

- [x] Focused: core, doc, pages unit; Playwright relationship, lockup and cross-surface specs; each new regression fails on the code before its fix
- [x] Real VS Code: `npm run test:vscode`, including the #74 page, tree and search check
- [x] Clean-code sweep
- [ ] `bash scripts/verify-all.sh` green on the final integrated head under Node 26.8.1, with no `NODE_OPTIONS`
- [ ] One PR to `develop` for epic #98; CI `test`, `e2e` and `real-vscode` green

## Comments

- **lead** (2026-09-30T18:02:00Z): Picked up on `codex/epic-98-relationship-pages` from `origin/develop` `fcfd6855`. Reproduced in the viewer on the reference models: RiverMart's two agreements between Vendor Purchasing (legacy) and Warehouse had identical headings (#74); the relationship page's outline read H1 then H3 (#81); NorthBank's Customer & KYC → Branch & Contact Centre roles read "…provided by an upstream context.PL Published Language" on the page and in the modal (#84); at 1300x900 beside the tree, NorthBank's Customer & KYC → Accounts crossings link measured 38px tall, two lines, icon above "CustomerVerified" (#85).
- **lead** (2026-09-30T18:11:58Z): #74 in `c061fb48` (then `538d6816` and `aadbfc06`, below). `relationshipTitle` adds a named agreement's name after a middle dot, as the context map's stereotype badge already writes `type · name`: "Vendor → Warehouse · purchase feed". An unnamed relationship reads as before. A `RelationshipTitle` molecule draws it with each context its own lockup on the relationship heading and in the health report; the strategic toggle's label names the agreement; the extension tree and search already read `relationshipTitle`. Markdown's health lists follow the title, the context-map table writes `type · name`, and a strategic comment title names the agreement. Evidence: the cross-surface fixture's two named agreements on the viewer and export (Playwright), in the real VS Code webview, tree and search (`npm run test:vscode`, 5 of 5 cross-surface tests), and in generated Markdown. No tracked generated file moved: only the clinic's docs are tracked and it names no agreement.
- **lead** (2026-09-30T18:12:10Z): #81 in `253e4de2`. `Heading` takes an optional `size`, so the detail's parts are `h2` on the page and `h3` in the modal and map card, at the level-3 scale in both. The Playwright check on the viewer and export runs axe's `heading-order`, checks the outline has no gap, and compares each part's computed size, weight, leading and space above with the same part in the modal; it fails with the parts left at `h3`.
- **lead** (2026-09-30T18:14:45Z): #84 in `445cc891`. Each role is an unbulleted list item: code, then name and summary. The first stays on its context's line so a one-role side costs no line; the full e2e run showed a list under the lockup pushed the petstore modal 24px past an editor tab. The strategic table's role cells show codes only, spaced apart; Markdown writes the codes comma-separated and one footnote per pattern (now pinned by a test); the context map's edge tooltip is one role a line. The Playwright check on the page and the modal fails on the old markup.
- **lead** (2026-09-30T18:17:00Z): #85 in `58984e10`. The cause is the table tier: under 900px a cell wraps between tokens and relies on each token's own `nowrap`; `Lockup` has it, but a `Ref` drawn with an icon did not. A `Ref` with an icon now holds icon and name in an inner `nowrap` span. A first attempt put `nowrap` on the link itself, and the full e2e run caught it: `Joined` draws its comma inside the next link, so a run of refs in the petstore's Policies table had nowhere to break and the page scrolled 320px sideways at 1300. The span inside the link keeps the comma wrappable. The Playwright check on the viewer and a NorthBank static export measures rendered line boxes at 1300x900 with the tree visible, then at 1100, 800 and 390 with no sideways page scroll; before the fix it counts two lines.
- **lead** (2026-09-30T18:20:00Z): Clean-code sweep: one DRY finding at 0.6, the "label · name" join written three times; core's `withAgreementName` now writes it once. No other finding above 0.5. Issue-level reviews (Sonnet, read-only) approved both halves. From the #74 review: the strategic position rows, pages and Markdown, now name the agreement beside the type, and `538d6816` tests the Markdown row and comment title. Left as they are: the crumbs (the `h1` names the agreement, which the issue allows) and `role="list"` on the roles list.
- **lead** (2026-09-30T18:28:00Z): The integrated review (Sonnet, read-only) approved with should-fixes, now done in `aadbfc06` and the docs commit. On RiverMart's Warehouse at 1600 beside the tree, the inline name widened the Type column and the frame scrolled 139px, against 18px without it. The name is now a wrapping block under the type, and the frame is back to 18px at 1600 and 88px at 1300, the same as `develop`. A new test holds the column to its keywords' width and card 42's scroll rule. It fails against the inline version, first on the name's text. The dot and the name are joined by a no-break space. `organism-relationship-detail.md` carries a dated amendment for all four changes. A long agreement name in a consumes table's icon link cannot wrap, which is the lockup rule, and the Warehouse API page has no sideways scroll at 800 or 390.
- **lead** (2026-09-30T18:31:00Z): On the code at `aadbfc06` the real VS Code suite passed (`npm run test:vscode`: 9, 1 and 5 passing, 4 pending, including the #74 check). `npm run test:vscode:keyboard` passed 23 of 23 on the same code before `aadbfc06`, which changes only the strategic row's name and the title's no-break space. The full pages e2e run, the pages unit suite and `svelte-check` passed on the code before the review fixes; the focused suites passed after them. The gate runs on the final head, and the PR records its result, so no commit follows the gated head.
- **lead** (2026-09-30T18:37:00Z): The gate on `d4e315d5` (Node 26.8.1, `NODE_OPTIONS` unset) failed in the pages unit stage. All 1004 tests passed, but branch coverage was 99.92% against the 100% threshold. Svelte 5 compiles `h{size}` in `Heading` and `{r.name}` in `RelationshipTitle` with a `?? ''` fallback that can never be taken. `0bd7f4b8` derives both strings in the script, so no dead branch is compiled, and adds a `RelationshipTitle` test and a `Heading` rerender test. Pages coverage is back to 100%, with 1006 tests. The relationship, lockup and cross-surface Playwright specs and `npm run test:vscode` (9, 1 and 5 passing, 4 pending) pass on that code. The gate reruns on the new final head, and the PR records it.
