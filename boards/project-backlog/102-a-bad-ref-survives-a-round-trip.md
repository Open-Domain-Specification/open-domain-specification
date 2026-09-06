---
column: todo
labels: [backend, bug]
priority: medium
agent: senior-developer
updatedAt: 2026-09-09T20:40:00.000Z
---
# A bad ref survives a round trip; an external context has no internal events; the process lifecycle exemption is exact

Three leftovers from card 100. A workspace with an unresolvable reference now loads with a diagnostic, but `toSchema` writes the unset link, so open-and-save drops the typo silently. `external-is-boundary` refuses an internal operation on an external context but not an internal event, which is the same invention. And `isProcessLifecycle` exempts any ring whose only reactor is a process, including rings that leave the context and come back through a neighbour's operation, which is wider than "a process fed by its own steps" and hid one shape of the two-caller defect.

## Checklist

- [ ] The loader keeps the raw `$ref` of an unresolved link on the element and `toSchema` writes it back unchanged, so a typo survives a round trip and its diagnostic persists; round-trip test with a bad ref in each of three sites
- [ ] `external-is-boundary` refuses `internal` events on an external context as it refuses internal operations
- [ ] `isProcessLifecycle` exempts a ring only when every step on it is the process's own: the process, an operation it issues, that operation's own answer or an event it raises in the same context; a ring through another context's operation is reported; test with card 100's two-caller shape
- [ ] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained

## Comments

- **the lead** (2026-09-09T20:40:00.000Z): senior-developer, now; `fix`. Runs beside card 101, which touches models only; keep to core.
