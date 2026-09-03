---
column: todo
labels: [infra, docs, backend]
priority: high
agent: dev-opus
updatedAt: 2026-09-03T15:00:00.000Z
---
# Shared test: every generated docsify site is complete and every link resolves

The doc generator has five unit tests on markdown snippets, but nothing checks a generated site as a whole. Each reference model writes a docsify site under `models/<name>/docs` at build time and no test looks at it; the old "every link resolves" test from vsc-extension card 11 died with the generator it covered. Add a shared assertion to `models/_shared` (beside `assertStressTestWorkspace`) that each of the four model test suites calls.

## Checklist

- [ ] `assertDocSite(workspace)` in models/_shared/src/index.ts: run `toDoc`, then check every workspace ref has a page (workspace, domain, subdomain, context, aggregate, service and their leaf sections)
- [ ] Every relative link in every page (petstore has 77 distinct) resolves to a generated file, and every `#anchor` to a heading in that file; external `http(s)` links are skipped
- [ ] `_sidebar.md` lists every `index.md` and `glossary.md` exactly once, in tree order
- [ ] Each model's `workspace.test.ts` gains one `it` calling the helper
- [ ] Root `npm test` green

## Comments

- **lead** (2026-09-03T15:00:00.000Z): Assigned to dev-opus. Fixed by decision: the helper lives in models/_shared/src/index.ts beside assertStressTestWorkspace and takes a Workspace; it runs toDoc in memory (no disk) and inspects the returned file map. Only `.md` files are parsed for links; `.svg` and any `index.html` (card 37 may add one) are link targets, never sources. Anchor matching uses docsify's slug rule (lowercase, spaces to hyphens, punctuation stripped); if a heading form in the generator disagrees with that rule, treat it as a generator bug and ask. Sidebar order = depth-first tree order as the generator emits it. You may choose: how the assertion reports failures (one aggregated message listing every broken link is preferred). Tests that prove it: the four models/*/src/workspace.test.ts each gain one `it`; run `npm test` at the root. Work in your worktree; run `npm ci` there first if node_modules is missing.
