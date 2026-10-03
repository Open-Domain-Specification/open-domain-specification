---
column: doing
labels: [bug, frontend]
priority: high
agent: opus-coordinator
live: true
clean-code-swept: true
status: Source, actual hosts and quality accepted; clean landing gate next
progress: 80
updatedAt: 2026-10-03T03:05:41.463361+00:00
---
# Released drag geometry is stable

Issue #103. As a maintainer, I need the same committed browser check to give a reliable geometric result after a node is released. Existing evidence suggests an off-canvas drag and variable auto-pan frames invalidate fixed screen-width expectations. Reproduce or substantiate the cause, preserve released-node containment and show post-release stability. Separate PR from #106 unless a shared product cause is demonstrated.

## Checklist

- [x] Bounded current-source/trace evidence distinguishes auto-pan, refit and snap-back
- [x] Correction relates cluster geometry to actual released-node displacement and containment
- [x] Post-release node and cluster settle without a blind sleep or weaker arbitrary width threshold
- [x] Focused repeats demonstrate reliable geometry; actual results and limits recorded
- [x] Independent quality scrutiny accepted; no source model or diagnostic pin changes

## Gates

- [ ] Unmodified scripts/verify-all.sh on clean final candidate before landing
- [ ] Separate PR merged and actual #103 acceptance verified before issue closure

## Comments

- **lead** (2026-10-03T00:47:50.366619+00:00): Picked up #103 after Milestone 2 records a647c6e0 passed their final local gate and landed on develop. Live backlog stays 21. Opus5.5 coordinates Sonnet5.5; initial code ownership is only packages/pages/e2e/diagrams-sketch.spec.ts. No model or UI behavior change is authorized without concrete evidence and primary acceptance. Source packet /Users/jonathanturnock/.codex/ods-delivery/milestone-03/preparation/report.md and lead-acceptance.json bound the investigation and preserve future #106 canonical-route/19-context acceptance.

- **lead** (2026-10-03T01:23:03.494416+00:00): Scope B proved a release-time stale relative-position rewrite against the refitted parent. Its candidate fixes the release jump; original and no-follow mutation fail, corrected focused cases pass 30 repetitions each (60 passed, Node26). This is partial progress: held-pointer auto-pan oscillation remains, and moving inward before release does not prove it fixed. Scope C authorises one typed SvelteFlow-context child if required plus the existing source/test paths, with bounded causal A/B and genuine edge-zone acceptance. No new ticket, landing, issue closure or Astra review. Evidence: external milestone-03/drag-103/product/ and lead-scope-b-assessment.json; active coordinator session11233.

- **lead** (2026-10-03T01:39:27.585808+00:00): Scope C proved that refitting moves the parent origin while the library keeps a stale relative drag position, dropping every third pan event. Synchronising the event position after the refit corrects both held-edge oscillation and release jump; the earlier release-cache workaround is removed. Original and partial variants fail, no-follow mutation fails containment, final two cases pass 30 repetitions each (60 passed, Node26). Source correction accepted for validation, not landing; bounded directional/nested and actual reader-host proof plus eight-principle Sonnet scrutiny run in sole coordinator session53030. Undocumented provider alias and measured1.5px release tolerance are explicit review risks. No new file retained, no Astra/CI/closure.

- **lead** (2026-10-03T01:55:39.420253+00:00): Actual VSCode1.96.4 webview and matched-browser validation found3-5px catch-up after auto-pan stops while the pointer remains held, specific to sole-member cards clusters dragged right/down. Top-left, shared-member and sketch controls pass. ScopeC is not generally landing-ready; no tolerance increase accepted. Quality stage did not start. Five-whys recorded in external retrospective-validation.json; scopeD requires the complete drag-state contract before a further correction and counts every browser invocation in a six-slot ledger. Active51388, no newticket/CI/Astra/closure.

- **lead** (2026-10-03T02:35:47.112798+00:00): State-contract proof supersedes the earlier visible-catch-up/camera-stop interpretation: the3–5px reading is a stale-parent-measurement clamp corrected by ResizeObserver in the same frame before paint; camera stops at pointer-up. Original source separately paints a real release jump, corrected by retained refitDrag cache synchronisation. A measured-cache helper passed90 focused cases but primary selects the proved direct c2 correction: free-map nested clusters have no parent extent, fixed-map constraints remain. Source ownership extends to flow-nodes.ts and its tests; remove the measured helper. Active65000 then actualviewer/exportHTTP-file/VSCode and finaleightprinciplequality. No Astra/CI/landing/closure. Evidence: state-contract/ and lead-direct-extent-decision.json.

- **lead** (2026-10-03T03:05:41.463361+00:00): Final direct C2 source accepted: 30 focused repeats, four tracked tests and 13 actual viewer/export HTTP/file/VS Code cases pass on the Node26 runner, with zero measured release displacement. Eight independent Sonnet quality reports plus the comment-only focused recheck leave no introduced score above 0.5. Canonical Opus/Sonnet 5.5 runtime IDs verified, coordinator exit 0. Prior camera-stop/visible-catch-up interpretation is superseded; removed measured-cache variant is not current proof. Evidence: /Users/jonathanturnock/.codex/ods-delivery/milestone-03/drag-103/direct-extent/validation-summary.md and quality-close/report.md. Landing gate, PR, merge and issue closure remain pending.

- **lead** (2026-10-03T03:12:24.997560+00:00): First clean gate e93fc8c9 exited 1 at pages branch coverage 99.96%, before browser stage. The uncovered fixed-map guard in packages/pages/src/lib/organisms/InteractiveDiagram.svelte:146 is now covered by a real-drag regression in packages/pages/src/lib/organisms/InteractiveDiagram.test.ts:448: node moves, all cluster styles stay unchanged, and removing the guard makes it fail. Sonnet and Opus verify 1,058 tests and 100% coverage under Node26; test-only delta reviewed against all eight principles, no introduced score above 0.5. Source/e2e/thresholds unchanged. Full corrected-candidate gate next; no merge or closure yet. Evidence: /Users/jonathanturnock/.codex/ods-delivery/milestone-03/drag-103/coverage-fix/coordinator-acceptance.md.
