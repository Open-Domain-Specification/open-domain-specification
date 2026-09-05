---
column: backlog
labels: [docs, infra]
priority: med
agent: bumblebee-lite
updatedAt: 2026-09-07T04:10:00.000Z
---
# apps/docs has failing snapshot tests that CI never runs

`apps/docs` has three snapshot tests (`doc.example`, `model.example`, `tactical.example`) that fail on a clean tree, stale since card 40 added `comments`, `disposition` and the Health section, and `apps/docs` has no `test` script, so `lerna run test` and CI never run them. Found by card 45.

## Checklist

- [x] `apps/docs/package.json` gains a `test` script (`vitest run`) so the root run and CI include it
- [ ] The three snapshots regenerated from the current output and reviewed line by line for anything that should not be there — out of scope for this card per the 2026-09-07T03:05 comment: `model.example` and `tactical.example` were already fixed under card 49; only `doc.example.test.ts`'s Health section was mine
- [ ] Root `npm test` green with the docs app included — blocked, see comment below

## Comments

- **optimus-prime** (2026-09-06T16:10:00.000Z): Bumblebee-lite, at the end of sprint 01 after card 50 lands, so the snapshots are regenerated once against the final model, not after every card. Do not start before then.
- **optimus-prime** (2026-09-07T03:05:00.000Z): Card 49 moved `apps/docs/tests/*` to context-scoped value objects and re-recorded four inline snapshots that had drifted since cards 47, 48 and 53. `tests/doc.example.test.ts` is still red on the Health section that card 26 added; that one is yours, together with wiring the suite into CI.
- **bumblebee-lite** (2026-09-07T04:10:00.000Z): Fixed `tests/doc.example.test.ts`: added the Health section (Refactor/Tolerated/No comments, card 26) to the expected `e_commerce/index.md`, and added the `index.html` docsify shell that `toDoc` now emits (a top-level key the test's expected object was missing entirely, unrelated to card 26 or 55). Confirmed against the generator's actual current output, not guessed. `apps/docs/package.json` gained `"test": "vitest run"`, matching the plain-vitest convention `packages/core|graphviz|doc|skill` already use. In build order, absolute paths: `packages/core` build clean; `packages/graphviz` build clean; `packages/doc` build clean; `apps/docs` `npx vitest run` — 11 files, 22 tests, all green, including `doc.example.test.ts`.
- **bumblebee-lite** (2026-09-07T04:10:00.000Z): QUESTION for lead — root `npm test` does not verify this worktree. `npx nx show project docs` and `npx lerna list --all --json` both resolve `docs`'s location to `/Users/jonathanturnock/Projects/open-domain-specification/apps/docs` (the main checkout), not this worktree's `apps/docs`, even after `npx nx reset`. `node -e "require('nx/src/utils/workspace-root').workspaceRoot"` prints the main checkout path too. This worktree's `.git` is a gitlink *file* (`gitdir: .../.git/worktrees/agent-...`), not a directory, and the worktree lives nested inside the main checkout's own tree (`.claude/worktrees/agent-...`); nx/lerna's root-finding appears to walk past this worktree's own `lerna.json`/`package.json` to the outer directory that has a real `.git` folder, and then runs `lerna run build`/`test` against the main checkout's files, not mine. Concretely: before my edit, `apps/docs` had no `test` script anywhere, so root `npm test` never ran it (matches the card); after my edit, `npx lerna run test --scope=docs --stream` still reports "No packages found with the lifecycle script 'test'", because it's reading the *main checkout's* unmodified `apps/docs/package.json`. Card 55's ironhide hit the equivalent import-resolution version of this (worked around with `npm install` in-worktree) but root `npm test` itself still targets the wrong tree for orchestration, not just imports. I stopped short of running `npm test` at the root again beyond the one earlier confirmatory pass, since `lerna run build` would write build output (Docusaurus, etc.) into the main checkout, not this worktree, which isn't mine to touch. Per-package verification (above) is everything I can vouch for directly. Is per-package verification acceptable for this card, or is there a known workaround for the worktree's root `npm test` that I'm missing?
