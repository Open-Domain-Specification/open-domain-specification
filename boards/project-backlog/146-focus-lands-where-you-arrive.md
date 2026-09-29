---
column: doing
labels: [accessibility]
priority: medium
agent: developer
live: true
updatedAt: 2026-09-29T16:55:00.000Z
---
# Focus lands where you arrive

Issue #46, a child of epic #61. Following a page link, a sidebar entry or a table-of-contents entry changed what was drawn and left focus where it was, on an element that was often gone, so a keyboard or screen-reader reader was dropped at the top of the document with no sign that anything had happened. Navigation now moves focus to where the reader arrived: the new page's heading, or the section heading a contents entry names. The same bundle runs in the viewer, the static export and the VS Code webview, so the behaviour is in the renderer and not in a host.

## Checklist

- [x] A Playwright test that fails on the old renderer, with real keys and history: `Enter` on a link, `Tab`, `page.goBack()`, `page.goForward()`, asserting `document.activeElement` (`packages/pages/e2e/focus-on-navigation.spec.ts`, 8 of its 11 tests failing before the change; the other 3 are the guards that focus is not stolen)
- [x] Following a page link or a sidebar tree link focuses the destination page's `h1`
- [x] A table-of-contents entry focuses its section's heading, and the heading lands below the toolbar at its scroll margin
- [x] Headings carry `tabindex="-1"`, so they are targets and not tab stops; the next Tab is the next control after the heading, inside the page
- [x] Back and forward restore the page and focus its heading
- [x] The first render does not take focus, and neither does a host that opens a page (the extension's tree view)
- [x] Hosts: the viewer and the static export (opened from disk) under Playwright; the embedded bundle under a simulated VS Code API for the no-steal case
- [x] After an import the reader asked for (URL Load or Enter, file choice, example card), focus goes to the loaded workspace's `h1`, and Tab goes on into the page; a `?url=` deep link and the host's `model` message take no focus (`packages/pages/e2e/focus-after-import.spec.ts`; 3 of its 5 tests failed before the change, the 2 no-focus guards passed)
- [x] Pages stays at its 100% coverage threshold; `npm run check` reports 0 errors and 0 warnings

## Gates

- [x] biome check on the touched files
- [ ] `bash scripts/verify-all.sh`
- [ ] real VS Code host check (lead)

## Comments

- **developer** (2026-09-29T16:43:00.000Z): Mechanism. `packages/pages/src/lib/router.svelte.ts:16` adds `arrivals`, a count of reader-driven navigations: a followed route anchor (`:48`) and a hash change that finds a new ref, which is what back, forward and an edited hash are (`:28-35`). `go` (`:54-60`) is the host's entry point and now sets `ref` itself, so its own hash change is not counted. `packages/pages/src/app/App.svelte:95` hands the count to `Page`; `packages/pages/src/lib/Page.svelte:111-123` moves focus on each new count, once the new page has rendered. `packages/pages/src/lib/focus.ts:10` is the one place that focuses: it adds `tabindex="-1"` to anything not already focusable. `packages/pages/src/lib/atoms/Heading.svelte:31` gives every heading `tabindex="-1"` and `:52` a `focus-visible` ring in `focusBorder`, so a ring shows after a keyboard arrival and not after a click. `packages/pages/src/lib/organisms/Toc.svelte:15-23` focuses the section's heading with `preventScroll`, after the smooth scroll it already did.
- **developer** (2026-09-29T16:43:00.000Z): Decisions. (1) History navigation focuses the restored page's heading, the same as following a link. A browser does nothing for a single-page hash change, and the element that had focus is gone, so leaving focus alone drops it on the body; the heading is the one place that is always right. Scroll position is not restored on back, as before. (2) A ref that points inside a page (an attribute row, a consumption) focuses that element instead of the heading, since that is where the reader was sent; it is made a target with `tabindex="-1"` and scrolled by the existing `scrollIntoView`, so focus uses `preventScroll`. (3) A table-of-contents entry does not touch history or the hash, as before, so Back after it leaves the page rather than undoing the scroll. (4) `go`, which the host calls for the tree view and for the opening ref, never moves focus, because in the extension the reader's focus is in the tree. (5) A link to the page the reader is already on still moves focus to its heading.
- **developer** (2026-09-29T16:43:00.000Z): Where the next Tab goes, measured: after a page link, Tab from the heading reaches a control inside `main`, not the sidebar and not the top of the document; after a contents entry, Tab reaches the next control in or after that section. Both are asserted in the spec on both hosts.
- **developer** (2026-09-29T16:55:00.000Z): Focus after an import, accepted by the lead as arrival focus. `packages/pages/src/app/ImportScreen.svelte:91-99` takes an `asked` flag: Load, Enter in the field (both `fromUrl(true)`), a file choice and an example card pass true, and only then does it call the new `onopened` prop after the workspace was handed to `onload` and accepted. The `?url=` deep link on first load calls `fromUrl()` with the default false, so it never does. `packages/pages/src/app/App.svelte:44-48` `opened()` waits a tick for the page to render and focuses `main h1` with `focusArrival`. The webview's `model` message never passes through the import screen, so it cannot reach it. No separate success announcement: the heading names the workspace. The message-based distinction is by call path, not by inspecting the environment, so nothing else can trigger it by accident.
