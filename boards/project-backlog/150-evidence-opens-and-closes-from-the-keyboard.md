---
column: doing
labels: [pages, accessibility]
priority: medium
agent: developer
live: true
updatedAt: 2026-09-29T17:07:50.000Z
---
# Evidence opens and closes from the keyboard

Issue #48, a child of epic #61 (accessible navigation across the viewer, export and extension). The badges on a context map disclose a relationship's evidence. They were already `<button>`s that opened a card on click, and Escape already closed it, but nothing said that a badge held more, the card was not a dialog, focus stayed behind on the badge (so the next Tab went to whatever followed the badge in the page rather than into the card), and closing the card left focus nowhere. A badge now names what it shows, announces a dialog, reads as expanded and controlling the card while open; the card is a named dialog that takes focus on open; Escape and the card's Close button return focus to the badge that opened it. Hover, click and click-elsewhere are unchanged. The same bundle runs in the webview, the viewer and the static export; the real VS Code host is the lead's integration pass.

## Checklist

- [x] A Playwright test with real key presses that failed first: no `aria-haspopup`, no dialog role, focus never entered the card (viewer)
- [x] The badge is a button with `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` (while open) and a name that says it shows evidence
- [x] The card is a `role="dialog"` with a name and an id per diagram, and takes focus without scrolling the map
- [x] Enter and Space open it (native button keys), Escape closes it with focus back on the badge, so does the Close button
- [x] Verified on the viewer and the static export
- [x] Pointer: hover text unchanged, click opens, a click elsewhere closes without taking focus back
- [x] `npx vitest run --coverage` in packages/pages holds 100%, `npm run check` clean

## Gates

- [x] `npx @biomejs/biome check` on the touched files exits 0
- [ ] `bash scripts/verify-all.sh` green
- [ ] real VS Code host check (lead)

## Comments

- **developer** (2026-09-29T16:48:27.000Z): Failing first. `e2e/diagram-evidence-keyboard.spec.ts` on the unchanged bundle: 5 of 5 fail (`aria-haspopup` absent, `getByRole("dialog")` finds nothing after Enter or Space, and the same for the Close button and pointer tests, which claim a dialog). What already worked: the badge is a real `<button>` (`PortBadge.svelte`), Enter and Space click it natively, and `disclosure.svelte.ts` already closed on a window Escape. The gap was the semantics and the focus.
- **developer** (2026-09-29T16:48:27.000Z): Decision, the pattern. The Modal's focus convention without its trap: focus moves onto the card on open, returns to the invoker on Escape and Close. The card is not modal (the map behind it stays live and a click elsewhere closes it), so no scrim and no Tab ring. `Disclosure.dismiss` (`disclosure.svelte.ts:77`) is the closing that returns focus, used by Escape (`:91`) and the Close button; `close` is unchanged and leaves focus alone, used by a click elsewhere and by `hashchange`, so following a link out of the card does not pull focus back to a badge on a page that is no longer there.
- **developer** (2026-09-29T16:48:27.000Z): Decision, the badge name. "Show evidence for <label>: <hover text on one line>", for example "Show evidence for U/D: One context depends on another; ...". It opens with the text on the button (WCAG label-in-name) and then says what hover says, so a keyboard reader hears what a pointer reader reads. Where a badge has nothing beyond its label, it is "Show evidence for P". The old name was "Evidence for <title>" with the newlines of the hover text left in. `PortBadge.svelte:51`.
- **developer** (2026-09-29T16:48:27.000Z): Decision, expanded. A badge reads as expanded when its own button is the invoker of the open card (`PortBadge.svelte:45`), not when any card is open, so the three badges of an edge do not all claim to be open. `aria-controls` points at the card only while it is open, when the id exists (`PortBadge.svelte:64`). The card's id is minted per disclosure (`disclosure.svelte.ts:58-61`) so two figures on a page cannot share one; it and the open-badge lookup travel on the edge data (`flow-nodes.ts`, `ContextEdgeData.cardId`, `.disclosedBy`), set in `withDisclosure` (`:120`).
- **developer** (2026-09-29T16:48:27.000Z): Focus moves in an effect, not an action (`DisclosureCard.svelte`). The first attempt used `use:` on the card and left focus on the badge: Svelte Flow's `ViewportPortal` moves its content into the viewport after the content's own actions have run, and an element still outside the document cannot take focus. It is `focus({ preventScroll: true })` because the card sits in a clipped viewport and a scroll to reveal it would shift the whole map.
- **developer** (2026-09-29T16:48:27.000Z): Tab order, for the record. Svelte Flow draws the edges layer before the nodes, so a Tab pass meets each edge's own stop (its default `edgesFocusable`, named "Edge from A to B"), then the badges, then the nodes, then the controls. Left as the library has it. The badges and nodes are each in document order.
- **developer** (2026-09-29T16:48:27.000Z): Not changed at the time, and worth a decision: in fullscreen, one Escape closed the card and the overlay together, because both listen on `window`. Fixed in the follow-up below.
- **developer** (2026-09-29T17:07:50.000Z): Follow-up from review: Escape in fullscreen closes the innermost layer. The disclosure's window listener now runs in the capture phase and calls `stopImmediatePropagation` on Escape (`disclosure.svelte.ts`, `show`), so the fullscreen overlay's own `window` listener never sees the key while a card is up: the card closes, focus returns to its badge, and the diagram stays fullscreen; the next Escape, with no card, reaches the overlay and leaves fullscreen. Every other key passes through. Failing first: the fullscreen test in `diagram-evidence-keyboard.spec.ts` failed on the fullscreen-still-on assertion (both closed at once); it now passes on the viewer and the export. Focus after the second Escape is not moved: the existing fullscreen module has no return-focus convention (the fullscreen control is not tracked), so focus stays where it was, on the badge; that is the one part of the lead's request I did not add, because it would be a new convention rather than an existing one.
