---
column: review
labels: [model, bug]
priority: high
agent: claude
live: false
status: Integrated implementation and local audits complete; final clean-head gate, signoff and merge pending
progress: 85
clean-code-swept: true
updatedAt: 2026-10-01T14:42:37Z
---
# Stale generated model pages are removed

Issue #113. The second signoff round's Opus report found tracked generated pages for model elements the models no longer have: Petstore's old identity `User` aggregate and Clinic's old `TriageAssessment` service. The Clinic page still said a domain service calls out to Records, contradicting decision 17. `generate()` wrote every `toDoc` entry and removed nothing. This card is the fix; it is not a review and records no verdict.

## Checklist

- [x] `generate()` in `models/_shared/src/index.ts` writes the site to `docs.next` and swaps it in for `docs/` only after `toDoc` has returned, so a removed element leaves no page or SVG and a failed `toDoc` leaves the old site untouched. Nothing outside a model's `docs/` is touched (`DISCOVERY.md`, `.ods/`)
- [x] An optional `root` (default `.`) says which package directory the outputs go under; each model's `build` runs as before
- [x] Regression in `models/_shared/src/generate.test.ts`: an orphan page and SVG planted in a temporary `docs/`, a small workspace generated, and the on-disk file set asserted equal to `toDoc`'s keys, each file's content equal, the orphan gone, `DISCOVERY.md` untouched. It fails on the `16665ca5` generator
- [x] All five models rebuilt through their generators. Deleted, and only these: `models/petstore/docs/boundedcontexts/identity_bc/aggregates/user/{index.md,consumablemap.svg,relationmap.svg}` and `models/clinic/docs/boundedcontexts/triage/services/triage_assessment/{index.md,consumablemap.svg}`. No other tracked file changed, so no current `toDoc` output was removed and the `.ods` output is byte-identical
- [x] The five pinned diagnostic lists are unchanged (0, 2, 4, 3, 0)

## Gates

- [x] Focused: model-tools (12 tests), the five model suites (including the generated-site link checks), `tsc`, biome
- [ ] `bash scripts/verify-all.sh` on the integrated head (the lead; not run here)

## Journal

- **claude** (2026-10-01T01:00:00Z): Picked up from `16665ca5`. The generator only added files. It now replaces `docs/` from a sibling directory once `toDoc` has succeeded. I ran the new test against the old generator to confirm it fails (the old one also ignores `root`, so it writes into the package directory; I removed those strays). No agents, reviewers, push, PR or full gate were run.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.
