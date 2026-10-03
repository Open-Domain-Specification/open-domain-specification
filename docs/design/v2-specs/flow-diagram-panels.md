# The diagram panels — what gives way when the fit runs out of room

`packages/pages/src/lib/flow/LegendPanel.svelte` and
`packages/pages/src/lib/flow/DiagramOptionsPanel.svelte`, with the order in
`packages/pages/src/lib/flow/panel-fit.ts`, its effects in `fit.svelte.ts` and
each panel's open state in `panel-state.svelte.ts`. Card 64.

**Current position (2026-09-30).** The order is the legend, then the options panel, then the
zoom floor; the air step is retired and a side no panel claims keeps only the 12px gutter (#89).
The guarantee covers four panels, the legend, the options, the zoom controls and the minimap,
each cleared by whichever strip fits the map largest (#90). The fit is redone when a panel or the
canvas changes size while the view is still the fit's, and entering or leaving fullscreen hands
the view back to the fit (#86). A panel no strip within 40% of its axis can clear gives way too, and
the fullscreen overlay is the viewport without its scrollbars. The dated amendments at the end say why; the sections before them
are the record as written for card 64, and where they name the air, four steps or the table of
costs, the amendments supersede them.

This card settled the give-way order; the panels' frame is a separate,
still-open touch tracked in `organism-interactive-diagram.md` rather than
here — both panels still carry the rounded `editorWidget` frame that doc
says should give way to a 1px `panel.border` rule.

## The guarantee

The whole map is on the canvas and no node is under a panel. That is what the
fit promises the reader, and it is what `e2e/diagram-panel-fit.spec.ts` holds
it to on every workspace the repository ships.

## The rule

The map is the content. The legend, the options panel and the air around the
drawing are chrome and decoration. When they cannot all have the room, they
give way, in this order, and each step is taken only if the map still needs it:

1. **The legend** collapses to its header row, and the fit reserves that
   corner instead of a column.
2. **The options panel** collapses to its own header row, keeping the
   fullscreen button.
3. **The air** the fit keeps on a side no panel claims drops to the 12px
   gutter.
4. **The zoom floor** itself falls, from `MIN_ZOOM` 0.2 to `FLOOR_ZOOM` 0.1.

The order is what each step costs the reader. A legend row is a term list they
can open again in one click, and the terms are on the page in prose anyway.
The options row is a control they were not using at the moment they opened the
map, and the one command action in it — fullscreen — stays in the collapsed
row, because a reader looking at a map too big for its canvas is the reader
most likely to want it. The air is nothing but taste. A node under a panel, or
a map cropped by the edge of the canvas, is information the reader cannot get
back at all, so the floor gives way last and the guarantee never does.

That last step is the honest version of what cards 20 and 56 did in a hurry:
they dropped the only floor there was to 0.1, which made every crowded map
unreadable to save the worst one. Here it is the fourth thing to give, so it
happens to the one map in the reference set that needs it and to no other.

## The three floors

Named together in `panel-fit.ts`:

| Constant        | Value | What it means                                              |
| --------------- | ----- | ---------------------------------------------------------- |
| `READABLE_ZOOM` | 0.22  | Below this the chrome starts giving way.                    |
| `MIN_ZOOM`      | 0.2   | The floor a fitted map should keep; below it a context is a smudge with a smear of text on it. |
| `FLOOR_ZOOM`    | 0.1   | The floor of last resort, once everything else has given.   |

`READABLE_ZOOM` is a tenth above `MIN_ZOOM` and no more. A map fitted exactly
at the floor is one the viewport is already clamping, which is the state a node
slides under a panel in, so the chrome has to be out of the way just before the
map reaches the wall. Further above the floor and the rule starts firing on maps
that were fine: at a quarter, two of the four reference workspaces lost both
panels at editor size while their maps sat at a comfortable 0.26 and 0.31.

The decision is a pure function — `needsRelief(view, panels, bounds, air,
floor)` — so the whole order is testable without a browser: hand it the numbers
a webview would have measured at each step and it says whether to take another.
`PanelFit.svelte` asks it once per step and measures again in between, because
a collapsed panel is a smaller box and that smaller box is what the next
question is about.

## The two states of a panel

Expanded — the header and the body under it:

```
▾ Legend                         ▾ Options  Handles ▾  Edges ▾  Style ▾  ⛶
OHS   Open Host Service
U/D   Upstream / Downstream
ACL   Anticorruption Layer
```

Collapsed — the header row alone, in the same corner:

```
▸ Legend                                                    ▸ Options  ⛶
```

The header is the same control in both panels and in both states: one row, a
chevron and the word, the whole row a `<button>`. That is how every section in
VS Code opens and closes — the Explorer's sections, the Run and Debug view, the
Settings editor's groups — and it is the only chrome either panel gets. Each
carries `aria-expanded` for which way it is and `aria-controls` naming the body
it opens; the body stays in the DOM under `hidden`, so the name resolves either
way. Both are in the tab order because they are real buttons, Enter and Space
work for the same reason, and both take a `focusBorder` ring when focused from
the keyboard.

## Who decides

Two parties, in this order:

1. **The fit**, once, on the frame it measures the panels, walking the order
   above. It asks about each panel once, with the panel at the size it is then,
   and never asks again about a box it has already shrunk — a legend that was
   asked again once it was a row would find room, open, run out of room and
   close, and the reader would watch it flap.
2. **The reader**, whenever they like, and their answer wins from then on for
   that panel. A reader who opens the legend on a crowded map meant to open it,
   and it stays open on every diagram on the page.

The reader's answer is remembered for the session, not for the browser. It
answers one map in one window rather than stating a preference: a wider editor
tomorrow should start from what fits again. It rides in `sessionStorage` behind
a try/catch, as any storage in the pages does, so a webview with storage denied
still works — the choice simply lasts as long as the page. It is deliberately
not one of the diagram options in `localStorage`, which are preferences about
how a diagram is drawn.

## What it costs on the shipped models

Measured in the viewer at 1280x720 and at an editor split of 1150x700, as the
step the diagram records in `data-fit`:

| Model      | 1280x720        | 1150x700        |
| ---------- | --------------- | --------------- |
| petstore   | nothing gives   | nothing gives   |
| rivermart  | to the air      | to the air      |
| streamline | the legend      | to the air      |
| northbank  | the floor       | the floor       |

NorthBank is the map the card was written about: fifteen contexts in a canvas
740px wide and 432px tall, wanting a zoom of 0.179 with the panels and the air
reserved. Every step is taken and it still lands at 0.197, a hair under the
floor a map should keep — which is exactly the case the fourth step exists for.
The reader gets the whole map, no node under a panel, and fullscreen one click
away in the collapsed options row.

## Amendment, 2026-09-30: four panels, strips chosen for the map, and a fit that follows the panels (#90)

Everything above holds for the legend and the options panel. Three things change, because a
reader of NorthBank at 1300x900 found the minimap sitting on Payments Hub, Regulatory Reporting
and Credit Decisioning, and the legend they opened sitting on Sovereign Core.

1. **The guarantee covers four panels, not two.** Svelte Flow's zoom controls (bottom left) and
   its minimap (bottom right) float over the canvas like the legend and the options, and the fit
   never measured them. It measures all four now (`PANEL_SELECTOR`). The controls and the
   minimap never give way: they are small, and they are how a reader moves round a map the fit
   made small, so the relief order is unchanged and they are simply always reserved.
2. **Each panel's strip is chosen for the map being fitted.** A panel is still cleared by a
   whole strip, the column beside it or the band above or below it, because the fit places a
   rectangle and a rectangle clear of a corner panel is on one side of it. Before, each panel
   took whichever strip was the smaller share of its axis, whatever the map. Now every
   combination is tried and the one that fits the graph largest wins, so a wide, flat map gives
   up bands, which cost it nothing, and a tall one gives up columns. The old rule is the
   tie-break. A strip cut short by the 40% cap does not clear its panel, so it is offered only
   when neither strip can.
3. **A panel the reader opens or closes refits the map round it**, as long as the view on screen
   is still the one the fit drew. Only the fit is redone, never the walk down the order, so a
   panel the reader opened stays open and nothing flaps. Once the reader zooms or pans, the view
   is theirs, and a panel opening over it moves nothing. The controls' Fit View button now fits
   the same way the diagram does, past the panels, and hands the view back to the fit.

The price is scale on the densest map. NorthBank's workspace map at 1300x900 fitted at 0.216
with the minimap on a node; clear of it, it fits at 0.172, with the controls' column and the
minimap's column reserved. Every NorthBank page at 1300x900 and 1150x700, in both themes, and
the petstore in the viewer and the static export are held to the guarantee by
`e2e/diagram-panel-fit.spec.ts`, measured once the fit has held still for a dozen frames.

## Amendment, 2026-09-30: the air is gone, and the fit asks about the graph it draws (#89)

The third step of relief, the air, is retired. The order is now the legend, the options panel,
then the floor. The first two and the last are unchanged, and so is the guarantee.

**Why.** The air was a tenth of each axis kept on every side no panel claimed, 76px either side
of a 760px canvas, and it was given up only once a map fell under the readable floor. The page
review of #89 found what that cost. At 1300x900, OnboardingApp's consumable map was fitted at
0.267 with 77px of air left and right, and its labels could not be read. NorthBank's domain, context
and workspace maps showed the same. Nothing under a readable scale should be spent on taste, and
the rule above already says the air "is nothing but taste". So a side no panel claims keeps the
12px gutter and nothing more, and along the axis that binds the graph it reaches the canvas, or
the panel it clears, with only that inset. The page review asked for an 8px inset "the panel
spec names"; the spec names none, and 8px is deliberately not adopted. The 12px gutter is the
inset the spec does name, kept between the graph and a panel, and now the one between the graph
and the canvas's edge too, so there is one inset rather than two.

**A correction the fit needed on the way.** The relief walk and the strip choice measured every
node, but in the sketch style a context map's cluster nodes are hidden, the backdrop drawn in
their place, and Svelte Flow's `fitView` leaves hidden nodes out. So the walk asked about a
bigger graph than the one it then fitted. RiverMart's workspace map at 1280x720 gave way to the floor
for a map that fitted at 0.209. Every question is now asked about the nodes the fit draws
(`drawnBounds`).

What it costs on the shipped models now, as the step `data-fit` records on the workspace's
context map in the viewer. The earlier table, in the card-64 record, is kept as measured on the day it was written:

| Model      | 1280x720               | 1150x700               |
| ---------- | ---------------------- | ---------------------- |
| petstore   | nothing gives (0.468)  | nothing gives (0.346)  |
| rivermart  | the options (0.209)    | the floor (0.158)      |
| streamline | the legend (0.234)     | the options (0.206)    |
| northbank  | the floor (0.166)      | the floor (0.125)      |

The four panels (#90) cost the densest maps more than the air did, and removing the air gives
the room back to the maps that were small only because of it. NorthBank's OnboardingApp
consumable map at 1300x900 is fitted at 0.320 instead of 0.267. RiverMart at 1150x700 went the
other way: it gave way "to the air" before and lands at the floor now, 0.158, because the minimap
and the controls it used to be drawn under are reserved.

Two things are drawn outside the nodes and can now reach the gutter's edge: the sketch
backdrop's regions, drawn 36 flow units round their clusters, and an edge's label where an edge
leaves the outermost node. The guarantee is about nodes; a sliver of backdrop or a label clipped
by the canvas is decoration, and the reader who wants it has fullscreen and the zoom controls.
`e2e/diagram-panel-fit.spec.ts` holds every
NorthBank page at 1300x900 and 1150x700, and the petstore in the viewer and the static export,
to the gutter along the binding axis.

## Amendment, 2026-09-30: a new canvas gets a new fit, once it has been measured (#86)

A fullscreen diagram filled about half the screen. The report suspected a screenshot taken before
the refit landed, and it was not. Driven by hand at 1300x900 and left to settle, NorthBank's
workspace map stayed at 0.2 in the top-left 646x439 of the screen. Leaving fullscreen then drew
it at 0.356, half again wider than the 760x540 canvas it came back to. The overlay's refit waited
a tick and a frame, but Svelte Flow learns its size from a ResizeObserver, which reports after
that frame. So each way, the fit was made for the size the canvas had just stopped being.

The fit now follows Svelte Flow's own measure of the canvas, the size `fitView` fits to. When
that changes, the fit is redone on the same terms as a panel changing size (#90 above): as long as
the view on screen is still the one the fit drew. That covers entering and leaving fullscreen, a
window resized, and an editor split dragged; before, only fullscreen refitted, and a resized
window left nodes under a panel. Entering or leaving fullscreen first hands the view back to the
fit, whatever the reader had done to it, because the reader asked for a new canvas. An overlay
no bigger than the canvas it replaces brings no new measure to wait for, so it is fitted at once.
A window resized under a view the reader zoomed or panned leaves it where they put it. Each
transition moves the viewport once, at the new size.

`e2e/diagram-fullscreen-fit.spec.ts` drives fullscreen by pointer, by Enter and by Escape in the
viewer and the static export, dense and sparse maps, both themes. After each transition it waits
for the settled fit and holds the overlay to the whole window, every node clear of every panel,
and the graph to the gutter along the axis that binds it. Leaving fullscreen must give back the
inline fit exactly.

## Amendment, 2026-09-30: a panel the cap cannot clear gives way, and the overlay is the visible viewport (#90, #86)

Codex's review of the PR head found two things CI on Linux showed and macOS did not.

**A panel past the cap.** A strip may take at most 40% of its axis. At 1150x700, Ledger's open
legend needs a 244px column in a 610px canvas, which is exactly the cap on macOS fonts and a pixel
over it on Linux. Its 199px band is over the 168px cap as well. With neither strip allowed, the fit
reserved the cheaper strip cut to the cap, stopped short of the legend, and left Sovereign Core
(legacy) under it. The relief walk never asked whether a panel could be cleared at all, only how
large the map would be. At 1100x700 the same happens on any fonts.

- A panel no strip within the cap can clear now counts as crowding (`needsRelief`), so it gives
  way in the order, legend first.
- If the reader opens such a panel anyway, it is cleared by a whole strip past the cap. The map is
  drawn smaller but never under the panel.
- A choice of strips must leave the map a fifth of each axis, which is what two capped strips
  leave. Only when no choice does, as with two panels past the cap facing each other or a panel as
  big as the canvas, does every panel take its cheaper strip cut to the cap.

This supersedes the #90 amendment's sentence that a strip cut by the cap "is offered only when
neither strip clears the panel".

The cap now says what a strip should take, and the relief walk enforces it. It no longer decides
what the fit may leave covered.

Among the shipped workspaces' context maps, measured as in the #89 table, one outcome moves. The
petstore at 1150x700 now gives way to the legend, whose strips were both past the cap, and its map
fits at 0.492 instead of 0.346. The other seven are as that table gives them.

**The overlay and a classic scrollbar.** The fullscreen overlay was `100vw` by `100vh`. A viewport
unit counts a classic scrollbar, which Linux draws at 15px and VS Code's webview on Linux keeps. The
overlay was therefore 15px wider than what the reader sees, and the fit drew into the strip under
the scrollbar. It is now sized by `inset: 0` alone, the viewport without its scrollbars.
`e2e/diagram-fullscreen-scrollbar.spec.ts` gives Chromium a 15px scrollbar and holds the overlay to
the visible viewport, with the node nearest the scrollbar hit-testable.
