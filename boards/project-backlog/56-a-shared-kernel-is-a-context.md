---
column: done
labels: [models, ddd, docs]
priority: medium
agent: dev
live: false
clean-code-swept: true
updatedAt: 2026-09-05T00:00:00.000Z
---
# A shared kernel among many contexts is a context

The seventh review run (issue 8) points at NorthBank declaring Money once in each of its contexts, with a note that one shared library implements it. Decision 16's amendment says how many contexts share one kernel: the kernel is a context of its own, and each sharer declares one `shared-kernel` relationship with it and borrows its value objects.

## Checklist

- [x] NorthBank gains a `Shared Kernel` bounded context (supporting subdomain, its own team) owning `Money` and any other primitive the model says the library implements; every context that used the `money(bc)` helper borrows the kernel's `Money` through a `shared-kernel` relationship instead, and the helper is deleted
- [x] The stress assertion in `models/_shared/src/index.ts` and NorthBank's `deliberate` array still hold; `.ods/` and `docs/` regenerated; NorthBank's DISCOVERY.md says why the kernel is a context
- [x] `apps/docs/docs/3-core/2-strategic-design.md` (or wherever shared kernels are explained) and the skill's interview gain the guidance: two contexts share directly, many share through a kernel context; `npm run generate` in `packages/skill`
- [x] Root suites green inside the worktree

## Gates

- `clean-code-swept`: swept 2026-09-05, one file touched by the change, `models/northbank/src/workspace.ts`: deleted the now-dead `money(bc)` helper and its import of `type BoundedContext` rather than leave either unused; nothing else was in the way. biome and tsc clean on it.
- `qa-automated`: in build order, inside each package directory with absolute paths, never through lerna/nx from the root (the lead's note, and what the brief asked in place of a root `npm test`). `packages/core` `npm run build` clean. `packages/graphviz` `npm run build` clean. `packages/doc` `npm run build` clean. `models/northbank` `npm run build`: `NorthBank: 3 diagnostic(s)`, exactly its `deliberate` array (`separate-ways` error, `consumable-kind` error, `context-serves-subdomain` warning); `npx vitest run`: 1 file, 3 passed (id/context-count assertion, the shared stress assertion, the docsify round trip); `npx tsc --noEmit` clean. `packages/skill` `npm run generate` then `npx vitest run`: 2 files, 26 passed. `packages/pages` `npm run build` clean; `npx vitest run`: 94 files, 668 passed, including the fixture test that renders every NorthBank page. `npx biome check models/northbank/src/workspace.ts` clean, no fixes.

## Comments

- **lead** (2026-09-07T03:40:00.000Z): the developer, after card 55 lands (the lead will say). No schema change. Work in your worktree with absolute paths; `git reset --hard origin/develop` there first, and build core, graphviz and doc before running the models.
- **dev** (2026-09-05T00:00:00.000Z): Reset the worktree to `origin/develop` (`HEAD` at "docs(team): sprint 01, card 55 shipped, 56 dispatched", on top of "Merge card 55" as instructed), `npm install`. No core changes needed: `AttributeSchema.valueobject` already crosses contexts fine (no gate at all besides `attribute-relation-coherence`, which already skips its `uses`-relation check for a value object from another context), so decision 16's amendment was implementable model-only.
- **dev** (2026-09-05T00:00:00.000Z): `models/northbank/src/workspace.ts`: deleted the `money(bc)` helper; added a `Shared Financial Primitives` supporting subdomain under Platform, a `Shared Kernel Team`, and a `Shared Kernel` bounded context owning `Money` and `AccountNumber` (AccountNumber's own comment already said "part of the shared kernel library"). Accounts, Ledger, Payments, Cards, Lending and Reporting each now alias the kernel's value objects (`const accountMoney = kernelMoneyVO;` etc.) instead of declaring their own, and each declares its own `sharesKernelWith(sharedKernelBC)` relationship (six relationships, matching decision 16's amendment's own example). Removed every `.uses(...)` relation onto the borrowed Money/AccountNumber, since a relation may not cross a context boundary (decision 15) — `attribute-relation-coherence` already treats a cross-context `valueobject` as ref-only for exactly this reason. Folded the old Accounts↔Ledger shared-kernel relationship into the new one: neither owns anything the other doesn't also now borrow from the kernel, so a direct pairwise relationship between them would have nothing left to back it.
- **dev** (2026-09-05T00:00:00.000Z): `models/northbank/DISCOVERY.md`: added the Shared Financial Primitives subdomain to the classification table (section 5), rewrote the context-map bullet on the kernel (section 6), and added `## 10. Revision (card 56)` explaining why the kernel is now a context and confirming the three deliberate diagnostics are untouched. Updated the two "Recorded as" lines (Accounts, Core Banking) that named the old Accounts/Ledger kernel.
- **dev** (2026-09-05T00:00:00.000Z): `apps/docs/docs/3-core/2-strategic-design.md` and `packages/skill/skill/references/interview-playbook.md` (Phase D and Phase E) gain the guidance: two contexts share a kernel directly; when several do, the kernel is a context of its own and each sharer gets its own relationship with it. Ran `npm run generate` in `packages/skill` (touches only the gitignored `src/bundle.generated.ts`).
- **dev** (2026-09-05T00:00:00.000Z): Card moved to `review`, `live: false`. Did not merge develop into this branch, and did not push; ready for the lead's merge. The gates lines carry the counts.
