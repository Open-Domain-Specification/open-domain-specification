---
column: doing
labels: [frontend, docs]
priority: high
agent: lead
live: false
status: Partial baseline; remaining visual coverage blocked on browser UI access
progress: 85
updatedAt: 2026-09-05T17:08:02.807787+00:00
---
# Designer baseline sweep of ODS

User-requested baseline across extension/shared pages: visual consistency, accessibility, interaction and error states. Findings become deduplicated RepoDoc tickets; no production fixes in this pass. Baseline SHA: 6ec06edc0aa6b1db920a4c962170a8f8ac83e92d; active WIP, not release certification.

## Checklist

- [ ] the design reviewer visual and user-journey review
- [x] the accessibility reviewer accessibility and interaction review
- [x] Verify findings, deduplicate existing cards and raise tickets
- [x] Record tested coverage and limitations

## Comments

- **lead** (2026-09-05T16:15:19.566227+00:00): Coordinating review using docs/team/qa/README.md:1 and docs/bots/design/ (deleted 2026-09-07)manual-regression-review.md:1. Updated Fable Codex roles to Astra before dispatch; upstream generator tests 20/20 and typecheck pass.

- **lead** (2026-09-05T16:22:25.868670+00:00): Raised boards/vsc-extension/84-unsafe-markdown-link-schemes.md:1 and boards/vsc-extension/85-import-status-accessibility.md:1 from the accessibility reviewer findings; independently reproduced unsafe Markdown output. Baseline unit tests 13/13 and svelte-check 0 errors/0 warnings. Designer reports still in progress.

- **lead** (2026-09-05T16:30:56.598836+00:00): the accessibility reviewer report complete at docs/bots/design/ (deleted 2026-09-07)2026-09-05-the accessibility reviewer-baseline.md:1; parent reran the accessibility review (report deleted 2026-09-07)accessibility.probe.test.ts:1 (7/7). Raised distinct cards84–91; the optional health aria-controls suggestion is not treated as a confirmed bug. the design reviewer visual sweep remains active.

- **lead** (2026-09-05T17:08:02.807787+00:00): Eight distinct issues raised in cards84–91; existing fullscreen card14 and navigation card86 enriched with the design reviewer native observations. Remaining visual/AT coverage is explicit in boards/vsc-extension/92-complete-visual-baseline-coverage.md:1. Keeping this card incomplete; no human sign-off or completed full sweep implied.
