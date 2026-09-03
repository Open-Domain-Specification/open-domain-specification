---
column: todo
labels: [infra, docs, backend]
priority: high
updatedAt: 2026-09-03T13:40:00.000Z
---
# Shared test: every generated docsify site is complete and every link resolves

The doc generator has five unit tests on markdown snippets, but nothing checks a generated site as a whole. Each reference model writes a docsify site under `models/<name>/docs` at build time and no test looks at it; the old "every link resolves" test from vsc-extension card 11 died with the generator it covered. Add a shared assertion to `models/_shared` (beside `assertStressTestWorkspace`) that each of the four model test suites calls.

## Checklist

- [ ] `assertDocSite(workspace)` in models/_shared/src/index.ts: run `toDoc`, then check every workspace ref has a page (workspace, domain, subdomain, context, aggregate, service and their leaf sections)
- [ ] Every relative link in every page (petstore has 77 distinct) resolves to a generated file, and every `#anchor` to a heading in that file; external `http(s)` links are skipped
- [ ] `_sidebar.md` lists every `index.md` and `glossary.md` exactly once, in tree order
- [ ] Each model's `workspace.test.ts` gains one `it` calling the helper
- [ ] Root `npm test` green
