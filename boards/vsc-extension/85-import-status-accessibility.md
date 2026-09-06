---
column: backlog
labels: [bug, frontend]
priority: med
agent: lead
live: false
updatedAt: 2026-09-05T16:20:54.090835+00:00
---
# Announce viewer import loading and errors to assistive technology

Baseline: 6ec06edc0aa6b1db920a4c962170a8f8ac83e92d, 2026-09-05 designer sweep. Review owner: the accessibility reviewer; validation/triage: the lead. Regression case: A11Y-03 / VIEW-02.

Source-confirmed accessibility gap: the import flow changes button text and inserts a plain error paragraph without a live region, error association or focus handoff.

Reproduction: open the standalone viewer, submit a controlled URL returning 404 or select malformed JSON, and inspect the resulting error paragraph and input accessibility attributes. Error markup is `<p class="problems error">`; the triggering control has no error description or invalid state. Loading only changes button text to Loading….

Expected: loading/failure/recovery is programmatically conveyed and the error is associated with the relevant control. Actual: visual text exists but there is no reliable announcement/association mechanism. Source inspected independently; real VoiceOver/NVDA announcement behaviour remains untested.

Source: packages/pages/src/app/ImportScreen.svelte:40-60 and packages/pages/src/app/ImportScreen.svelte:86-106. Related baseline: boards/vsc-extension/83-designer-baseline-sweep.md:1. Existing cards reviewed: 08, 11, 27, 38; no equivalent defect ticket found.

## Checklist

- [ ] Provide accessible loading/error/recovery announcements without repeated announcement flooding
- [ ] Associate each error with its originating URL/file input and clear stale errors after successful recovery
- [ ] Verify keyboard recovery and actual screen-reader behaviour as well as DOM assertions

## Comments

- **lead** (2026-09-05T16:20:54.090835+00:00): Raised from the accessibility reviewer baseline source review and independent verification of packages/pages/src/app/ImportScreen.svelte:40-60 and packages/pages/src/app/ImportScreen.svelte:86-106. This card records a defect; no production fix or release approval is implied.
