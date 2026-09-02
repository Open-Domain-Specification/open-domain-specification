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
- `Workspace.fromSchema` migrates legacy patterns: `shared-kernel`,
  `customer-supplier`, `partnership` and `separate-ways` on a consumable or
  consumption become a relationship between the provider's and consumer's
  contexts, and the field is dropped.

## Consequences

- Breaking schema change; `odsVersion` bumps.
- Contexts with no consumptions now still appear on the context map.
- Graphviz renders symmetric relationships without arrowheads and
  upstream/downstream with an arrow from upstream to downstream.
