---
column: review
labels: [model, bug]
priority: high
agent: claude
live: false
status: Integrated implementation and local audits complete; final clean-head gate, signoff and merge pending
progress: 90
clean-code-swept: true
updatedAt: 2026-10-01T14:42:37Z
---
# The context page lists every user of a value object

Issue #112. On the second signoff head `771a44e0`, Claude Opus 5.5 high reproduced that the context page in the VS Code webview, the viewer and the static export computed a value object's holders from the declaring context's aggregates only. On NorthBank's Ledger page AccountNumber read "nothing" although Accounts' `Account` and Ledger's `CustomerLedgerAccount` use it, and Money showed only `JournalEntry` while Markdown (#110) listed users in five contexts. The fourth signoff round found that the shared lookup still omitted kinds and parent-typed holders of a kind; the validator counted specialisation as borrowing while the reading surfaces could say nothing uses it. This card covers both defects.

## Checklist

- [x] One derived helper in core, `usersOfValueObject` (with `valueObjectsUsedBy`, moved from `packages/doc` and `packages/pages`), returns domain objects: each aggregate whose entities type or relate to the value, each value object whose attributes type it or whose relations target it, and each schema whose attributes type it, once each, in workspace context order and within one context aggregates, value objects, schemas. A kind that specialises the value is also a user, even without an attribute; a holder typed by a parent or kind is named with `through` and the exact type it holds. Inherited attributes and relations count. No schema or validator change
- [x] Markdown's Used by column and pages' context-page column both read it, so they cannot drift; Markdown formats links and `(value object)` / `(schema)` marks plus `(kind)` and `(through …)`, pages renders corresponding lockups and keywords. A foreign user is written `Context / Name`
- [x] The pages column says "Used by"; "nothing" appears only for a value with no user anywhere. NorthBank's `NominalLedgerAccount` now names `JournalEntry` through `LedgerAccount`
- [x] A value object that only relates to the value counts in Markdown too, which #110 missed. Core tests cover relation, borrowed kind, holder of a kind, holder of a parent and inherited attributes
- [x] Browser regression in `packages/pages/e2e/northbank-kernel-ownership.spec.ts`, viewer and export: Ledger's AccountNumber and Money rows name and link foreign and nested users; LedgerAccount names both kinds, and each kind names JournalEntry through LedgerAccount. The earlier test's assertion that NominalLedgerAccount was unused is reversed. It fails on the `cb3ebb0a` ContextPage and passes now
- [x] `ValueObjectPage`'s "Used as a type by" stays attribute-only and now says "directly" in the empty message; parent-typed holders appear in the context page's broad Used by list
- [x] Generated Markdown shows LedgerAccount's kinds and each kind's parent-typed holder; the five models' pinned diagnostics are unchanged by a rebuild

## Gates

- [x] Focused: core (1052 tests), doc (47), pages unit (1005), pages e2e for the NorthBank file, `svelte-check`, biome
- [ ] `bash scripts/verify-all.sh` on the integrated head (the lead; not run here)

## Journal

- **claude** (2026-10-01T00:30:00Z): Picked up from `771a44e0`. The page lie was a second, local copy of the holder rule in `ContextPage.svelte`; Markdown had its own in `packages/doc`. Both now call core. The first e2e draft asserted no "nothing" anywhere in Ledger's table, which was wrong: `CustomerLedgerAccount` and `NominalLedgerAccount` have no users. The test now asserts the two named rows and that `NominalLedgerAccount` still says it. To show the old page fails, I rebuilt with the `771a44e0` ContextPage and ran the file: both hosts failed on the AccountNumber link; with the new page all ten pass. No agents, reviewers, push, PR or full gate were run.
- **lead** (2026-09-30): The fourth signoff round on exact head `cb3ebb0aa9d3b99d574d5b06700f49dfe406a2f5` was Astra APPROVE and Opus BLOCK. Opus reproduced a specialisation-only borrower whose parent reads unused, and NorthBank's two ledger account kinds read unused although `JournalEntry` holds their parent. The lead accepts this as a blocker: the checker treats specialisation as borrowing, so a broad Used by column cannot call it nothing. Core tests first failed on the old helper in three cases. With the hierarchy correction, core (5), NorthBank Markdown (7), viewer/export browser (10), Svelte check and format pass. The corrected full gate and exact-head reviews remain.
- **lead** (2026-10-01): The fifth signoff round on exact head `efc19483a078bcf6af06ebe7035f034ef0a8b574` was BLOCK from both reviewers. Opus reproduced the reverse direction: Accounts declares Money and holds it, Cards is its conformist and declares Fee as a kind of Money, but Fee's Used by listed Accounts / Account through Money. Accounts cannot borrow Fee. Core now shares the validator's `mayBorrowFrom` predicate, allowing a parent-typed holder only in the kind's context or a context that may borrow it. The core test asserts the negative and a positive Accounts/Overdraft kind used by Cards; Markdown and the Svelte context page assert the displayed direction. These focused tests pass; the full gate and new reviews remain.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.
