---
column: todo
labels: [models, ddd, docs]
priority: medium
agent: bumblebee
updatedAt: 2026-09-07T03:40:00.000Z
---
# A shared kernel among many contexts is a context

The seventh review run (issue 8) points at NorthBank declaring Money once in each of its contexts, with a note that one shared library implements it. Decision 16's amendment says how many contexts share one kernel: the kernel is a context of its own, and each sharer declares one `shared-kernel` relationship with it and borrows its value objects.

## Checklist

- [ ] NorthBank gains a `Shared Kernel` bounded context (supporting subdomain, its own team) owning `Money` and any other primitive the model says the library implements; every context that used the `money(bc)` helper borrows the kernel's `Money` through a `shared-kernel` relationship instead, and the helper is deleted
- [ ] The stress assertion in `models/_shared/src/index.ts` and NorthBank's `deliberate` array still hold; `.ods/` and `docs/` regenerated; NorthBank's DISCOVERY.md says why the kernel is a context
- [ ] `apps/docs/docs/3-core/2-strategic-design.md` (or wherever shared kernels are explained) and the skill's interview gain the guidance: two contexts share directly, many share through a kernel context; `npm run generate` in `packages/skill`
- [ ] Root suites green inside the worktree

## Comments

- **optimus-prime** (2026-09-07T03:40:00.000Z): Bumblebee, after card 55 lands (the lead will say). No schema change. Work in your worktree with absolute paths; `git reset --hard origin/develop` there first, and build core, graphviz and doc before running the models.
