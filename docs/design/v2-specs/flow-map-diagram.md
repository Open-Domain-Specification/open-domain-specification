# The flow map — the fourth interactive diagram

`packages/pages/src/lib/flow/flow-graph.ts`, `FlowNode.svelte` and
`FlowEdge.svelte`, registered as the `flow` node and edge types, with the
diagram kind `flow` in `kind.ts` and its legend in `legend.ts`. Card 80.

The pages already draw three maps: the context map, the consumable map and
the relation map. The reactions — what wakes a policy, what a process issues,
what finishes an instance — were drawn only by the graphviz renderer and the
generated docs, so a reader of the pages had to leave the page to see them.
This is the fourth map, drawn from `ODSFlowMap` and nothing else, with the
same fit, panels, legend and disclosure the other three have.

## What the map says

One sentence: **a solid arrow is what happens next; the one dashed arrow is
what finishes.** Everything else in the drawing is there to say which of the
four kinds of step each box is.

The chain the map draws is the chain `reaction-cycle` walks
(`packages/core/src/reaction-walk.ts`), so a ring a reader can see is a ring
the rule reports. Nothing is added here that core does not say.

## The four node shapes

The static renderer already has shapes for these four
(`packages/graphviz/src/flow-map.ts`: ellipse, box, note, folder). The same
model is drawn twice — once in the generated docs, once here — so a reader who
has seen one must recognise the other. The interactive map keeps graphviz's
silhouettes and drops its pastel fills, which are exactly the decoration
principle 3 of the language rules out.

| Step        | Graphviz | Here                                  | Why                                                                                     |
| ----------- | -------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| `event`     | ellipse  | a stadium: full-height round ends      | The ellipse's silhouette at a density text can live in. A true ellipse has to be half again as wide as its label to keep the label off the curve, and every node here is named. |
| `command`   | box      | a rectangle, the 2px radius the other UML nodes use | An operation is the one step somebody performs. It is the plain box the relation and consumable nodes already are. |
| `policy`    | note     | a note: the top-right corner folded, the flap shaded | A policy is a rule written down. The fold is the corner cut off the card plus a shaded triangle for the flap. |
| `process`   | folder   | a folder: a tab over the top-left edge  | A process is a note that outlives one reaction — the folder that keeps several of them. Same family as the note, plainly not the same thing (decision 23). |

Colour follows section 6 of the language and nothing else: each node carries
its kind's codicon in the Outline's own token — `broadcast` in
`symbolIcon.eventForeground` for an event, `zap` in
`symbolIcon.functionForeground` for an operation, `law` and `server-process`
in `icon.foreground` for a policy and a process, the same glyphs the tree,
the tables and the generated docs use. The card is `--card` on `--border`
like every other node in every other map. No fill is spent on kind: the shape
already says it, and a second cue in colour would be the pastel palette v1
was thrown out for.

Under each name is the cluster path the other maps draw — a consumable's is
its provider's, so a step reached in another context reads as belonging over
there — and each node hovers to its description.

## The dashed `ends` edge

`ODSFlowMapEdge.kind === "ends"` is the one edge in the model that is not a
step: it runs from a process to the fact that completes an instance, which
the process does not cause (decision 23). It is drawn dashed, arrowheaded and
labelled `ends`, which is the graphviz image's treatment too.

Dashed already means one thing across these diagrams and this is that thing:
a weaker claim than a solid line. On the context map a dashed edge is a
relationship nobody declared; on the relation map it is a dependency rather
than a part-of. Here it is completion rather than causation. The label is
kept because the dash alone cannot say which of those three a reader is
looking at, and because the legend row it earns is one line.

The arrowhead stays: the edge has a direction — the process ends *on* that
event, not the other way round — and losing it would leave the reader to
guess.

## A process's lifecycle at a glance

The map is laid out left to right, as the graphviz image is and as core's own
comment says the lifecycle reads. That is what makes the shape legible
without reading a word:

```
  OrderPlaced ─▸┌──────────────┐─▸ ApproveOrder ─▸ OrderApproved ─▸ …
                │ ▭ Order       │
PetStatusChanged │   fulfilment │┄ends┄▸ OrderDelivered
              ─▸└──────────────┘
```

