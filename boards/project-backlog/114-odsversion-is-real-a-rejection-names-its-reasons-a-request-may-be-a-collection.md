---
column: todo
labels: [backend, docs]
priority: medium
agent: senior-developer
updatedAt: 2026-09-10T12:30:00.000Z
---
# `odsVersion` is real; a rejection names its reasons; a request may be a collection; the `by` comment tells the truth

The architect's ninth round found one thing broken and three costs the model's own reasoning cuts against. Five decisions say `odsVersion` bumps on a breaking change; it has been `1.0.0` since the first commit and nothing reads it, so a file written against an older metamodel fails as `unresolved-ref` or rule errors rather than as a version mismatch. An answer is keyed by shape, so an acquirer's one error shape with a `code` field gives a process one rejection branch whatever the code says, and the only alternative, one schema per reason, misstates the contract the way decision 13 refused for lists. A `returns` may be a collection and a request may not, though decision 13's argument is the same for both; petstore leaves `createUsersWithList` out for that reason. And the `by` doc comment on `ConsumptionSchema` says "optional detail, not a call graph" while the rule asks for it wherever the consumer has two operations. Decisions 13, 25 and 29 are amended. Runs after card 113, which touches the same files.

## Checklist

- [ ] `ODS_VERSION` constant in core, set to `2.0.0`; `toSchema` writes it; the loader reports `ods-version` (error) when the file's `odsVersion` is missing or its major differs, with fix text saying to regenerate from the DSL, and still loads what it can (decision 29); every model's `.ods` output regenerated; the JSON schema's `odsVersion` description says what the number means and who bumps it; docs and skill references follow
- [ ] `rejects` entries may carry `reasons?: string[]`, the enumerated outcomes of that shape as the contract states them (ISO 8583 response codes, a provider's decline codes); an answer `<op>/rejects/<schema>/<reason>` exists for each, alongside the shape-level answer that hears them all; DSL `op.rejected(schema, reason?)`; the reaction walk, `answers-by-origin`, `consumable-kind` and the flow map treat a reason answer as a rejection of that operation; the JSON round trip keeps it
- [ ] `ConsumableSchema.schema` becomes `{ $ref, many? }` like `returns`; DSL `schema: { of, many }` or the equivalent already used for `returns`; pages and docs that print a payload say "list of" the way they do for answers; petstore models `createUsersWithList` with a `many` request
- [ ] `ConsumptionSchema.by` doc comment says what the rule asks: absent means the whole consumer, which is fine for a consumer with one operation, and a consumer with two or more names which of them makes the call so the reaction walk has its causal link (decision 21)
- [ ] RiverMart's external payment provider states the decline outcomes of `hold_funds` as reasons and the payments process branches on one of them; `apps/docs/docs/3-core/4-validation.md` rows; tests for each item
- [ ] `bash scripts/verify-all.sh` green

## Comments
