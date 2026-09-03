---
column: review
labels: [ddd, backend, breaking, frontend, docs]
priority: high
agent: claude
live: false
updatedAt: 2026-09-02T18:30:00.000Z
---
# Consumables plus schemas: collapse events and commands back into provides

Decision 04 left every published event as two objects, an event and an event consumable, and every UI surface shows both. Decision 09 (decisions/09-consumables-plus-schemas.md) returns to the original construct: a node provides consumables and consumes consumables, nothing else. Payload shapes move into a schemas block on the bounded context, consumables gain internal, schema and raises, and policies reference consumables.

## Checklist

- [x] Core schema: remove DomainEventSchema, CommandSchema, events and commands maps, eventRef and commandRef; add DataSchema, BoundedContextSchema.schemas, schemaRef, Consumable internal, schema and raises; policy on and then reference consumables
- [x] Core model: DataSchema class as AttributeOwner, Consumable.raises, Policy.on and then over consumables, remove DomainEvent and Command classes and helpers, lookups and namespace updated
- [x] Core loader, validation rules (internal consumable consumed across contexts; policy on must be events, then must be operations), flow map over consumables, visitor without visitDomainEvent and visitCommand and with visitDataSchema
- [x] Core tests
- [ ] odsVersion bump, deferred to the next release alongside decision 08
- [x] graphviz flow map over consumables, tests
- [x] doc generator: aggregate and context pages, schemas table
- [x] ods-ui: aggregate and context pages, spotlight, help modals
- [x] docs site: tactical design page, visitor page, example tests
- [x] ods-example-ws: Petstore declares schemas and provides once
- [x] VS Code extension: tree, search, aggregate, context, consumable and policy pages, schema page
- [x] Board card 01 on the vsc-extension board updated for the new member set

## Comments

- **claude** (2026-09-02T18:30:00.000Z): Core: DomainEventSchema, CommandSchema, AggregateSchema.events/commands, eventRef, commandRef, DomainEvent, Command, addEvent, addCommand, publishes, visitDomainEvent and visitCommand removed; DataSchemaSchema, BoundedContextSchema.schemas, schemaRef, DataSchema (AttributeOwner with a consumables getter), BoundedContext.addSchema, Consumable.internal/schema/raisedEvents/raises()/boundedcontext, visitDataSchema added; Policy.events and Policy.commands hold consumables (field names kept because a then property makes objects thenable). Loader links schemas then raises then consumptions. Validation gained internal-consumable and consumable-kind, and role-coherence skips internal consumables. Flow map clusters consumables under their provider. graphviz tests, doc (shared provides table with Internal, Schema and Raises columns, Schemas table on the context page), ods-ui (Provides shows type, internal, pattern, schema, raises; Schemas accordion; spotlight; ProvidesHelp and SchemasHelp replace CommandsHelp and EventsHelp), docs site (tactical design, validation, visitor, flow, index and llm-context pages plus example tests and snapshots), Petstore (schemas per context, events and internal operations provided once, service operations raise the events they cause) and the VS Code extension (Provides group with kind icons and internal marker, Schemas group, search kinds Event/Operation/Schema, aggregate page shows Provides as cards and Integration as the consumable map plus Consumes, context page gains Schemas, consumable page covers payload, raises or raised-by, policies, consumers, schema page replaces event and command pages) all updated. Whole-repo lerna build and test green.
