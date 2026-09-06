---
status: Accepted
date: 2026-09-02
---
# Decision 03 — Context relationships are explicit, not inferred per consumable

## Current position (2026-09-10)

Relationships are explicit on the workspace, directed ones carrying roles and symmetric ones two participants; stable. Since decision 15's amendments of 2026-09-09 (card 103) and 2026-09-10 (card 107), a directed relationship may carry a `name`, two named relationships may join one pair in one direction, and a consumption between such a pair names its `relationship`.

Upstream is who dictates the model, not the provider (amendment of 2026-09-09, card 98). A downstream carries the upstream's schema as a conformist or, behind an anti-corruption layer, only on the consumable the upstream calls (second amendment of 2026-09-09).

A consumable carries one `pattern`. A published-language role is backed by a schema it carries (amendment of 2026-09-07, card 53), by any schema the downstream carries in a request, return or rejection (card 98), or by a borrowed schema or value object (decision 28, card 95).

`relationship-declared` asks for a relationship where a consumption or a borrowed value object crosses (decision 16, card 92), in either direction; symmetric types satisfy it, separate-ways does not (notes of 2026-09-09, card 99). The second amendment's sentence that it warns on an identity crossing no longer holds; see the correction of 2026-09-10 and decision 14's amendment of 2026-09-09 (card 100).

`role-coherence` asks each end for the role its position implies, and nothing where the declared upstream is the caller (card 99); a customer-supplier downstream is a conformist (note of 2026-09-10). A partnership clears a ring of calls between its pair (correction of 2026-09-10, card 104).

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

## Amendment (2026-09-09, second)

Card 98 settled two mechanics the previous amendment left open. An anti-corruption layer lets a downstream carry the upstream's shape only on the consumable the upstream itself calls, the operation where the caller's language arrives and is translated; a wider reading, any consumable of the downstream, would let a context launder a foreign shape into its own events, which `schema-context` exists to refuse. And the downstream's anti-corruption-layer role is backed by that caller-facing shape, since nothing else crosses from an upstream that is the caller.

## Note (2026-09-09)

Card 98 fixed the two rules that carry language across the boundary and left the two that check a relationship's existence and roles still reading direction from the call. `relationship-declared` is satisfied by a relationship in either direction, because the direction is the author's claim about who dictates the model, and `role-coherence` asks each side for the role its declared position implies (card 99).

## Note (2026-09-09, second)

Where the declared upstream is the caller, neither end can hold the role its position implies, because a consumable carries an upstream role and a consumption a downstream one; `role-coherence` asks nothing of either end there and the relationship's own roles, checked by `relationship-roles-backed`, carry the meaning (card 99). Widening both fields to carry either role is a possible later change and is not made here.

## Correction (2026-09-10)

The second amendment said `relationship-declared` warns on an identity crossing; decision 14's 2026-09-09 amendment withdrew that, and the «id» edge is the record. A partnership clears a ring of calls between its two contexts, as the rule's own fix text has always said and the walk now reads (card 104).

## Note (2026-09-10)

`role-coherence` asks every crossing for an upstream role on the consumable and a downstream role on the consumption, so the downstream of a customer-supplier pair that uses the negotiated API through a thin client is asked to call itself a conformist or an anti-corruption layer. It is a conformist: its model follows the API it was given, and negotiation is what the relationship type says, not a third way of integrating. The rule is a warning and the roles live on the relationship where the pair is reversed (architect's ninth round).
