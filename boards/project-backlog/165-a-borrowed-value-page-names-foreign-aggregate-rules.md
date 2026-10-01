---
column: doing
labels: [model, bug]
priority: high
agent: lead
live: false
status: Sixth signoff round found a foreign aggregate rule omitted from the value page; correction and focused test pass, integrated gate pending
progress: 85
clean-code-swept: true
updatedAt: 2026-10-01T00:40:00Z
---
# A borrowed value page names foreign aggregate rules

Issue #115. On the sixth signoff head `a11bede2`, OpenAI Astra low reproduced a valid Cards aggregate constraining Ledger's borrowed Money. The Card page and Markdown show `PositiveBalance`, but Money's detail page searched only Ledger aggregates and said “No aggregate's rule names this value object.” The shared Svelte page gives the same false statement in the VS Code webview, viewer and static export. Claude Opus 5.5 high approved that head but did not find this counterexample; the reproduced defect blocks signoff.

## Checklist

- [x] Money's Constrained by list searches every workspace aggregate's invariants targeting Money, in workspace order, once each; local rules still appear and the empty state remains when none exists
- [x] Each listed rule links to its invariant and says which aggregate keeps it, with its context when foreign
- [x] A zero-diagnostic two-context shared-kernel fixture asserts the rule, owner context, aggregate and links before and after JSON round-trip
- [x] Value-object detail copy states the direct scope of its attribute table and the borrowing scope of relations
- [x] Decision 18 appends a correction to its `mayBorrowFrom` file pointer; core's broad value-object list now excludes a recursive value's self-reference, like the schema list
- [x] The five pinned diagnostic lists and generated outputs remain unchanged on the `c1fc4bbd` full gate; seventh-round reviewers confirmed this fix holds

## Gates

- [x] Focused: value-object page test, core self-reference test, Svelte check
- [x] `bash scripts/verify-all.sh` passed on `c1fc4bbd`: core 1061, pages 1008, browser 430 passed/20 skipped, all model suites, schema and ESM checks
- [ ] Exact-head independent signoff after the gate, with OpenAI Astra low and Claude Opus 5.5 high if available

## Journal

- **lead** (2026-10-01): Issue #115 records the reader story. The page's local-only lookup was narrower than decision 27 and the validator: an aggregate may constrain a borrowed value it holds. I moved its search over all contexts' aggregates and added an optional Kept by column to the existing invariant table, showing `Cards / Card` for a foreign rule. The new test checks the runnable counterexample both as authored and after a JSON round-trip. No schema or validator rule changed. Focused tests and Svelte check pass; the full gate and final reviews remain.
- **lead** (2026-10-01): Clean-code pass on the outgoing diff: one lookup remains in the page that alone needs it; the reusable invariant table only gains an optional owner column; no duplicate rule calculation, unchecked lookup or dead path was found. The recursive self-user guard is one early return. Format and diff-whitespace checks pass. The browser and full repository gate remain the required integration checks.
- **lead** (2026-10-01): The `c1fc4bbd` full gate passed. Astra and Opus both verified the borrowed Money / PositiveBalance correction on that head. They found separate defects in the context and entity pages, tracked as issues #116 and #117; this card remains in `doing` until the integrated model head lands.
