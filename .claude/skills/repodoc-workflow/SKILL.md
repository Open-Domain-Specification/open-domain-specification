---
name: repodoc-workflow
description: How to work a RepoDoc project — pick up cards from the kanban board, report live progress, record decisions, and keep docs current. Use whenever this repo contains boards/, decisions/, or docs/ managed by RepoDoc.
---

# Working a RepoDoc project

RepoDoc keeps a project's kanban board, decision records, and documentation as
plain files in the repo. You move work forward by editing those files. A VS Code
extension watches them and updates its UI live — you never reload anything.

## Layout

- `boards/<board-id>/NN-slug.md` — one card per file. The `NN` prefix is the
  card's global position on the board.
- `boards/<board-id>/.config.json` — board `name`, `columns`, WIP limits,
  and `labels`.
- `decisions/NN-slug.md` — decision records, ordered by prefix. Frontmatter
  carries `status` (Proposed | Accepted | Superseded) and `date`.
- `docs/NN-slug.md` (and subfolders) — the documentation tree; the numeric
  prefix orders the sidebar.

## Card file anatomy

Frontmatter keys (all optional except `column`):

- `column` — the column id the card sits in (e.g. `backlog`, `todo`, `doing`,
  `review`, `done`).
- `labels` — a list, e.g. `[bug, backend]`.
- `priority` — `high` | `med` | `low`.
- `agent` — free text naming who is working the card (no roster; add yourself).
- `live` — `true` while you are actively working, else `false`/absent.
- `status` — a one-line human summary of what you are doing right now.
- `progress` — an integer 0-100.
- `updatedAt` — ISO timestamp; bump it on every edit.

Note: list values (`labels`) must use the INLINE form `[a, b]` — block-style
YAML lists (`- item` on their own lines) are NOT parsed. There is no
`comments` frontmatter key — comments are a body section (see below).

Body: a `# Title` heading, then a short description, then these OPTIONAL
sections in order — `## Checklist` (`- [ ]` task items), `## Gates` (evidence
for script gates), and `## Comments` (your work journal). The count badge on a
card is derived from the `## Comments` entries.

Example card (`boards/project-backlog/03-add-csv-export.md`):

```markdown
---
column: doing
labels: [feature, backend]
priority: high
live: true
status: Wiring the export endpoint
progress: 40
updatedAt: 2026-07-17T10:32:00.000Z
---
# Add CSV export

Let users download their report data as CSV. See decisions/04-export-format.md.

## Checklist

- [x] Design the CSV column mapping
- [ ] Implement the export endpoint
- [ ] Add tests

## Comments

- **claude** (2026-07-17T10:32:00.000Z): Mapped the report columns to CSV headers in src/export/csv.ts:14-38 and stubbed the endpoint; tests still to write.
```

## Journal your work

A card's `## Comments` section is a work JOURNAL — a durable, append-only
narrative of what happened on the card and why. This is a core RepoDoc habit,
not an optional extra.

**By default, whenever you make meaningful progress on a card, append a journal
entry to its `## Comments` section.** One entry per work session or meaningful
step. Never rewrite or delete earlier entries — the history is the point.

Each entry is a single task-less bullet:

```markdown
## Comments

- **<your-name>** (<ISO time>): <what you did and why>
```

Reference every file you touched inline as `path:line` or `path:start-end`,
e.g. `src/core/store.ts:123` or `src/panels/boardPanel.ts:40-60`. RepoDoc turns
these into one-click links that open the file at that exact highlighted range,
so ALWAYS include the `path:line` when you mention code — never describe a change
without pointing at where it lives.

```markdown
## Comments

- **claude** (2026-07-17T10:05:00.000Z): Wired the export endpoint in src/export/router.ts:22-49 and reused the CSV mapper at src/export/csv.ts:14. Endpoint returns 200 with the right headers; adding tests next.
- **claude** (2026-07-17T11:40:00.000Z): Added coverage in src/export/csv.test.ts:1-64 — 6 cases, all green. Ready for review.
```

Approvals and sign-off go through fields, not comments (see Workflow gates).
The journal is for narrating the work; it is what a human — or the next agent —
reads to understand the card without re-deriving its history.

## Custom fields

A board may define extra typed card fields in `.config.json` under `fields`
(each an `id`, `label`, `type`, and `options` for selects). Their values are
FLAT frontmatter keys, one per field id, typed by the def:

