---
column: review
labels: [docs]
priority: medium
agent: developer
live: false
clean-code-swept: true
updatedAt: 2026-09-06T17:10:00.000Z
---
# The docs carry the full price

The architect's twelfth round read the docs site and the installed skill alone and found they name most refused shapes and why, and six costs, and not the rest: that `identifies` is opt-in and a denormalised copy is invisible (decision 14); that specialisation inside one aggregate repeats attributes across product lines (22); that versions are names and the reopening point is three concurrent versions (15); that multiplicity is read from the source only; that order and timing are not modelled; that `raises` says may, not which combination; that a consumption's ref changes when a second consumption of the pair appears (26); that a kernel's co-owners are not listed and a context has one team (16); that lifecycle states and transitions are prose and a deadline is an interval from a trigger, never a data-fixed date (15, 23); that inside a context `references` and `identifies` are two forms of one dependency (14); and that an answer routing one hop across a boundary is an error, not a caveat. Runs after card 126, which changes the last of these.

## Checklist

- [x] `apps/docs/docs/3-core/3-tactical-design.md` "What the model leaves out on purpose" carries every cost above in one sentence each, with the decision number; `packages/skill/skill/references/preferences.md` mirrors it
- [x] The aggregate page of the docs says where a lifecycle lives (a status attribute whose values are the author's text, invariants naming the operations that move it, no transition table) and the process page says a deadline is relative to its trigger
- [x] The clinic's appointment deadline no longer holds a data-fixed date in `after` ("until the day of the appointment"); the honest shape is a scheduled operation or a Clock event (decisions 23 and 28), and `DISCOVERY.md` says which; the clinic stays at zero diagnostics
- [x] `bash scripts/verify-all.sh` green

## Gates

- [x] clean-code-swept — read every touched file back after editing, no drive-by refactors, no dead code left behind (developer, 2026-09-06T17:10:00.000Z)

## Comments

- **developer** (2026-09-06T16:20:00.000Z): Read the card, decisions 14, 15, 16, 22, 23, 26 and 28's current positions, and card 126's diff on `apps/docs/docs/3-core/3-tactical-design.md` (the "An answer stops at the boundary" bullet is already the corrected wording, so the card's eleventh item needs no new sentence). Ten of the eleven items in the card's description are new costs; wrote one sentence each, bolded lead-in matching the section's existing voice, in `apps/docs/docs/3-core/3-tactical-design.md:69-104`, citing decision 14 (twice), 15 (four times, one jointly with 23), 16, 22, 23 and 26. Three items (`multiplicity read from source only`, `order and timing not modelled`, `raises says may`) carried no decision number in the card text; I traced them to decision 15's own sections ("A relation carries one multiplicity, read from the source", the process `on` any-of/timing prose, "`raises` lists what an operation may raise") and decision 23 for the order/timing one, and cited those.
- **developer** (2026-09-06T16:35:00.000Z): Mirrored the same ten costs into `packages/skill/skill/references/preferences.md:33-71`, in that file's own voice (no decision numbers there, matching its existing six bullets).
- **developer** (2026-09-06T16:45:00.000Z): Added the lifecycle sentence to the aggregate/invariants section of `apps/docs/docs/3-core/3-tactical-design.md` (a `status` attribute whose values are the author's text, an invariant naming the operations that move it, no transition table) right after the existing "names the operation that makes the transition" paragraph, and the deadline-is-relative sentence to the Processes section, both in `apps/docs/docs/3-core/3-tactical-design.md`.
- **developer** (2026-09-06T17:00:00.000Z): For the clinic's deadline: read the scheduler interview in `models/clinic/DISCOVERY.md:79-102` — the appointment's date is data the `Clinic Session` entity already holds (a specific, known-in-advance instance date), not a shared calendar boundary, so a `Clock` external context (decision 28's `DayEnded`/`MonthClosed` pattern, for a tick every context shares) was the wrong shape; the scheduled-operation reading (decision 23's fourth amendment; decision 28's note of 2026-09-08 second, and RiverMart's `ExpireAuthorisations` precedent at `models/rivermart/src/workspace.ts:1669-1685`, which is the mirror case — a genuine interval stays a process deadline, a data-fixed date does not) fits. Removed the `addDeadline` call and added `Mark Appointment Day Reached` (operation) and `Appointment Day Reached` (event) on the `Booking` aggregate in `models/clinic/src/workspace.ts:757-799`, and changed the process to `ends(bookingCancelledEvent, appointmentDayReachedEvent)` at `models/clinic/src/workspace.ts:832-840`. Added a revision note to `models/clinic/DISCOVERY.md` explaining the choice and ruling out the Clock shape. Rebuilt the clinic (`npm run build` under `models/clinic`, via `lerna run build` for core/model-tools first): "Outpatient Clinic: 0 diagnostic(s)".
- **developer** (2026-09-06T17:10:00.000Z): Ran `bash scripts/verify-all.sh` end to end — no extension host running, port 4173 free. All stages green including clinic's 7 tests and the full pages e2e suite (297 passed). `git status` shows only `apps/docs/docs/3-core/3-tactical-design.md`, `packages/skill/skill/references/preferences.md`, `models/clinic/src/workspace.ts`, `models/clinic/DISCOVERY.md` and the clinic's tracked generated output (`.ods`, `docs/`) changed — no other model touched. Moving to review.
