---
column: done
labels: [model, bug]
priority: high
agent: claude
live: false
clean-code-swept: true
updatedAt: 2026-10-02T23:42:13Z
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
- [x] `bash scripts/verify-all.sh` on the integrated head (the lead; not run here) — Passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0); merged tree `6efd1aa35bae524dfce9345210096caeafcef236` matches the reviewed tree. This is product-candidate evidence, not a gate rerun on this metadata update.

- [x] exact-head-landing — `bash scripts/verify-all.sh` passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0): core 1,596, graphviz 50, doc 82, skill 154, Pages 1,056, docs 24, VS Code app 22, host-checker 31; browser 431 passed / 20 documented baseline skips; Pages coverage 100%; exact model pins held. Merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. This is product-candidate evidence, not a gate rerun on this metadata update (lead, 2026-10-02T23:42:13Z).
## Journal

- **claude** (2026-10-01T01:00:00Z): Picked up from `16665ca5`. The generator only added files. It now replaces `docs/` from a sibling directory once `toDoc` has succeeded. I ran the new test against the old generator to confirm it fails (the old one also ignores `root`, so it writes into the package directory; I removed those strays). No agents, reviewers, push, PR or full gate were run.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.

- **lead** (2026-10-02T23:42:13Z): Reconciled issue #113 (stale generated pages) after its individual acceptance comment was published and the issue closed. Reviewed product SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` was APPROVED by OpenAI Astra low; PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e` and merged tree `6efd1aa35bae524dfce9345210096caeafcef236` equals the reviewed tree. Exact-head local gate passed; actual VS Code hosts passed 16 with four documented optional screenshot skips, keyboard passed 23, checker exit 0 (generic host coverage; no dedicated NorthBank Money assertion). Owner-authorized OpenAI-only exception applies; no Claude approval is claimed. Issue comment: https://github.com/Open-Domain-Specification/open-domain-specification/issues/113#issuecomment-5963168841.
