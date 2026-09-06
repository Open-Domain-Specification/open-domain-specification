---
column: todo
labels: [backend, docs]
priority: low
agent: developer
live: true
updatedAt: 2026-09-10T20:10:00.000Z
---
# A rejection the operation also raises is a warning

Card 117's `Offer Slot` rejected with `PatientWaitlisted` and raised an event carrying the same shape, which is a model telling on itself: a rejection says nothing happened (decision 25) and a raised event says something did. Nothing reported it. A warning, `rejection-raised`, says: this operation rejects with a shape it also raises as an event; if something happened, it is the event and not a refusal, drop the rejection; if nothing happened, it is not an event.

## Checklist

- [ ] `rejection-raised` (warning) in the catalogue with summary, why and fix text as above; fires when a `rejects` entry's schema is the payload schema of an event in the operation's `raises`
- [ ] Tests: the clinic's original shape warns; an operation that rejects with one shape and raises an event of another does not; the reference models' diagnostics unchanged
- [ ] `apps/docs/docs/3-core/4-validation.md` row; skill references regenerated; `bash scripts/verify-all.sh` green

## Comments
