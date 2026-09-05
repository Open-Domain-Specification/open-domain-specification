---
name: tech-lead-team
description: How this repo's work is split between the tech lead (the main Claude session) and low-autonomy developer subagents (dev-opus, dev-sonnet) that action only their assigned RepoDoc card and talk to the lead through the card's comments. Load when picking up board cards with subagents, when spawned as dev-opus or dev-sonnet, or when a card comment asks the lead a question.
---

# Tech lead and team

One session leads. It owns design decisions, reviews, commits, releases and the
boards. Developers are subagents with low autonomy: each actions exactly one
assigned RepoDoc card and journals on it, so every question and answer is
visible to everyone on the board. The `repodoc-workflow` skill defines the card
format; this skill defines who does what on it.

## Roles

**Tech lead** (the main session, currently Claude Fable):

- Picks cards, sizes them, and assigns each to one developer type.
- Answers every `QUESTION for lead` on the card, in the card's `## Comments`,
  then resumes the developer. Decisions that outlive the card go to
  `decisions/` and are linked from the card.
- Reviews the working tree when a developer reports back: reads the diff, runs
  the suites, runs the `code-review` skill or the Antigravity CLI for a second
  opinion when the change is more than a few files.
- Commits and pushes. Developers never do.
- Moves cards to `review`; a human moves them to `done` (see
  `repodoc-workflow`). Records QA evidence under `## Gates` as `qa-automated`.

**Developers** (subagents defined in `.claude/agents/`):

| agent        | model  | effort | use for                                                         |
| ------------ | ------ | ------ | --------------------------------------------------------------- |
| `dev-sonnet` | Sonnet | low    | styling, defaults, small tests, docs, snapshot tests            |
| `dev-opus`   | Opus   | medium | geometry, theming across hosts, cross-package tests, refactors  |

Low autonomy means: only the assigned card, no design decisions, no scope
changes, no commits, no board moves beyond `todo -> doing -> review`.

## Sizing

Sonnet, low effort, when the card's checklist names the files and the change is
mechanical: CSS variable mapping, a default value, a snapshot test, a doc page.
Opus, medium effort, when the card needs reasoning about behaviour that the
tests cannot fully pin down: curve geometry, theme detection across three
hosts, a Playwright spec against a new server, anything touching the shared
protocol between pages and the extension.

If a Sonnet card comes back with two or more questions, reassign it to Opus.

## Assigning a card (lead)

1. Set on the card: `agent: dev-sonnet` or `agent: dev-opus`, `column: todo`,
   and a journal entry: what is fixed by decision already, what the developer
   may choose, and the tests that prove it. Ambiguity left here becomes a
   question later, so spend the words now.
2. Spawn with the `Agent` tool, `subagent_type` set to the developer name, and
   a prompt of one line: the card path plus "Load the tech-lead-team skill and
   action this card." Everything else is on the card.
3. Run independent cards in parallel when they touch different files. Cards
   that share a file run one after the other.

## Working a card (developer)

1. Read the card and every file it cites. Load `repodoc-workflow`.
2. Claim it: `column: doing`, `live: true`, `agent` already set, a one-line
   `status`, and a first journal entry naming yourself.
3. Implement only the checklist. Tick items as their tests pass. Journal each
   meaningful step with `path:line` references.
4. On any open choice, stop:

   ```markdown
   - **dev-opus** (2026-09-03T14:00:00.000Z): QUESTION for lead: the card says
     "map minimap colours to theme tokens" but does not say which token the
     mask uses. Options: (a) `--bg` at 60% (b) `--border`. I recommend (a),
     it keeps the viewport visible on dark. Blocked until answered.
   ```

   Set `status: blocked on lead: <short question>` and end your turn; your
   final report repeats the question. Do not guess and continue.
5. When the checklist is complete and the package tests pass at their
   thresholds, run the `clean-code-review` skill, fix what it flags with the
   `refactor` skill, set `clean-code-swept: true`, record the sweep under
   `## Gates`, set `column: review`, `live: false`, drop `status`/`progress`.
6. Final report to the lead: changed paths, test evidence, open questions.
   Nothing else; the journal already has the narrative.

## Answering a question (lead)

Append the answer to the same card's `## Comments` as your own entry, clear
`status`, and resume the developer with `SendMessage` to its agent id so it
keeps its context. If the answer is a design decision, write the decision
record first and link it from the answer.

## Review and landing (lead)

- Read `git diff` and the card journal together; every ticked item should map
  to a test the diff adds or changes.
- Run `npm run verify` (the landing gate; see `repodoc-workflow`'s "Landing a
  card"), plus any suite the card names headed where a human will watch
  (`npx playwright test --headed`, `npm run test:vscode`). See the
  `qa-is-automated-tests` rule: reviewers watch tests, they do not click.
- Commit with the card number in the subject, `(card NN)`, push `develop`,
  open the PR to `main`. The human merges; the lead cuts versions.

## What developers never do

- Edit `package-lock.json`, workflows, versions, or another card.
- Change a public API shape, a default the user can see, or a colour constant
  without a lead answer on the card.
- Move a card to `done`, commit, push, or open a PR.
- Delete or rewrite earlier journal entries.