- `text`/`select`: a string — `sprint: "24"`, `release: v0.2.0`.
- `number`: `estimate: 5`. `boolean`: `blocked: true`. `date`: `due: 2026-07-20`.
- `multiselect`: the inline array form — `areas: [core, ci]`.

Read the board config for the field ids and `select` options — never invent
them, and preserve any existing value you do not recognise rather than dropping it.

## Working a card

1. Claim it: set `column: doing`, `live: true`, a one-line `status`, and put
   your name in `agent:` (free text — e.g. `agent: claude`; it renders as an
   avatar on the card). Journal who you are in `## Comments` too.
2. While working: keep `live: true`, a current `status`, and `progress`.
3. Tick checklist items `- [x]` as you finish them, and journal meaningful
   progress to `## Comments` (see "Journal your work").
4. Before moving to review: run a clean-code review sweep (`clean-code-review`
   skill) and, for anything it flags, loop the `refactor` skill until clean.
   Then set `clean-code-swept: true` and record it under `## Gates`.
5. When done: set `column: review` (a human moves it to `done`), set
   `live: false`, and remove `status`/`progress`.
6. Always bump `updatedAt` on every change.

## Workflow gates

A column may declare `enter` and/or `exit` gates in `.config.json`. BEFORE you
change a card's `column`, evaluate the target column's `enter` gates and the
current column's `exit` gates, and only move the card if they all pass.

A gate has an `id`, an optional `label`, and exactly one of two kinds:

**script gates** (`script` is set) — a command that must have run green. Run the
command yourself; ONLY when it exits 0, record an evidence line under the card's
`## Gates` heading:

```markdown
## Gates

- [x] tests-passing — npm test green, 130 unit + 9 e2e (claude, 2026-07-17T02:30:00Z)
```

Format: `- [x] <gateId> — <one-line result> (<your-name>, <ISO time>)`.
Never record a line for a run that did not pass.

**field gates** (`field` is set) — a live check against a card field. Satisfy it
for REAL by setting that field (a flat frontmatter key) to a value the check
accepts. The optional `check` expression uses this mini-syntax against the
field's current value:

| `check`        | passes when                                   |
| -------------- | --------------------------------------------- |
| *(absent)*     | the field is non-empty                        |
| `empty`        | the field is empty / unset                    |
| `nonempty`     | the field has any value                       |
| `= v`          | the value equals `v`                          |
| `!= v`         | the value does not equal `v`                  |
| `> n` / `>= n` | numeric greater-than / greater-or-equal `n`   |
| `< n` / `<= n` | numeric less-than / less-or-equal `n`         |
| `contains v`   | the value (or a multiselect item) contains `v`|
| `match <re>`   | the value matches the regular expression `re` |

**Approvals are field gates.** A review sign-off is just a field the reviewer
sets — e.g. a `peer-reviewed` select checked with `= true`. NEVER set a field
whose gate clearly encodes a HUMAN sign-off (name heuristic: `peer-reviewed`,
`approved-by`, and the like) unless you are the person named. That is the human's
to set.

If a gate is unsatisfied and you cannot honestly satisfy it, stay put: leave the
card in its column and set `status: blocked on gate: <gateId>`. A human may
override a gate they cannot satisfy the normal way by recording an `OVERRIDDEN`
line with their name under `## Gates`, keeping the bypass visible in the diff.

## Ordering

The `NN` prefix is the card's global order across the whole board. The extension
renumbers cards for you when a human drags them — never renumber other cards
yourself. To add a card, use the next free `NN` and a fresh slug.

## Decisions

When a significant choice is made, record it. Add `decisions/<next-NN>-slug.md`:

```markdown
---
status: Proposed
date: YYYY-MM-DD
---
# Decision NN — Title

## Context

Why this came up.

## Decision

What was chosen.

## Consequences

What this implies, and any trade-offs.
```

Link the decision from the card's description so reviewers can find it.

## Docs

Keep `docs/` current whenever behavior changes. The first `# ` heading in a doc
file is its sidebar label; the numeric prefix orders it.

## Remember

The extension watches all of these files — just save your edits, no reload
needed. Bump `updatedAt`, keep `status`/`progress` honest while `live`, and
leave the board reflecting reality.