- What **starts** an instance and what it **waits for** arrive from the left,
  because the walk enters the process from its events.
- What it **issues** leaves to the right on solid arrows, and what those raise
  continues rightwards, so the consequences of the process read away from it.
- What **ends** it leaves on the one dashed arrow, and is never walked from,
  so the ending fact is a leaf of that branch rather than a step back into the
  chain.

So the lifecycle is read as: everything to the left of the folder is what got
here, everything solid to the right is what it does, and the dashed line is
where it stops. The process page's four sections — Starts, While it runs,
Then, Ends — are the same four things in the same order, in prose.

The page's own policy or process is drawn with a 2px `--fg` border and a faint
wash instead of the 1px border every other node has. Weight, not hue: the
language colours kind icons and diagnostics and nothing else, and "the thing
this page is about" is neither. The legend names the mark.

## The legend

Derived from the graph as the other three are, so it lists only what is
actually drawn:

| Mark            | Name                     | When                                      |
| --------------- | ------------------------ | ----------------------------------------- |
| `stadium`       | Event                    | the map draws an event                    |
| `box`           | Operation                | the map draws an operation                |
| `note`          | Policy                   | the map draws a policy                    |
| `folder`        | Process                  | the map draws a process                   |
| `arrow`         | What happens next        | the map has a causal edge                 |
| `dashed ends`   | What completes a process | the map has an `ends` edge                |
| `bold outline`  | This page's reaction     | one node is the page's own policy/process |

## Where it appears

**The rule: the map comes at the end of the last section it summarises.**
Every reaction it draws has then been named in prose above it, and the reader
meets the drawing as the summary of what they have just read rather than as a
puzzle to solve first.

| Page             | Section     | Caption                        |
| ---------------- | ----------- | ------------------------------- |
| Context page     | Reactions   | `<Context> flow map`            |
| Policy page      | Then        | `<Context> flow map`            |
| Process page     | Ends        | `<Context> flow map`            |

On the context page the map belongs to two tables at once, so the section it
ends is the one that holds both. Card 88 replaced the page's Policies and
Processes sections with a single **Reactions** section — the paired level-3
headings the language asks for (Aggregates and Services, Provides and
Consumes, now Policies and Processes), the two tables under them, and the map
beneath the pair. One table-of-contents entry, one lead sentence, and the map
still comes after every reaction it draws has been named in prose above it.

The map is always the whole context's, because that is the scope core offers
(`ODSFlowMap.fromBoundedContext`) and because a policy's neighbours are the
point: a reader on a policy page wants to see what the operations it issues
set off next, which is drawn in its neighbours' rows. On a policy or a process
page that page's own node carries the bold outline, so the reader finds
themselves in it at once.

The caption names the context rather than the policy on all three pages, so
it never claims a scope the drawing does not have.

Empty is a real state: a context with no policies and no processes has an
empty flow map, and `DiagramFigure` renders the sentence "Nothing reacts to
anything here yet." instead of a canvas, as it does for the other three.

### The alternative card 80 shipped, and why it was replaced

Card 80 ended the Processes section with the map and left the two reaction
sections as they were. That was the cheap move: the map still came after both
tables, so it said the same thing, and it avoided renaming a table-of-contents
entry a reader may have linked to on a shipped page. What it could not say is
that the map belongs to both tables rather than to the second one — a reader
scanning the contents saw Policies and Processes as two unrelated sections
with a drawing tacked onto the end of one of them.

The lead took the information-architecture call on card 88 and the Reactions
section is what shipped. The rename is the whole cost, and the anchors it
breaks are `#behaviour` and `#processes`; this repo keeps no aliases for old
anchors any more than it does for old schema names.

## States implemented

Default, hover (node title, edge label), the fit's collapsed panels, the empty
map, a process with no start or no end event (the map simply has no edge for
what is not declared), and the page's-own-node focus mark. Keyboard reach and
the panels' `aria-expanded`/`aria-controls` are `InteractiveDiagram`'s and
`PanelFit`'s and are unchanged.
