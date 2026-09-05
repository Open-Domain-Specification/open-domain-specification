# The diagram panels — what gives way when the fit runs out of room

`packages/pages/src/lib/flow/LegendPanel.svelte` and
`packages/pages/src/lib/flow/DiagramOptionsPanel.svelte`, with the order in
`packages/pages/src/lib/flow/panel-fit.ts`, its effects in `fit.svelte.ts` and
each panel's open state in `panel-state.svelte.ts`. Card 64.

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
