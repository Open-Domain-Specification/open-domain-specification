---
column: todo
labels: [backend, docs, models]
priority: high
agent: senior-developer
live: true
updatedAt: 2026-09-11T05:20:00.000Z
---
# A context modelled at its boundary only; nested unknown fields; a domain service raises its own events

The architect's fifteenth round found the metamodel has no honest state for an owned, coherent context nobody has interviewed yet: every insides-are-knowable rule infers knowability from the absence of `external` or `bigBallOfMud`, so a bank adopting the model for Payments first cannot hold a customer id into its own CRM without inventing the CRM's entities or calling a healthy context a mess, and petstore does the latter (its Identity context is `bigBallOfMud: true` with a discovery note saying it means "modelled at its boundary only"). Decision 28 now names the third kind: `boundaryOnly`. Also: `unknown-field` sees element-level keys only, so `returns: { $ref, reasons, bogus }` loads with no diagnostic and loses both keys on the round trip; and `raises-in-aggregate` walks aggregates only, so a domain service's operation may raise two aggregates' events. Decisions 17, 28 and 29 are amended.

## Checklist

- [ ] `BoundedContextSchema.boundaryOnly?: boolean`: ours (team and subdomain as usual), coherent, modelled at its boundary only; it declares consumables, schemas and value objects and no aggregates, policies, processes or context invariants (`boundary-only-is-boundary`, mirroring `external-is-boundary` with its own message); identities into it name the context or one of its schemas; `event-unraised`, `subscription-backed`, `consumption-by-required`, `aggregate-root` and the other insides rules skip it; `mud-needs-acl` does not apply; a context cannot be two of external, mud and boundary-only; DSL `addBoundedContext(name, { boundaryOnly: true })`; loader, `toSchema`, JSON schema; the context map and the tree draw it with its own stereotype; doc and pages label it
- [ ] Petstore's Identity context becomes `boundaryOnly` with its discovery note corrected; every model's diagnostics otherwise unchanged
- [ ] `unknown-field` reports unknown keys inside `$ref` objects and every other nested object the loader reads (`returns`, `rejects` entries, `schema`, `consumable`, `deadlines`, `relations`, `comments`, `reasons` where an object), with the path; tests for `returns.reasons` and a nested bogus key; the round trip still drops them
- [ ] `raises-in-aggregate` also refuses a domain service's operation raising an aggregate's event; an application service's operation stays the one exemption; test
- [ ] `apps/docs/docs/3-core/4-validation.md` rows; the strategic page's context flags section names the three kinds; skill references regenerated and the interview playbook asks which kind an uninterviewed context is; `bash scripts/verify-all.sh` green

## Comments
