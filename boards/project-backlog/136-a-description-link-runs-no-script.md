---
column: done
labels: [pages, security]
priority: high
agent: developer
live: false
updatedAt: 2026-09-29T21:00:00.000Z
---
# A description link runs no script

Issue #49, a child of epic #60. A reader opening a model somebody else authored should find every link in a rendered description inert unless it uses a safe scheme. The description renderer put Markdown links through as written, so a `javascript:` or `data:` href reached the DOM in the VS Code webview, the hosted viewer and the static export alike. Only http, https, mailto and in-model refs (the hash routes the router follows) now render as links; anything else renders as its text, and an image outside the list renders as its alt text.

## Checklist

- [x] A link or image whose destination is not http, https, mailto or an in-model `#` ref renders as plain text: no `<a>`, no `<img>`, no `href` or `src`
- [x] The destination is judged the way a browser reads it: entities decoded, percent-decoding applied, controls and whitespace dropped, case ignored
- [x] Covered for inline links, links with titles, reference-style links, autolinks and images, with `javascript:`, `data:`, `vbscript:`, `file:` and the obfuscated forms
- [x] http, https, mailto and hash-route links, titles and Markdown inside link text still work; raw HTML is still shown as text
- [x] A Playwright case tries each unsafe scheme on the hosted viewer, the static export and the embedded bundle the webview loads, and follows an allowed in-model link
- [x] The real VS Code host is checked: `npm run test:vscode` opens a hostile fixture in a real VS Code 1.96.4 webview and asks it, through a test probe, which links and images it rendered

## Gates

- [x] `npx @biomejs/biome check` clean on every file touched
- [x] `bash scripts/verify-all.sh` green on 056d730 (lead, 2026-09-29): pages 891 at 100% coverage, pages e2e passed, every other suite green, schema comparison match; `npm run test:vscode` on the same commit, in real VS Code 1.96.4: petstore 9 passing (4 pending screenshots), hostile-links 1 passing

## Comments

- **developer** (2026-09-29T14:30:00.000Z): `packages/pages/src/lib/atoms/Markdown.svelte` was the only `{@html}` sink in the pages package. Comments (`Comments.svelte`) render their text as plain text, not Markdown, so the descriptions on `WorkspacePage`, `PageHeader` and `RelationshipDetail` are the whole surface.
- **developer** (2026-09-29T14:30:00.000Z): The rule lives in `packages/pages/src/lib/atoms/markdown.ts:42-65`: a positive allowlist (`isSafeUrl`) applied through a marked `link` and `image` renderer, which returns `false` (the default output) for a safe destination and the link's own text or the escaped alt text otherwise. `decode` (`markdown.ts:13-40`) decodes numeric and a few named entities, then percent-encoding, then drops controls, whitespace and line separators, so `java&#x09;script:` and `%6Aavascript:` are judged as what they spell. Anything it cannot read as an allowed scheme or a `#` ref is refused, so a missed entity fails closed.
- **developer** (2026-09-29T14:30:00.000Z): Decision: a bare `#fragment` and `#/route` count as in-model refs (the router treats `#` and `#/...` as routes, `router.svelte.ts:39-41`); a relative path such as `./x` or `//host/x` does not, because the issue allows only the four kinds and no reference model writes one. The reference models carry no links in descriptions at all, so nothing shipped changes.
- **developer** (2026-09-29T14:30:00.000Z): The renderer's existing `<` and `>` escaping stays, so `<javascript:...>` autolinks and raw `<a href>` were already text; they are pinned in `packages/pages/src/lib/atoms/Markdown.test.ts` (82 cases, 63 failing before the change).
- **developer** (2026-09-29T14:30:00.000Z): `packages/pages/e2e/link-schemes.spec.ts` opens one hostile description on the viewer (`?url=` import), on a static export built into a temp folder and opened from `file://`, and on the embedded bundle driven by host `postMessage` in a browser. The last is a browser run of the bundle the webview loads, not VS Code.
- **developer** (2026-09-29T14:30:00.000Z): The real VS Code host is not covered. `apps/ods-vscode` has a real-VS-Code harness (`.vscode-test.mjs`, `src/test/extension.test.ts`) but it observes the webview only through the messages it posts, not its DOM, and it opens the fixed petstore folder. A test there would need a product seam that reports link state, which this card does not add. The webview's own Content-Security-Policy (`apps/ods-vscode/src/pages/panel.ts:156`) permits only nonce-tagged scripts, so a `javascript:` href would not run there even before this change; that is defence in depth, not the fix, and it is not asserted.
- **developer** (2026-09-29T15:00:00.000Z): The owner chose the test seam, so the earlier "not covered" entry no longer holds. The seam is a `probe` host message and a `rendered` webview message (`packages/pages/src/protocol.ts`); the app answers with the `href` of every `.md a[href]` and the `src` of every `.md img` (`packages/pages/src/app/App.svelte`), and `DetailPanel.probe()` (`apps/ods-vscode/src/pages/panel.ts`) lets a test send it. Nothing in normal use sends it and it adds no product behaviour.
- **developer** (2026-09-29T15:00:00.000Z): `apps/ods-vscode/src/test/link-schemes.test.ts` opens `apps/ods-vscode/src/test/fixtures/hostile-links/.ods/hostile_links.json` (the e2e spec's hostile description in a small workspace, so no reference model or generated file moves) and asserts that the only hrefs are the four safe ones and that there are no images. `.vscode-test.mjs` is now two configurations, so this fixture has its own window and the petstore suite still sees only the petstore.
- **developer** (2026-09-29T15:00:00.000Z): Failed first. With `isSafeUrl` temporarily returning `true`, `test:vscode` failed the new case with the unsafe hrefs listed (`javascript:...`, `data:text/html,...`, `file:///etc/passwd`, `JaVaScRiPt:...`) among the actual values; restored, the petstore suite passes 9 and the new case passes 1. No gate was running (`ps` showed no `verify-all.sh`) when `test:vscode` was run.
- **lead** (2026-09-29T17:10:00.000Z): The first gate run, on 1ea0ce3, failed pages' 100% coverage threshold: the probe branch and the undecodable-percent path were not covered. 056d730 covers them with tests. Gate green on 056d730, and `test:vscode` green on the same commit. `test:vscode` is not part of the gate or CI, so it is recorded here as a separate check. The card stays in `doing` until the PR merges.
- **lead** (2026-09-29T21:00:00.000Z): Landed. PR #72 was merged into develop by the owner as c26ca28 after review, and post-merge CI run 36583350831 is green (test, e2e). Issue #49 closed; the card moves to `done`.
