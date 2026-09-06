---
column: todo
labels: [backend]
priority: medium
agent: developer-lite
live: true
updatedAt: 2026-09-10T17:20:00.000Z
---
# An unknown field is a diagnostic

The loader drops a field the schema does not know and says nothing: a JSON file with `provides` on a value object, or `modules` or `actors` anywhere, loads clean and loses the field on round trip. Decision 29 says a mistake is a diagnostic. The JSON schema already has `additionalProperties: false`; the loader should report what it dropped.

## Checklist

- [ ] The loader reports `unknown-field` (warning) for every field it does not know, with the path and the field name, and still loads the rest; the round trip drops it as now
- [ ] Rule catalogue entry with summary, why and fix ("the model has no such element; see what it has instead"); `apps/docs/docs/3-core/4-validation.md` row; tests for a value object with `provides`, a context with `modules`, a workspace with `actors`
- [ ] `bash scripts/verify-all.sh` green

## Comments
