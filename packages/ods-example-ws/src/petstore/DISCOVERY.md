# Swagger Petstore: discovery record

A short record, because the source is an OpenAPI document rather than a room full of
people. The interview playbook was still followed: each phase's question was put to the
spec and to the three imagined teams, and the answers became the model in `workspace.ts`.

## Orientation

"What does this system do, and for whom?" The Petstore v3 spec: pets, store orders,
inventory, users. The workspace keeps the spec's name and homepage.

## Problem space

Two domains. Petstore Commerce holds Catalog (core: the selection is what customers come
for), Sales (core: approving the right order at the right time is the promise), Inventory
(supporting: any correct count will do) and Fulfilment (supporting: a courier could do it).
Identity & Accounts holds Users (generic: an off-the-shelf identity provider would serve).

## Ownership and contexts

- Pet Shop Team: Catalog BC and Inventory BC. Inventory also serves the Catalog subdomain
  because its counts are keyed by the catalogue's statuses; that is the example of a
  context serving two subdomains.
- Orders Team: Sales BC and Fulfilment BC. Its description already said "order taking and
  fulfilment", so the two contexts belong together.
- Platform Team: Identity BC, flagged a big ball of mud for the untyped status and the GET
  login. Modelled at its boundary only.

## Language

"Shipment" and "Consignment" mean the same thing in Fulfilment. "Species" is what some
people call a category. "Stock" is what people call the availability projection, which is
not a source of truth. Each is an alias on a glossary term.

## Integration map

Each relationship type appears exactly once, and the reasoning is written on each:

- Catalog to Sales is customer-supplier: Sales needs availability and gets a say in the
  summary contract, and still protects itself with an anti-corruption layer.
- Sales to Inventory is upstream-downstream: the projection conforms to whatever Sales
  publishes.
- Catalog and Inventory share a kernel: one team, one PetStatus definition.
- Sales and Fulfilment are partners: one team, released together, each issuing the other's
  operations or reacting to its events.
- Identity and Sales go separate ways: orders are anonymous.

## Inside the contexts

Pet is the root of its aggregate, with Category, Tag, PhotoUrl and PetStatus as value
objects and `uses` relations of every cardinality. Order references Pet by identity across
the boundary. Shipment includes DeliveryAttempt, which cannot exist alone, and is the home
of the entity-level invariant and the domain service. InventoryProjection is a projection
modelled as an aggregate. User keeps the legacy shape as found.

## Behaviour

PetApp, OrderApp, InventoryQuery and UserApp are the application services (the API layer);
DispatchPlanner is the domain service. Events are published language with schemas; the
operations that only their own context uses are internal. Three policies: approve an order
when its pet is available (reacting to events from two contexts), plan dispatch on
approval, and deliver the order in Sales when Fulfilment reports delivery (a policy issuing
another context's operation).

## Validation

Zero diagnostics. The petstore is the clean reference; the stress models carry the
deliberate problems.
