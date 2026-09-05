# LegendPanel — the legend gives way

`packages/pages/src/lib/flow/LegendPanel.svelte`, with
`packages/pages/src/lib/flow/legend-state.svelte.ts` and the fit decision in
`packages/pages/src/lib/flow/panel-fit.ts`. Card 64.

## The rule

The map is the content; the legend is chrome. When the two cannot both have
the room, the chrome gives way.

The panel-aware fit reserves a strip for each floating panel so no node ends
up under one. On a wide map in a narrow editor split those strips are the
difference between a map and a smudge: NorthBank's fifteen contexts fitted
beside an expanded legend came out at a tenth of scale, and the answer at the
time was to let the zoom floor fall to 0.1 so it would fit at all. A map at a
tenth is not a map anyone reads. The floor is back at 0.2, and when the fit
would land below the readable floor the legend collapses to its header row and
the fit reserves only that corner.

## The two states

Expanded — a section header and the terms under it, as today:

```
▾ Legend
OHS   Open Host Service
U/D   Upstream / Downstream
ACL   Anticorruption Layer
```

Collapsed — the header row alone, in the same corner:

```
▸ Legend
```

The header is the same control in both: one row, a chevron and the word, the
whole row a `<button>`. That is how every section in VS Code opens and closes —
the Explorer's sections, the Run and Debug view, the Settings editor's groups —
and it is the only chrome the panel gets. It carries `aria-expanded` for which
way it is and `aria-controls` naming the term list, the list stays in the DOM
under `hidden` so the name resolves either way, it is in the tab order because
it is a real button, Enter and Space work because it is a real button, and it
takes a `focusBorder` ring when focused from the keyboard.

## Who decides

Two parties, in this order:

1. **The fit**, once, on the frame it measures the panels: if reserving the
   legend's column would fit the map below the readable floor, the legend gives
   way. It asks only once, with the legend at full height, because that is the
   only moment the column can be measured — asking again once the legend is a
   row would find room, open it, run out of room and close it, and the reader
   would watch it flap.
2. **The reader**, whenever they like, and their answer wins from then on. A
   reader who opens the legend on a crowded map meant to open it, and it stays
   open on every diagram on the page.

The reader's answer is remembered for the session, not for the browser. It
answers one map in one window rather than stating a preference: a wider editor
tomorrow should start from what fits again. It rides in `sessionStorage`
behind a try/catch, as any storage in the pages does, so a webview with
storage denied still works — the choice simply lasts as long as the page.
It is deliberately not one of the diagram options in `localStorage`, which are
preferences about how a diagram is drawn.

## The threshold

Two constants sit together in `panel-fit.ts`:

- `MIN_ZOOM = 0.2` — the floor Svelte Flow clamps the canvas to.
- `READABLE_ZOOM = 0.25` — the zoom at which the legend gives way.

The second is above the first on purpose. A map fitted exactly at the floor is
one the viewport is already clamping, which is the state the nodes slide under
a panel in; the legend has to be out of the way before the map reaches the
wall, not once it is pressed against it.

The decision itself is a pure function — `legendGivesWay(view, panels, bounds)`
— so it is answered without a browser: hand it the numbers a webview would have
measured and it says yes or no.

## What the legend cannot fix

Measured on NorthBank at 1280x720, where the canvas is 740x432: the map needs
a zoom of 0.179 to fit inside the strips, and the binding axis is the vertical
one — the options panel's band and the fit's default quarter of air leave 333px
of a 432px canvas for a map that wants 372px. Collapsing the legend frees a
column the fit was not short of, so the number does not move. With the default
air dropped the same map fits at 0.202, a percent over the floor.

So the legend giving way is the right rule and it is not the whole answer for a
map that wide in a canvas that short. The next thing that should give way is the
air: the fit's 25% is decoration, and decoration goes before content does. That
is a rule beyond this card and it is the lead's to call, with the options panel's
own band and the canvas height (60vh) as the other two candidates.
