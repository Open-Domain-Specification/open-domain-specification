---
status: Accepted
date: 2026-09-02
---
# Decision 03 — Context relationships are explicit, not inferred per consumable

## Context

Relationship patterns were split between `ConsumablePattern` on the provider
side (`open-host-service`, `published-language`, `shared-kernel`,
`customer-supplier`) and `ConsumptionPattern` on the consumer side
(`conformist`, `anti-corruption-layer`, `customer-supplier`, `partnership`,
`separate-ways`). Several of these are properties of the relationship
between two contexts, not of a single consumable: partnership and shared
kernel are symmetric, customer-supplier is a flavour of upstream/downstream
that appeared on both sides, and separate-ways means *no* integration, so it
cannot sensibly sit on a consumption. See board card 05.

## Decision

- `WorkspaceSchema.relationships` is an array of `ContextRelationshipSchema`.
- Directed relationships (`upstream-downstream`, `customer-supplier`) carry
  `upstream`, `downstream`, `upstreamRoles` (`open-host-service`,
  `published-language`) and `downstreamRoles` (`conformist`,
  `anti-corruption-layer`).
- Symmetric relationships (`partnership`, `shared-kernel`, `separate-ways`)
  carry `participants: [{ $ref }, { $ref }]`.
- `Consumable.pattern` narrows to the upstream roles and becomes optional;
  `Consumption.pattern` narrows to the downstream roles and becomes optional.
- The context map is derived from explicit relationships first. Consumptions
  between two contexts with no explicit relationship produce an *implied*
  upstream/downstream edge whose roles are collected from the consumable and
  consumption patterns.
- The DSL exposes `bc.upstreamOf`, `bc.downstreamOf`, `bc.partnerOf`,
  `bc.sharesKernelWith` and `bc.separateWaysFrom`, all delegating to
  `workspace.addRelationship`.
- No backwards compatibility is provided for the old pattern values.

## Consequences

- Breaking schema change; `odsVersion` bumps.
- Contexts with no consumptions now still appear on the context map.
- Graphviz renders symmetric relationships without arrowheads and
  upstream/downstream with an arrow from upstream to downstream. Implied
  edges are dashed.

## Amendment (2026-09-07)

A consumable carries one `pattern`, how it is offered. A published language is not a second way of offering it but the data shape it carries, so a crossing consumable with a `schema` backs a `published-language` role on the relationship, and an open-host-service operation with a schema backs both roles at once. The `relationship-roles-backed` rule reads it that way (card 53).

## Amendment (2026-09-07, second)

An identity attribute naming another context's entity (decision 14) implies an edge exactly as a consumption does, drawn dashed under «id», and `relationship-declared` (card 70) warns on either crossing until the relationship is written. A symmetric relationship satisfies it in either direction; separate-ways does not, because the crossing contradicts it.

## Amendment (2026-09-09)

Upstream is who dictates the model, not who provides the consumable. A card processor that calls the bank in its own format is upstream of the bank though the bank provides the operation; the bank is downstream with an anti-corruption layer that translates the caller's language at its boundary. The rules assumed provider equals upstream, and NorthBank hid the mismatch by inverting the call into an event. `schema-context` now lets a downstream carry the upstream's schema behind an anti-corruption layer as well as as a conformist, and `relationship-roles-backed` backs an upstream role by any schema the downstream carries, in a request, a return or a rejection (card 98).
