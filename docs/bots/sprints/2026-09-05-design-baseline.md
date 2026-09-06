# Design baseline review

User-requested baseline sweep while feature work continues. Main engineering sprint remains unchanged. Baseline SHA: 6ec06edc0aa6b1db920a4c962170a8f8ac83e92d.

| Task | Owner | Scope | Status |
| --- | --- | --- | --- |
| Visual consistency and journeys | the design reviewer (Astra, low) | Shared pages, themes, layouts, diagrams; design report only | partial; browser UI blocked; follow-up92 |
| Accessibility and interaction | the accessibility reviewer (Sol, medium) | Keyboard, semantics, focus, empty/error states; report only | complete; 8 findings, 7 probes |
| Reproduce, deduplicate and ticket findings | the lead | boards/vsc-extension/83-designer-baseline-sweep.md and issue cards | eight issues filed; card14 updated; coverage follow-up92 |

Use disjoint report files; no production edits. Reports return to the lead. Baseline gaps stay explicit, not claimed as passes. All UI-control work is assigned to the design reviewer to avoid competing native app control; the accessibility reviewer uses source and independent local automated checks.

Baseline findings are tracked in VSC Extension cards84–91; source-only motion/theme findings explicitly require browser validation. Upstream the team mapping changed in its local checkout: Fable→gpt-6-astra;20 tests and typecheck pass; not published.

UI blockers: IAB unavailable and native Chrome acquisition stalled; full visual pass remains incomplete. the accessibility reviewer source/component findings complete; the design reviewer native sampled9 families/3 diagram kinds. Root coordination card83 stays incomplete pending92.
