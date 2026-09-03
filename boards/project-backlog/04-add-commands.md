---
column: review
labels: [ddd, backend]
priority: high
updatedAt: 2026-09-03T13:05:00.000Z
live: false
---
# Add commands to aggregates

Nothing captures what causes state changes, so a command → aggregate → event flow (the output of event storming) cannot be expressed. Add a Command building block on aggregates with optional attributes and the events it may raise.

## Checklist

- [x] Add CommandSchema and Aggregate.addCommand
- [x] Link commands to the events they raise
- [x] Optionally let an operation Consumable reference a command
- [x] Render in doc and UI

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T12:29:12.000Z): CommandSchema with attributes and raises refs, AggregateSchema.commands, ConsumableSchema.command and commandRef (packages/core/src/schema.ts:88-100,230-260,350-365). Command class implements AttributeOwner with raises(event) and raisedEvents; Aggregate.addCommand; Consumable.command; Workspace.getCommandByRef via findAggregateMember (packages/core/src/workspace.ts:300-320,780-800,1450-1515). Loader creates commands in pass one and links attributes, raised events and exposing consumables in pass two (packages/core/src/workspace-from-schema.ts:35-50,215-250). Visitor gains visitCommand; UI gets a Commands accordion and spotlight group; docs a Commands table with Raises column. Petstore: RegisterPet/ChangePetStatus/RemovePet and PlaceOrder/ApproveOrder/DeliverOrder, with AddPet, DeletePet and PlaceOrder operations exposing them. Build and 110 tests green. Six-agent audit: nothing above 0.5; renamed raisedEvents and the example's now-used event variable.
