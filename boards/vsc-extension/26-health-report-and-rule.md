---
column: todo
labels: [frontend, backend]
priority: high
agent: dev-opus
updatedAt: 2026-09-04T08:00:00.000Z
---
# Health report on the workspace page and the comments-required rule (RFC-002 card G)

`HealthReport` (card 19) ships: a section on the workspace page and its own route `#/health`, listing refactor, tolerated and no-comment intents from core's `dispositionOf` and `intentsWithoutComments`. One opt-in validation rule in core warns on strategic intents with no comments. The extension tree shows the three counts on the workspace node and the Problems panel shows the rule's warnings.

## Checklist

- [ ] `WorkspacePage.svelte` gains a "Health" section with the summary strip and links to the full report; `HealthPage` template at `#/health` renders the full `HealthReport`; `elements.ts`, `resolve.ts`, search updated
- [ ] Core: `comments-required` rule behind a workspace option (`WorkspaceSchema.options?.rules?.commentsRequired: boolean`, or the existing rule-options shape if there is one), emitting one warning per intent with its ref; rule tests
- [ ] Extension: workspace tree node description carries "n to refactor, n tolerated, n uncommented" when any is non-zero; Problems maps the rule's warnings to the JSON position of the relationship, consumable or consumption
- [ ] Doc generator: the workspace page prints the same three lists under "## Health"
- [ ] Pages unit at 100%; e2e case opens `#/health` on petstore and sees "1 to refactor"; `npm run test:vscode` case for the tree counts; core and doc suites green

## Comments

- **lead** (2026-09-04T08:00:00.000Z): Assigned to dev-opus. Fixed by decision: the report reads core helpers only, no lifecycle, no dates; "No comments" stays collapsed by default; the rule is opt-in and off in the four reference models except petstore, which turns it on so the Problems path is exercised (petstore must then have no uncommented intents, or the two it has get comments). Start after card 23 has landed on develop (the lead will say). Work in your worktree with absolute paths for every suite; `npm ci` there first if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
