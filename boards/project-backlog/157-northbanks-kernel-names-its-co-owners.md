---
column: done
labels: [ddd, docs, bug]
priority: high
agent: claude
live: false
clean-code-swept: true
updatedAt: 2026-10-02T23:42:13Z
---
# NorthBank's shared kernel names the teams that co-own it

Issue #107. A reader of NorthBank's model can see that Accounts and Ledger co-own Money and AccountNumber, and that Payments, Cards, Lending and Reporting use them without owning them. The interview names the two owners (`models/northbank/DISCOVERY.md:64-65`); the model had invented a Shared Kernel Team and context and given four consumers a shared-kernel relationship with it. First correction of the model-finality work: reference-model fidelity, with no metamodel construct added unless the pairwise shape fails. Decision 16 is amended, not rewritten. Card 156 is reserved for parked PR #106.

## Checklist

- [x] Test decision 16's pairwise kernel plus directed borrowing against the validator; report the exact blocker before adding any construct
- [x] NorthBank: Money and AccountNumber in Ledger, `accountsBC.sharesKernelWith(ledgerBC)`, the invented team, context and six edges gone; consumers borrow over directed relationships, with source-silent use claims marked as the model's assumptions
- [x] `DISCOVERY.md`: an appended revision explaining the ownership choice and the uncertainty; earlier sections corrected by note, not rewritten
- [x] Decision 16: an appended amendment and a refreshed current position
- [x] Hand-written guidance distinguishes "uses" from "co-owns": interview playbook, preferences, translation table, documentation site; the skill drift test stays green
- [x] Regenerate NorthBank's `.ods` and `docs/` by build; the four surfaces tell the same ownership facts
- [x] Focused semantic assertions on NorthBank's ownership; pinned diagnostics unchanged
- [x] STATUS.md
- [x] Independent OpenAI and Claude reviews of the committed head (the lead) — OpenAI Astra low APPROVED exact reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899`; owner-authorized OpenAI-only exception applies; no Claude approval is claimed.

## Gates

- [x] Focused: northbank 4 of 4 (the new ownership test fails on the `a0e88e97` model); skill 62 (drift test green); apps/docs 24; pages unit 1005 at 100% coverage (one fewer than before because the per-context render case for the removed Shared Kernel context is gone); new Playwright spec 8 of 8 on the viewer and a static export, all 8 failing against the `a0e88e97` JSON; `tsc` and biome clean
- [x] Clean-code sweep: independent audit found nothing above 0.5; the three cheapest findings were fixed anyway
- [x] `bash scripts/verify-all.sh` passed on the integrated model tree at `ff8e8436`, Node 26.8.1, `NODE_OPTIONS` unset: NorthBank 6/6, pages 1005/1005, browser 424 passed and 20 skipped; all package and model suites, ESM imports and generated-schema comparison green
- [x] Independent OpenAI and Claude reviews of the exact committed head (the lead) — OpenAI Astra low APPROVED exact reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899`; owner-authorized OpenAI-only exception applies; no Claude approval is claimed.

- [x] exact-head-landing — `bash scripts/verify-all.sh` passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0): core 1,596, graphviz 50, doc 82, skill 154, Pages 1,056, docs 24, VS Code app 22, host-checker 31; browser 431 passed / 20 documented baseline skips; Pages coverage 100%; exact model pins held. Merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. This is product-candidate evidence, not a gate rerun on this metadata update (lead, 2026-10-02T23:42:13Z).
## Comments

- **claude** (2026-09-30T21:50:00Z): Picked up on `codex/model-fidelity-northbank` from `origin/develop` `a0e88e97`. Tried decision 16's pairwise shape first, in `models/northbank/src/workspace.ts`: Money and AccountNumber declared in Ledger, one `accountsBC.sharesKernelWith(ledgerBC)`, the Shared Kernel Team, the Shared Kernel context and its six shared-kernel relationships removed. Payments and Lending borrow Money as Ledger's customers and Reporting as its conformist over relationships they already had; Accounts borrows both over the new kernel. Cards had no relationship with Ledger, so it gets one conformist relationship, backed only by the borrowing. `validate()` against the model at `a0e88e97` gives an identical list, severity, rule, ref and message: `separate-ways`, `consumable-kind`, `context-serves-subdomain`. Contexts 20 to 19, teams 13 to 12, relationships 38 to 34. No blocker, so no construct.
- **claude** (2026-09-30T22:05:00Z): The model is in `models/northbank/src/workspace.ts:710-735`, where Money and AccountNumber are declared in Ledger and each description says who co-owns it. The kernel and Cards' relationship are at `models/northbank/src/workspace.ts:3273-3313`, and every borrowing comment was repointed. Ledger is the home and Accounts is not, because only Ledger has a borrowing route to the users: Payments and Cards take Accounts' operations through an anti-corruption layer, and Lending has no relationship with Accounts. Nothing the interviews do not say was added. The four users' use of the library is kept as the model's assumption, and the Cards relationship's description says so. The uncertainty is in the appended revision, `models/northbank/DISCOVERY.md` (the card 157 section). §2, §5 and §6 get dated notes, not rewrites. RiverMart's comparison with NorthBank gets a note (`models/rivermart/DISCOVERY.md`, the card 105 section).
- **claude** (2026-09-30T22:05:00Z): The general case, probed in a throwaway workspace: a kernel context with three co-owners and one conformist user validates to exactly one `context-serves-subdomain` warning, on the kernel context. With co-owners only, it validates clean. NorthBank does not need that shape, so it is recorded in decision 16's amendment of 2026-09-30 as a named cost with a reopening condition, and in `packages/skill/skill/references/preferences.md` and `apps/docs/docs/3-core/3-tactical-design.md`. The false guidance is corrected: `interview-playbook.md` (the relationships question and the values question), `translation-table.md` (a new "we use their library" row), `SKILL.md`, `reconciliation.md`, `examples/petstore.md` and `apps/docs/docs/3-core/2-strategic-design.md`.
- **claude** (2026-09-30T22:05:00Z): Surfaces. NorthBank's `.ods` and `docs/` come from a clean rebuild (`npm run clean && npm run build`); only the `.ods` is tracked. In Markdown, the one shared-kernel row is Accounts and Ledger. No page names a Shared Kernel context or team. The Cards relationship says the use is assumed. Money's description names both co-owners. The viewer and the static export are checked by `packages/pages/e2e/northbank-kernel-ownership.spec.ts`. The VS Code webview renders the same pages bundle from the same `.ods`. It was not driven separately for NorthBank, and the real-VS-Code suites were not run for this card. One separate gap, not fixed: Markdown's value-object "Used by" lists only the context's own holders, while the pages' value-object page lists every user. It existed before this change and states no ownership. Commits: `d22b892d` (decision and guidance) and `1fb33de8` (model, record, tests).

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.

- **lead** (2026-10-02T23:42:13Z): Reconciled issue #107 (NorthBank kernel ownership) after its individual acceptance comment was published and the issue closed. Reviewed product SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` was APPROVED by OpenAI Astra low; PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e` and merged tree `6efd1aa35bae524dfce9345210096caeafcef236` equals the reviewed tree. Exact-head local gate passed; actual VS Code hosts passed 16 with four documented optional screenshot skips, keyboard passed 23, checker exit 0 (generic host coverage; no dedicated NorthBank Money assertion). Owner-authorized OpenAI-only exception applies; no Claude approval is claimed. Issue comment: https://github.com/Open-Domain-Specification/open-domain-specification/issues/107#issuecomment-5963166181.
