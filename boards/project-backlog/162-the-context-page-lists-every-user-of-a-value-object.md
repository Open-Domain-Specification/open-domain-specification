---
column: doing
labels: [model, bug]
priority: high
agent: claude
live: false
status: Fix and focused tests committed locally; awaiting the lead's integrated gate and a third signoff round
progress: 85
clean-code-swept: true
updatedAt: 2026-10-01T00:30:00Z
---
# The context page lists every user of a value object

Issue #112. On the second signoff head `771a44e0`, Claude Opus 5.5 high reproduced that the context page in the VS Code webview, the viewer and the static export computed a value object's holders from the declaring context's aggregates only. On NorthBank's Ledger page AccountNumber read "nothing" although Accounts' `Account` and Ledger's `CustomerLedgerAccount` use it, and Money showed only `JournalEntry` while Markdown (#110) listed users in five contexts. This card is the fix; it is not a review and records no verdict.

## Checklist

- [x] One derived helper in core, `usersOfValueObject` (with `valueObjectsUsedBy`, moved from `packages/doc` and `packages/pages`), returns domain objects: each aggregate whose entities type the value or relate to it, each value object whose attributes type it or whose relations target it, and each schema whose attributes type it, once each, in workspace context order and within one context aggregates, value objects, schemas. A kind that only specialises the value is not a user. No schema or validator change
- [x] Markdown's Used by column and pages' context-page column both read it, so they cannot drift; Markdown formats links and `(value object)` / `(schema)` marks, pages renders lockups and a kind keyword. A foreign user is written `Context / Name`
- [x] The pages column says "Used by"; "nothing" appears only for a value with no user anywhere (NorthBank's `NominalLedgerAccount` still says it)
- [x] A value object that only relates to the value now counts in Markdown too, which #110 missed; unit case in `packages/core/src/value-object-users.test.ts` with a kind that does not count
- [x] Browser regression in `packages/pages/e2e/northbank-kernel-ownership.spec.ts`, viewer and export: Ledger's AccountNumber and Money rows name and link foreign and nested users and never say "nothing". It fails on the `771a44e0` ContextPage and passes now
- [x] `ValueObjectPage`'s "Used as a type by" stays as it is: it lists attributes, which is what it says
- [x] Generated Markdown and the five models' pinned diagnostics are unchanged by a rebuild

## Gates

- [x] Focused: core (1052 tests), doc (47), pages unit (1005), pages e2e for the NorthBank file, `svelte-check`, biome
- [ ] `bash scripts/verify-all.sh` on the integrated head (the lead; not run here)

## Journal

- **claude** (2026-10-01T00:30:00Z): Picked up from `771a44e0`. The page lie was a second, local copy of the holder rule in `ContextPage.svelte`; Markdown had its own in `packages/doc`. Both now call core. The first e2e draft asserted no "nothing" anywhere in Ledger's table, which was wrong: `CustomerLedgerAccount` and `NominalLedgerAccount` have no users. The test now asserts the two named rows and that `NominalLedgerAccount` still says it. To show the old page fails, I rebuilt with the `771a44e0` ContextPage and ran the file: both hosts failed on the AccountNumber link; with the new page all ten pass. No agents, reviewers, push, PR or full gate were run.
