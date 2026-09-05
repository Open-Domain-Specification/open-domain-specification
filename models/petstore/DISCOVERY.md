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
of the entity-level invariant and the domain service. Inventory's availability projection
is InventoryQuery, an application service: a projection is a service that provides a query
operation, not an aggregate with an invented root (decision 15). User keeps the legacy
shape as found.

## Behaviour

PetApp, OrderApp, InventoryQuery and UserApp are the application services (the API layer);
DispatchPlanner is the domain service. Events are published language with schemas; the
operations that only their own context uses are internal. Five policies: approve an order
when its pet is available (reacting to events from two contexts), reserve the pet on
approval and mark it sold on delivery (Sales issuing Catalog's open-host operations, so the
order lifecycle walks the pet lifecycle), plan dispatch on approval, and deliver the order
in Sales when Fulfilment reports delivery (a policy issuing another context's operation).
`ReservePetForOrder` rejects with `PetUnavailable` when the pet is already pending or sold:
nothing happened, so Sales is told the status rather than sent an event.

## Validation

Zero diagnostics. The petstore is the clean reference; the stress models carry the
deliberate problems.

## 9. Peer review

An independent review of the model was taken as a second opinion. Each finding is listed
with the outcome; the model, and where the narrative was at fault this record, were changed
for the accepted ones. The petstore still validates clean.

Accepted

- Cross-context invariant: `ApproveOnlyWhenAvailable` constrained Catalog's `PetStatus`
  from inside `Order`. An aggregate cannot enforce a rule over another context's value.
  Changed: it constrains `OrderStatus` only and says the availability check is a read
  through the ACL (`GetPetSummary`) made by the approval policy.
- Quantity against an individual animal: `Quantity > 0` on an order for one `Pet` with one
  status was a contradiction copied from the v3 schema. Changed: `QuantityPositive` became
  `OneAnimalPerOrder` (quantity is exactly 1) and the `Order` and `Quantity` descriptions
  say why the field is kept.
- Orphaned `pending`: the glossary said a pet becomes pending once ordered, but nothing in
  the model moved it. Changed: Catalog offers `ReservePet` (available → pending) and
  `MarkPetSold` (pending → sold) as open-host operations; Sales issues them from two new
  policies on `OrderApproved` and `OrderDelivered`, consumed through the same ACL. The
  `Available` term now names the two transitions.
- DispatchPlanner grouped shipments by pet category, which Fulfilment never receives.
  Changed: it groups orders approved on the same day, which `OrderApproved` does give it.

Partially accepted

- Policy correlation: `Approve when pet available` could not say how a `PetStatusChanged`
  led to an `orderId`. The DSL does not model correlation, so the description now says the
  policy looks up placed orders for the petId and confirms availability before approving.
- Lifecycle invariants on value objects: `SoldNotReopen` now constrains the `Pet` root,
  because the transition belongs to the entity. `DeliverOnlyWhenApproved` stays on value
  objects, now `OrderStatus` and `ShipDate`, since it genuinely reads both; that keeps the
  "invariant over two value objects" demonstration honest.
- Missing v3 endpoints: `UploadImage` was added to PetApp because `PhotoUrl` already exists
  and it is a real profile change. The user endpoints were not added: Identity is modelled
  at its boundary only, by design.
- "Pet" as a homonym: accepted that the glossary only listed synonyms. A `Pet` term was added
  to Sales, embodied by `Order.petId`, saying that in Sales a pet is an identity to check
  and reserve, nothing more. The status vocabularies are now linked by the two new policies
  rather than left informal.
- InventoryProjection should not be an aggregate: at the time this record said ODS had no
  projection element, so the materialised view stayed an aggregate with an invented root.
  Decision 15 settled it the other way: a projection is a service that provides a query
  operation. Changed (card 72): `InventoryProjection` and its `InventoryView` root are gone;
  `InventoryQuery` now provides `GetInventory` (a query with `returns`) and `RecountInventory`
  (the update the feeding policy issues), and consumes the six events the projection used to.

Rejected

- Fulfilment is invented: the brief says "deliver it" and asks for every element once; a
  partnership needs two contexts owned by one team, and Fulfilment is where child entities
  and a domain service naturally live.
- Fulfilment's policy issuing Sales' `DeliverOrder` is a violation: it is the pattern the
  DSL exists to show (a policy issuing another context's open-host operation) inside a
  declared partnership. Kept.
- Checklist architecture: that is the brief. The petstore is the demonstration reference,
  and the test suite asserts each relationship type exactly once.
- Inventory as a micro-context, the shared kernel and the customer-supplier ACL are
  contrived: each is a deliberate demonstration written up in the discovery record, and the
  ACL is justified by Sales keeping its own notion of availability.
- Inventory should not serve the Catalog subdomain: `/store/inventory` is a count of pet
  statuses, which is catalogue lifecycle information; it is the deliberate example of a
  context serving two subdomains.
- Identity is not a big ball of mud: the brief says nobody wants to touch it and it is
  modelled at its boundary only, which is exactly what the flag means in ODS. Kept.
- Category has an id so it is an entity: it is reference data compared by value (id and
  name together), which is the Swagger shape; no pet owns or edits a category.
- The discovery record is synthetic: it says so in its first paragraph. The source is a
  specification, not a client, and the record does not pretend otherwise.
