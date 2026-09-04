---
column: todo
labels: [bug, frontend]
priority: high
agent: dev-sonnet
updatedAt: 2026-09-05T21:30:00.000Z
---
# Reaching the end of the modal's scroll scrolls the page behind it

Scrolling to the bottom of the relationship modal hands the wheel to the page underneath, which scrolls behind the scrim. A modal is a mode: the page under it stays where it was until it closes.

There are two paths to close, not one:

- the modal body (`packages/pages/src/lib/atoms/Modal.svelte`, `.body { overflow: auto }`) chains its overscroll to the document once it hits either end;
- the scrim and the modal's own header are not scrollable at all, so a wheel over them goes straight to the document.

## Checklist

- [ ] `overscroll-behavior: contain` on the modal's scrolling body
- [ ] The document behind does not scroll while the modal is open, by whichever means you judge best (a scroll lock on the root while open and restored on close, or making the modal layer the scroller); if you lock the root, the page must not jump and must keep its scroll position when the modal closes
- [ ] Both hosts covered: the webview and static export scroll the document; the site shell also has its own scrolling nav column (`packages/pages/assets/site.css:62-70`)
- [ ] Unit test that the guard is applied while open and removed on close, including when the modal is closed by Escape, the close button and a scrim click
- [ ] e2e: open the modal on the petstore Sales page, record the page's scroll position, wheel past the end of the modal body and over the scrim, and assert the page has not moved; then close and assert the page is where it was
- [ ] Pages unit at 100%; the whole Playwright suite green

## Comments

- **lead** (2026-09-05T21:30:00.000Z): Assigned to dev-sonnet. Fixed by decision: do not change the modal's size or layout, and do not reintroduce a second scroller inside the body. Reported by the human against the shipped modal from card 43. Work in your worktree with absolute paths; build core, graphviz and pages and run `node scripts/codicons.mjs` before `build-storybook`; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
