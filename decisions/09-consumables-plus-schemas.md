---
status: Accepted
date: 2026-09-02
---
# Decision 09 — Consumables are the only behaviour construct; payloads live in schemas

## Context

Decision 04 added domain events and commands as aggregate members beside the
consumables that already modelled what an aggregate or service provides and
consumes. The two layers turned out to be one to one: every published event
exists twice, once as an event and once as an event consumable pointing back
at it, and every UI surface lists both. The reasons for the split were a
payload, internal events, command to event causality, and policies. None of
those needs a second object. What was missing was a place to declare payload
shapes once, the way OpenAPI keeps them under `components/schemas`. This
supersedes decision 04 for events and commands; policies stay as decided.

## Decision

### One construct

- `DomainEventSchema`, `CommandSchema`, `AggregateSchema.events` and
  `AggregateSchema.commands` are removed, together with `eventRef`,
  `commandRef`, `Aggregate.addEvent`, `Aggregate.addCommand`,
  `Aggregate.publishes`, the `DomainEvent` and `Command` classes and the
  `visitDomainEvent` and `visitCommand` visitor methods.
- A consumable is the only thing a node provides. It is typed `event` or
  `operation` as before. An aggregate or service *provides* consumables and
  *consumes* consumables, and nothing else crosses a node boundary.
- `ConsumableSchema` gains:
  - `internal?: boolean`. An internal consumable is raised or handled inside
    its context and is not offered to other contexts. It carries no upstream
    `pattern`, and a consumption of it from another context is a validation
    error. Default is published.
  - `schema?: { $ref }`, the payload shape, pointing into the schemas block.
  - `raises?: { $ref }[]`, on operations, the event consumables the operation
    may raise.
  - `event` and `command` back-links are removed.
- `PolicySchema.on` lists event consumables; `PolicySchema.then` lists
  operation consumables. In the model `Policy.events` and `Policy.commands`
  keep their names but hold `Consumable[]`; a `then` property would make a
  policy thenable, so the DSL methods `on()` and `then()` stay methods only.

### Schemas block

- `BoundedContextSchema.schemas` holds `DataSchema` entries keyed by id:
  `name`, optional `description`, and `attributes` using the existing
  `AttributeSchema`. Referenceable at
  `#/boundedcontexts/<bc>/schemas/<id>`.
- Schemas belong to the context, not the workspace, because a payload is part
  of a context's published language and the same word means different things
  in different contexts. Decision 08 keeps refs to them file-local.
- Entities and value objects keep their inline `attributes`: those describe
  state, not a message. An attribute of a schema may still reference a value
  object as its type, so the two meet through `AttributeSchema.valueobject`.
- A schema may be shared by any number of consumables. The command that
  raises an event and the event itself commonly share one.
- In the model, `DataSchema` implements `AttributeOwner`, so
  `schema.addAttribute` works as it does on entities.

### DSL

```ts
const placed = order.provides("Order Placed", {
	type: "event",
	pattern: "published-language",
	schema: orderSummary,
});
const place = orderApp.provides("Place Order", {
	type: "operation",
	pattern: "open-host-service",
	schema: orderRequest,
}).raises(placed);
const reserved = stock.provides("Stock Reserved", { type: "event", internal: true });
inventory.addPolicy("Reserve on order", { description }).on(placed).issues(reserve);
```

## Consequences

- Breaking schema change; `odsVersion` bumps at the next release together
  with decision 08. No migration is provided.
- Every surface that had separate Events and Commands sections collapses them
  into Provides, with an internal marker where relevant:
  - core: model, loader, lookups (`getEventByRef` and `getCommandByRef` go;
    `getConsumableByRef` and a new `getSchemaByRef` remain), validation
    rules, flow map (event consumable → policy → operation consumable),
    visitor, namespace.
  - graphviz: flow map reads consumables; consumable map is unchanged.
  - doc: aggregate and context pages lose the Events and Commands tables and
    gain a Schemas table on the context page.
  - ods-ui: aggregate page, context page, spotlight and help modals.
  - docs site: tactical design page, visitor page, example tests.
  - example workspace: Petstore declares schemas and provides once.
  - VS Code extension: tree groups, search index, aggregate, context,
    consumable and policy pages; a schema page replaces the event and command
    pages.
- The flow map and policies lose nothing: they now reference the same object
  that the consumable map and the integration tables show.
- A consumable with `internal: true` and `type: "operation"` is a command
  only the context's own policies or application services issue; with
  `type: "event"` it is an event the outside never sees. The words event and
  command remain in prose and labels; they stop being separate objects.
- Rejected: a workspace-level schemas block. It would invite sharing a
  payload across contexts, which is a shared kernel by the back door.
