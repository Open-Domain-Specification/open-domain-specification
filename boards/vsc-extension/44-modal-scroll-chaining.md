---
column: review
labels: [bug, frontend]
priority: high
agent: dev-sonnet
clean-code-swept: true
updatedAt: 2026-09-05T22:00:00.000Z
---
# Reaching the end of the modal's scroll scrolls the page behind it

Scrolling to the bottom of the relationship modal hands the wheel to the page underneath, which scrolls behind the scrim. A modal is a mode: the page under it stays where it was until it closes.

There are two paths to close, not one:

- the modal body (`packages/pages/src/lib/atoms/Modal.svelte`, `.body { overflow: auto }`) chains its overscroll to the document once it hits either end;
- the scrim and the modal's own header are not scrollable at all, so a wheel over them goes straight to the document.

## Checklist

- [x] `overscroll-behavior: contain` on the modal's scrolling body
- [x] The document behind does not scroll while the modal is open, by whichever means you judge best (a scroll lock on the root while open and restored on close, or making the modal layer the scroller); if you lock the root, the page must not jump and must keep its scroll position when the modal closes
- [x] Both hosts covered: the webview and static export scroll the document; the site shell also has its own scrolling nav column (`packages/pages/assets/site.css:62-70`)
- [x] Unit test that the guard is applied while open and removed on close, including when the modal is closed by Escape, the close button and a scrim click
- [x] e2e: open the modal on the petstore Sales page, record the page's scroll position, wheel past the end of the modal body and over the scrim, and assert the page has not moved; then close and assert the page is where it was
- [x] Pages unit at 100%; the whole Playwright suite green

## Gates

- [x] qa-automated — after merging develop: pages 644 at 100%, full Playwright 253/253 including the new wheel-past-end case (lead, 2026-09-05T22:00:00Z)

- [x] clean-code-sweep — small diff (4 files, 99 lines), self-scanned inline per the proportionality gate; no violations found (dev-sonnet, 2026-09-04T00:00:00.000Z)

## Comments

- **lead** (2026-09-05T21:30:00.000Z): Assigned to dev-sonnet. Fixed by decision: do not change the modal's size or layout, and do not reintroduce a second scroller inside the body. Reported by the human against the shipped modal from card 43. Work in your worktree with absolute paths; build core, graphviz and pages and run `node scripts/codicons.mjs` before `build-storybook`; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
- **dev-sonnet** (2026-09-04T00:00:00.000Z): Claiming the card. Worktree was on a stale tag; reset to `develop` to pick up the card file.
- **dev-sonnet** (2026-09-04T00:10:00.000Z): Added `overscroll-behavior: contain` to `.body` in `packages/pages/src/lib/atoms/Modal.svelte:200-211` to cut the overscroll chain. Added a second `$effect` in `packages/pages/src/lib/atoms/Modal.svelte:66-85` that keys off `showing`: while a modal is open it adds `modal-open` to `document.documentElement` and sets `overflow: hidden`, restoring both on cleanup — which Svelte runs before every rerun and on unmount, so it fires uniformly whether the modal closes via Escape, the close button or a scrim click (the existing `onclose` path is shared by all three, and cleanup is keyed off the same `showing` prop change either way). Because `overflow` is only ever toggled, not scrollTop, the document never jumps and keeps its position across open/close.
- **dev-sonnet** (2026-09-04T00:15:00.000Z): Covered the site shell's own scroller: `packages/pages/assets/site.css:71-77` adds `html.modal-open .site > .site-nav { overflow: hidden }`, since the nav column is a second scroll region the root's overflow lock does not reach. The webview and static export have no such second scroller, so the root lock alone covers them.
- **dev-sonnet** (2026-09-04T00:25:00.000Z): Unit coverage in `packages/pages/src/lib/atoms/Modal.test.ts:117-146` — four cases: unlocked before open, and unlocked again via the close button, Escape and a scrim click, each checking both the `modal-open` class and `document.documentElement.style.overflow`. `npm run test -w @open-domain-specification/pages -- --run` — 94 files, 644 tests, all green, Modal.svelte at 100% statements/branches/functions/lines.
- **dev-sonnet** (2026-09-04T00:35:00.000Z): e2e in `packages/pages/e2e/relationship.spec.ts:126-157` — opens the modal on the petstore Sales page, records `window.scrollY`, wheels 5000px twice over `.body` and once over the scrim, asserts `scrollY` is unchanged, then closes and asserts it is still unchanged. First draft scrolled the page to a fixed offset before opening the modal, but `scrollIntoViewIfNeeded` on the toggle moved the page again before the click, so I capture "before" after the modal is already open instead. `npx playwright test` — 253 tests, all green, including the full `storybook.spec.ts` render sweep.
- **dev-sonnet** (2026-09-04T00:40:00.000Z): Clean-code self-scan (diff is 4 files / 99 lines, under the sub-agent threshold): the two `$effect`s in Modal.svelte are separate concerns (focus vs. scroll lock), no duplication, no dead code. No findings. Ready for review.
- **lead** (2026-09-05T22:00:00.000Z): Reviewed. Locking `<html>` keys off `showing`, so all three close paths are covered by construction rather than by three handlers, and the site shell's nav column is reached through the same class. Landing on develop.
