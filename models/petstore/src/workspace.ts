import { Workspace } from "@open-domain-specification/core";

/**
 * Swagger Petstore (v3): the demonstration reference for ODS.
 *
 * Every feature of the model appears here at least once, and nothing appears
 * twice just to add bulk. Each section starts with a comment saying what it
 * demonstrates, and descriptions say why a choice was made rather than
 * repeating the element's name. The workspace validates clean; the fake-org
 * workspaces beside it (RiverMart, StreamLine, NorthBank) are the ones that
 * stress the tooling and carry deliberate mistakes.
 *
 * Reading order: domains and subdomains (problem space), teams, contexts
 * (solution space), then one section per context with its aggregates,
 * services, schemas, policies, processes and glossary, and finally the
 * context map.
 */
export const workspace = new Workspace("Swagger Petstore (v3)", {
	odsVersion: "1.0.0",
	description:
		"DDD/ODS model for Swagger Petstore v3. Inventory is a projection returning a status→count map; Orders use placed|approved|delivered.",
	version: "0.2.0",
	homepage: "https://petstore.swagger.io/",
	primaryColor: "#0ea5e9",
	logoUrl: "https://petstore.swagger.io/favicon-32x32.png",
	// Petstore is the demonstration model, so it holds itself to the evidence
	// layer as well as the structure: every relationship says what backs it.
	options: { rules: { commentsRequired: true } },
});

/* =======================
   DOMAINS & SUBDOMAINS
   Demonstrates: the problem space as domains split into subdomains, each
   classified core, supporting or generic. The classification is a business
   judgement, so each description says what makes it so.
   ======================= */

const commerce = workspace.addDomain("Petstore Commerce", {
	description:
		"Core pet catalog, sales, and inventory capabilities: everything that turns a listed pet into a delivered one",
});

const identity = workspace.addDomain("Identity & Accounts", {
	description:
		"Users and sessions per Petstore API; kept as its own domain because it would be bought rather than built",
});

const catalogSD = commerce.addSubdomain("Catalog", {
	type: "core",
	description:
		"Pet definitions, attributes, lifecycle. Core because the selection of pets is what customers come for",
});
const salesSD = commerce.addSubdomain("Sales", {
	type: "core",
	description:
		"Orders and order lifecycle. Core because approving the right order at the right time is the store's promise",
});
const inventorySD = commerce.addSubdomain("Inventory", {
	type: "supporting",
	description:
		"Aggregated availability by status. Supporting: it must exist, but any correct count will do",
});
const fulfilmentSD = commerce.addSubdomain("Fulfilment", {
	type: "supporting",
	description:
		"Getting a sold pet to its owner. Supporting: needed, but a courier could do it just as well",
});
const usersSD = identity.addSubdomain("Users", {
	type: "generic",
	description:
		"User records and login/logout. Generic: an off-the-shelf identity provider would serve",
});

/* =======================
   TEAMS
   Demonstrates: teams as owners of contexts, with an optional homepage.
   A team can own several contexts; a context has at most one team.
   ======================= */

const petShopTeam = workspace.addTeam("Pet Shop Team", {
	description: "Owns the catalog and the inventory projection built from it",
});
const ordersTeam = workspace.addTeam("Orders Team", {
	description: "Owns order taking and fulfilment, so the two ship together",
});
const platformTeam = workspace.addTeam("Platform Team", {
	description: "Runs the legacy user store",
	homepage: "https://petstore.swagger.io/#/user",
});

/* =======================
   BOUNDED CONTEXTS
   Demonstrates: contexts as the solution space. A context serves one or more
   subdomains, is owned by a team, and may be flagged as a big ball of mud
   when its internals are not worth modelling.
   ======================= */

const catalogBC = catalogSD.addBoundedcontext("Catalog BC", {
	description: "Owns the Pet aggregate and the pet-facing operations",
	team: petShopTeam,
});
const salesBC = salesSD.addBoundedcontext("Sales BC", {
	description: "Owns the Order aggregate and the order-facing operations",
	team: ordersTeam,
});
// A context may serve several subdomains: the inventory projection is
// built from catalog data as well as sales, so it serves both.
const inventoryBC = workspace.addBoundedContext("Inventory BC", {
	description: "Projection for /store/inventory (status→count)",
	subdomains: [inventorySD, catalogSD],
	team: petShopTeam,
});
const fulfilmentBC = fulfilmentSD.addBoundedcontext("Fulfilment BC", {
	description:
		"Plans and tracks the shipment of an approved order until it is delivered",
	team: ordersTeam,
});
// Big ball of mud: the legacy user store is modelled only at its boundary.
// Its untyped status int and GET-based login are recorded as facts, not fixed.
const identityBC = usersSD.addBoundedcontext("Identity BC", {
	description:
		"Owns User aggregate & user endpoints. Legacy: user status is an untyped int and login is a GET",
	bigBallOfMud: true,
	team: platformTeam,
});

/* =======================
   CATALOG: Pet aggregate, PetApp service
   Demonstrates: a root entity, value objects backing attributes, an identity
   attribute, `uses` relations with every cardinality, invariants on an
   attribute and on a value object, published-language events with schemas,
   an internal operation, and an open-host application service.
   ======================= */

const petAgg = catalogBC.addAggregate("Pet", {
	description:
		"A pet listed in the store. One aggregate because a pet's photos, tags and status change together",
});

const petRoot = petAgg.addRootEntity("Pet", {
	description:
		"The listed animal; everything else in the aggregate hangs off it",
});

// Value objects: compared by value, no identity of their own.
const categoryVO = catalogBC.addValueObject("Category", {
	description:
		"The kind of animal, e.g. Dogs. A value because two pets in Dogs share one category",
});
categoryVO.addAttribute("id", { type: "int64" });
categoryVO.addAttribute("name", { type: "string" });

const tagVO = catalogBC.addValueObject("Tag", {
	description: "Free-form label on a pet",
});
tagVO.addAttribute("name", { type: "string" });

const photoUrlVO = catalogBC.addValueObject("PhotoUrl", {
	description: "Where a photo of the pet can be fetched",
});
photoUrlVO.addAttribute("url", { type: "string (URL)" });

const petStatusVO = catalogBC.addValueObject("PetStatus", {
	description:
		"Where the pet is in its sales lifecycle. Shared with Inventory, which keys its counts by these values",
});
petStatusVO.addAttribute("value", {
	type: "'available' | 'pending' | 'sold'",
});

// Attributes: `identity` marks the one that identifies the entity,
// `valueobject` links an attribute to the value object that types it, and
// `optional` marks the ones the Swagger contract does not require. The v3
// Pet schema requires only `name` and `photoUrls`; `id` is left required
// because it identifies the pet, and an identity is never optional.
petRoot.addAttribute("id", { type: "int64", identity: true });
petRoot.addAttribute("name", { type: "string" });
petRoot.addAttribute("category", {
	type: "Category",
	valueobject: categoryVO,
	optional: true,
});
petRoot.addAttribute("photoUrls", {
	type: "PhotoUrl[]",
	valueobject: photoUrlVO,
});
petRoot.addAttribute("tags", {
	type: "Tag[]",
	valueobject: tagVO,
	optional: true,
});
petRoot.addAttribute("status", {
	type: "PetStatus",
	valueobject: petStatusVO,
	optional: true,
});

// `uses` is the relation to a value object; between the Pet here and the
// Order below the cardinalities cover 0..1, * and 1. The status is "0..1" and
// not "1" because the attribute is optional: the v3 contract does not require
// it, and the two halves of that statement have to agree (card 82). A pet
// without a status is not listed by findByStatus and is not counted by
// Inventory, which is what the contract already implies.
//
// photoUrls is "*" and not "1..*" because presence is not size: the contract
// requires the field and sets no minimum, so a pet with no photograph is a
// valid pet and the model says so (card 89).
petRoot.uses(categoryVO, "categorized-as", "0..1");
petRoot.uses(tagVO, "tagged-with", "*");
petRoot.uses(photoUrlVO, "has-photo", "*");
petRoot.uses(petStatusVO, "has-status", "0..1");

// Invariants name the rule and point at what it constrains: an attribute here,
// the root entity below (a lifecycle rule belongs to the thing with the
// lifecycle, not to the immutable status value), value objects in Sales.
petAgg
	.addInvariant("NameRequired", {
		description:
			"Pet.name must be non-empty, because the storefront lists pets by name",
	})
	.constrains(petRoot.attributes.get("name")!);
const soldNotReopen = petAgg
	.addInvariant("SoldNotReopen", {
		description:
			"Once sold, a pet does not revert to available without an explicit policy, so a buyer is never undercut. Constrains the Pet because the transition is the pet's, not the status value's, and the operation that makes the transition, because that is where the rule is enforced",
	})
	.constrains(petRoot);

// Schemas: the payload shapes this context publishes. They belong to the
// context, not the aggregate, because several consumables share them.
const petRegisteredSchema = catalogBC.addSchema("PetRegistered", {
	description: "What the outside learns when a pet joins the catalog",
});
petRegisteredSchema.addAttribute("petId", { type: "int64", identity: true });
petRegisteredSchema.addAttribute("name", { type: "string" });
petRegisteredSchema.addAttribute("category", {
	type: "Category",
	valueobject: categoryVO,
});
const petStatusChangedSchema = catalogBC.addSchema("PetStatusChanged");
petStatusChangedSchema.addAttribute("petId", { type: "int64", identity: true });
petStatusChangedSchema.addAttribute("from", {
	type: "PetStatus",
	valueobject: petStatusVO,
});
petStatusChangedSchema.addAttribute("to", {
	type: "PetStatus",
	valueobject: petStatusVO,
});
const registerPetSchema = catalogBC.addSchema("RegisterPet", {
	description: "Request body for adding a pet",
});
registerPetSchema.addAttribute("name", { type: "string" });
registerPetSchema.addAttribute("category", {
	type: "Category",
	valueobject: categoryVO,
});
const petIdSchema = catalogBC.addSchema("PetId", {
	description:
		"Identifies one pet; shared by every consumable that only needs the id",
});
petIdSchema.addAttribute("petId", { type: "int64", identity: true });
// A returned shape: what GetPetById answers with, the full resource behind the
// summary below.
const petSchema = catalogBC.addSchema("Pet", {
	description: "The full pet resource, as GET /pet/{petId} answers with it",
});
petSchema.addAttribute("petId", { type: "int64", identity: true });
petSchema.addAttribute("name", { type: "string" });
petSchema.addAttribute("category", {
	type: "Category",
	valueobject: categoryVO,
});
petSchema.addAttribute("photoUrls", {
	type: "PhotoUrl[]",
	valueobject: photoUrlVO,
});
petSchema.addAttribute("tags", { type: "Tag[]", valueobject: tagVO });
petSchema.addAttribute("status", {
	type: "PetStatus",
	valueobject: petStatusVO,
});
// A returned shape: what GetPetSummary answers with, as opposed to the PetId
// it is asked with. Sales depends on these three attributes and nothing else.
const petSummarySchema = catalogBC.addSchema("PetSummary", {
	description: "The slim read of a pet other contexts are allowed to hold",
});
petSummarySchema.addAttribute("petId", { type: "int64", identity: true });
petSummarySchema.addAttribute("name", { type: "string" });
petSummarySchema.addAttribute("status", {
	type: "PetStatus",
	valueobject: petStatusVO,
});

// A rejection shape: what ReservePetForOrder answers with when it will not
// hold the pet. Nothing happened, so it is not an event, and Sales needs the
// status to know whether to wait or give up (decision 25).
const petUnavailableSchema = catalogBC.addSchema("PetUnavailable", {
	description: "Why the pet could not be held: it is already pending or sold",
});
petUnavailableSchema.addAttribute("petId", { type: "int64", identity: true });
petUnavailableSchema.addAttribute("status", {
	type: "PetStatus",
	valueobject: petStatusVO,
});

// Events are past-tense facts. published-language says other contexts may
// rely on their shape.
const petRegistered = petAgg.provides("PetRegistered", {
	description: "A new pet was registered",
	type: "event",
	pattern: "published-language",
	schema: petRegisteredSchema,
});
const petUpdated = petAgg.provides("PetUpdated", {
	description: "Pet profile updated",
	type: "event",
	pattern: "published-language",
	schema: petIdSchema,
});
// Three facts, three events. One PetStatusChanged for all of them read as a
// ring: reserving a pet republished the same fact that tells Sales a pet is
// available, so approving an order caused another approval (card 69). The
// status edit keeps the name and the from/to payload because that is the one
// case where the pair of statuses is the news; the two lifecycle transitions
// each say which transition happened, so the id is all they carry.
const petStatusChanged = petAgg.provides("PetStatusChanged", {
	description:
		"The catalogue moved a pet between statuses itself, e.g. relisting a returned pet as available",
	type: "event",
	pattern: "published-language",
	schema: petStatusChangedSchema,
});
const petReserved = petAgg.provides("PetReserved", {
	description: "available → pending: the pet is held for an approved order",
	type: "event",
	pattern: "published-language",
	schema: petIdSchema,
});
const petSold = petAgg.provides("PetSold", {
	description: "pending → sold: the pet has gone to its owner",
	type: "event",
	pattern: "published-language",
	schema: petIdSchema,
});
const petDeleted = petAgg.provides("PetDeleted", {
	description: "Pet removed from catalog",
	type: "event",
	pattern: "published-language",
	schema: petIdSchema,
});

// An internal operation never leaves its context, so it declares no pattern.
// Only the catalog moves a pet between statuses; `raises` links it to the fact it produces.
const changePetStatus = petAgg
	.provides("ChangePetStatus", {
		description:
			"Move a pet between available, pending and sold; the catalogue's own edits, e.g. relisting a returned pet",
		type: "operation",
		internal: true,
		schema: petStatusChangedSchema,
	})
	.raises(petStatusChanged);
// SoldNotReopen is a transition rule, so it names the operation that makes the
// transition as well as the entity the transition belongs to; the operation is
// declared here, below the invariant that guards it. Not a precondition: the
// pet's status is the aggregate's own, and once sold it stays sold every time
// the pet is saved, so ChangePetStatus is named for responsibility rather than
// to say the rule stops holding after it (card 94).
soldNotReopen.constrains(changePetStatus);
// The two transitions the order lifecycle drives are the aggregate's own, so
// they are internal: what Catalog offers outward leaves PetApp below
// (decision 17). The pet lifecycle (available → pending → sold) is still
// walked by the order lifecycle (placed → approved → delivered).
const reservePet = petAgg
	.provides("ReservePet", {
		description:
			"available → pending: the pet is held for an approved order; run by PetApp on the request Sales makes",
		type: "operation",
		internal: true,
		schema: petIdSchema,
	})
	.raises(petReserved);
const markPetSold = petAgg
	.provides("MarkPetSold", {
		description:
			"pending → sold: the pet has gone to its owner; run by PetApp on the request Sales makes",
		type: "operation",
		internal: true,
		schema: petIdSchema,
	})
	.raises(petSold);

// Application service: the API layer. open-host-service says the contract is documented for others.
const petApp = catalogBC.addService("PetApp", {
	description: "Open-host service for /pet endpoints",
	type: "application",
});

petApp
	.provides("AddPet", {
		description: "POST /pet",
		type: "operation",
		pattern: "open-host-service",
		schema: registerPetSchema,
	})
	.raises(petRegistered);
petApp
	.provides("UpdatePet", {
		description: "PUT /pet",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(petUpdated);
// The Swagger source answers `GET /pet/findByStatus` with a root array, so the
// answer is many PetSummary rather than one wrapper holding a list: a consumer
// of `Pets { pets: PetSummary[] }` could not tell the two apart, and only one
// of them is what the API does (decision 13, amended). Summaries rather than
// full pets, because a list of matches is the slim read and a caller who wants
// everything asks for one pet by id.
petApp.provides("FindPetsByStatus", {
	description: "GET /pet/findByStatus?status=available|pending|sold",
	type: "operation",
	pattern: "open-host-service",
	returns: { schema: petSummarySchema, many: true },
});
petApp.provides("GetPetById", {
	description: "GET /pet/{petId}",
	type: "operation",
	pattern: "open-host-service",
	schema: petIdSchema,
	returns: petSchema,
});
petApp
	.provides("UploadImage", {
		description:
			"POST /pet/{petId}/uploadImage; adds a PhotoUrl, so it is a profile update",
		type: "operation",
		pattern: "open-host-service",
		schema: petIdSchema,
	})
	.raises(petUpdated);
petApp
	.provides("DeletePet", {
		description: "DELETE /pet/{petId}",
		type: "operation",
		pattern: "open-host-service",
		schema: petIdSchema,
	})
	.raises(petDeleted);
// A deliberately slim read offered to other contexts, so they need not know the whole Pet.
const getPetSummaryOp = petApp.provides("GetPetSummary", {
	description:
		"GET /pets/{id}/summary; asked with a PetId, answers with a PetSummary, so Sales can check availability without coupling to the full Pet",
	type: "operation",
	pattern: "open-host-service",
	schema: petIdSchema,
	returns: petSummarySchema,
	comments: [
		{
			text: "The summary projection is the only Catalog read Sales is allowed to make.",
			link: {
				kind: "contract",
				url: "https://github.com/example/petstore/blob/main/catalog/openapi.yaml#/paths/~1pets~1{id}~1summary",
				label: "GET /pets/{id}/summary",
			},
		},
	],
});

// The context's public boundary for the two transitions Sales drives: the
// aggregate's operations stay inside, and the open-host operations that front
// them belong to the application service (decision 17). Neither front raises
// anything of its own: PetReserved and PetSold are the aggregate's facts, and
// the `by` below carries them out through the chain, so restating them here
// would only invite drift (`raises-restated`).
const reservePetForOrder = petApp.provides("ReservePetForOrder", {
	description:
		"POST /pet/{petId}/reserve; holds the pet for an approved order by running the aggregate's ReservePet",
	type: "operation",
	pattern: "open-host-service",
	schema: petIdSchema,
	rejects: [petUnavailableSchema],
	disposition: "refactor",
	comments: [
		{
			text: "Reservation is a synchronous call into Catalog; it should become an order-placed subscription so Sales stops blocking on Catalog.",
			link: {
				kind: "adr",
				url: "https://github.com/example/petstore/blob/main/docs/adr/017-reserve-asynchronously.md",
				label: "ADR-017 Reserve asynchronously",
			},
		},
	],
});
const markPetSoldForOrder = petApp.provides("MarkPetSoldForOrder", {
	description:
		"POST /pet/{petId}/sold; records the sale by running the aggregate's MarkPetSold",
	type: "operation",
	pattern: "open-host-service",
	schema: petIdSchema,
});
// A consumption inside one context needs no pattern: there is no boundary to
// protect between the service and the aggregate it fronts. `by` names which
// of the service's operations runs which transition (decision 21), and that
// is the link the flow map follows into the aggregate.
petApp.consumes(reservePet, { by: [reservePetForOrder] });
petApp.consumes(markPetSold, { by: [markPetSoldForOrder] });

// Glossary: the ubiquitous language of this context, each term pointing at
// the element that embodies it. Aliases record what other people call it.
catalogBC.addTerm("Pet", {
	definition: "An animal listed for sale in the store",
	embodiedBy: petAgg,
});
catalogBC.addTerm("Category", {
	definition: "The kind of animal a pet is, such as Dogs or Cats",
	aliases: ["Species"],
	embodiedBy: categoryVO,
});
catalogBC.addTerm("Available", {
	definition:
		"A pet that can be ordered; it becomes pending when Sales approves an order for it (ReservePet) and sold when that order is delivered (MarkPetSold)",
	embodiedBy: petStatusVO,
});

/* =======================
   SALES: Order aggregate, OrderApp service
   Demonstrates: a cross-context identity attribute naming another context's
   root, an invariant that constrains two value objects, an anti-corruption
   consumption, and a process that reacts to events from two contexts, holds
   one order across its whole life and issues local operations which call out
   through the ACL (decisions 17 and 23).
   ======================= */

const orderAgg = salesBC.addAggregate("Order", {
	description: "Order for a single pet",
});

const orderRoot = orderAgg.addRootEntity("Order", {
	description: "The customer's request to buy one pet",
});

const orderStatusVO = salesBC.addValueObject("OrderStatus", {
	description: "Where the order is in its lifecycle",
});
orderStatusVO.addAttribute("value", {
	type: "'placed' | 'approved' | 'delivered'",
});
const quantityVO = salesBC.addValueObject("Quantity", {
	description:
		"The v3 API's quantity field, kept for the wire shape. A Pet is an individual animal, so the invariant below pins it to 1",
});
quantityVO.addAttribute("value", { type: "int > 0" });
const shipDateVO = salesBC.addValueObject("ShipDate", {
	description:
		"When the order ships; set by Fulfilment once dispatch is planned",
});
shipDateVO.addAttribute("value", { type: "date-time" });

orderRoot.addAttribute("id", { type: "int64", identity: true });
const orderPetId = orderRoot.addAttribute("petId", {
	type: "int64",
	description:
		"Identity of the Pet root in Catalog; only the id crosses the boundary",
	identifies: petRoot,
});
orderRoot.addAttribute("quantity", {
	type: "Quantity",
	valueobject: quantityVO,
});
orderRoot.addAttribute("shipDate", {
	type: "ShipDate",
	valueobject: shipDateVO,
	optional: true,
	description: "Absent until Fulfilment has planned the dispatch",
});
orderRoot.addAttribute("status", {
	type: "OrderStatus",
	valueobject: orderStatusVO,
});

orderRoot.uses(orderStatusVO, "has-status", "1");
orderRoot.uses(quantityVO, "has-quantity", "1");
orderRoot.uses(shipDateVO, "ships-on", "0..1");
// No relation to Catalog's Pet: a relation never crosses a bounded context, so
// the order holds `petId` above and nothing more. Sales depends on Catalog
// through the consumable it consumes and the context relationship between the
// two, which is where that dependency reads.

orderAgg
	.addInvariant("OneAnimalPerOrder", {
		description:
			"Quantity is exactly 1: a Pet is one animal with one status, so it cannot be sold five times. The API's quantity field is accepted but never exceeds one",
	})
	.constrains(quantityVO);
// An invariant only names things inside its own aggregate: Sales cannot
// enforce a rule over the catalogue's PetStatus. What it can enforce is that
// its own status only moves to approved after the availability check the
// ACL made through GetPetSummary; the process below is where that check runs.
// The rule is a precondition of the transition, so it names the operation that
// makes it — ApproveOrder, the aggregate's own — and the guard is in the model
// rather than in this comment (decision 19). The invariant is declared after
// ApproveOrder, further down.
// An invariant that names two value objects, because the rule reads both.
orderAgg
	.addInvariant("DeliverOnlyWhenApproved", {
		description:
			"Deliver only from approved and only once a ship date is set, so nothing is marked delivered that was never checked or never dispatched",
	})
	.constrains(orderStatusVO, shipDateVO);

const orderPlacedSchema = salesBC.addSchema("OrderPlaced");
orderPlacedSchema.addAttribute("orderId", { type: "int64", identity: true });
orderPlacedSchema.addAttribute("petId", { type: "int64", identifies: petRoot });
orderPlacedSchema.addAttribute("quantity", {
	type: "Quantity",
	valueobject: quantityVO,
});
const placeOrderSchema = salesBC.addSchema("PlaceOrder", {
	description: "Request body for placing an order",
});
placeOrderSchema.addAttribute("petId", { type: "int64", identifies: petRoot });
placeOrderSchema.addAttribute("quantity", {
	type: "Quantity",
	valueobject: quantityVO,
});
const orderIdSchema = salesBC.addSchema("OrderId");
orderIdSchema.addAttribute("orderId", { type: "int64", identity: true });
// A returned shape: what GetOrderById answers with.
const orderDetailSchema = salesBC.addSchema("OrderDetail", {
	description: "One order, as GET /store/order/{orderId} answers with it",
});
orderDetailSchema.addAttribute("orderId", { type: "int64", identity: true });
orderDetailSchema.addAttribute("petId", { type: "int64", identifies: petRoot });
orderDetailSchema.addAttribute("quantity", {
	type: "Quantity",
	valueobject: quantityVO,
});
orderDetailSchema.addAttribute("shipDate", {
	type: "ShipDate",
	valueobject: shipDateVO,
});
orderDetailSchema.addAttribute("status", {
	type: "OrderStatus",
	valueobject: orderStatusVO,
});

const orderPlaced = orderAgg.provides("OrderPlaced", {
	description: "Order created (status=placed)",
	type: "event",
	pattern: "published-language",
	schema: orderPlacedSchema,
});
const orderApproved = orderAgg.provides("OrderApproved", {
	description:
		"Order approved (status=approved); Inventory and Fulfilment both react",
	type: "event",
	pattern: "published-language",
	schema: orderIdSchema,
});
const orderDelivered = orderAgg.provides("OrderDelivered", {
	description: "Order delivered (status=delivered)",
	type: "event",
	pattern: "published-language",
	schema: orderIdSchema,
});
const orderDeleted = orderAgg.provides("OrderDeleted", {
	description: "Order deleted via DELETE /store/order/{orderId}",
	type: "event",
	pattern: "published-language",
	schema: orderIdSchema,
});

// Approval is internal: only the sales process below decides it.
const approveOrder = orderAgg
	.provides("ApproveOrder", {
		description: "Approve a placed order once the pet is available",
		type: "operation",
		internal: true,
		schema: orderIdSchema,
	})
	.raises(orderApproved);
// The precondition, declared here because it names the transition it guards.
orderAgg
	.addInvariant("ApproveOnlyWhenAvailable", {
		description:
			"Move to approved only after the catalogue's summary reported the pet available; the catalogue's status itself is outside this aggregate, so the check is a read through the ACL, not a shared invariant",
		// The catalogue may sell the pet a second later and this order says
		// nothing about it: the read holds at approval only (card 94).
		precondition: true,
	})
	.constrains(orderStatusVO, approveOrder);
// Delivery is confirmed by Fulfilment, but the transition itself is the
// aggregate's own, so it is internal and OrderApp's ConfirmDelivery below is
// what Fulfilment calls (decision 17).
const deliverOrder = orderAgg
	.provides("DeliverOrder", {
		description:
			"Mark an approved order as delivered; run by OrderApp when Fulfilment reports the shipment arrived",
		type: "operation",
		internal: true,
		schema: orderIdSchema,
	})
	.raises(orderDelivered);

const orderApp = salesBC.addService("OrderApp", {
	description: "Open-host service for /store/order endpoints",
	type: "application",
});

orderApp
	.provides("PlaceOrder", {
		description: "POST /store/order",
		type: "operation",
		pattern: "open-host-service",
		schema: placeOrderSchema,
	})
	.raises(orderPlaced);
orderApp.provides("GetOrderById", {
	description: "GET /store/order/{orderId}",
	type: "operation",
	pattern: "open-host-service",
	schema: orderIdSchema,
	returns: orderDetailSchema,
});
orderApp
	.provides("DeleteOrder", {
		description: "DELETE /store/order/{orderId}",
		type: "operation",
		pattern: "open-host-service",
		schema: orderIdSchema,
	})
	.raises(orderDeleted);

// The open host Fulfilment calls, fronting the aggregate's internal transition.
const confirmDelivery = orderApp.provides("ConfirmDelivery", {
	description:
		"POST /store/order/{orderId}/delivered; Fulfilment reports the shipment arrived and the order moves to delivered",
	type: "operation",
	pattern: "open-host-service",
	schema: orderIdSchema,
});
// ConfirmDelivery is the one operation of OrderApp that runs the aggregate's
// internal transition, so it names itself in `by` and the chain carries from
// Fulfilment's ReportDelivery through ConfirmDelivery into OrderDelivered
// rather than stopping at the open host (decision 21).
orderApp.consumes(deliverOrder, { by: [confirmDelivery] });

// A process, like a policy, names operations of its own context (decisions 17
// and 23), so the two catalogue transitions Sales drives get a local operation
// each: the one that calls out through the ACL above. What crosses the boundary is the
// consumption, which the consumable map already draws.
const reservePetForApproved = orderApp.provides("ReservePet", {
	description:
		"Ask Catalog to hold the ordered pet, through the ACL; Sales' own step in the order lifecycle",
	type: "operation",
	internal: true,
	schema: orderIdSchema,
});
const markPetSoldForDelivered = orderApp.provides("MarkPetSold", {
	description:
		"Tell Catalog the ordered pet has gone to its owner, through the ACL",
	type: "operation",
	internal: true,
	schema: orderIdSchema,
});
// The third step of the same kind, and the one the model used to leave out: a
// call is made by an operation, not by the process that issues it (decision 17;
// `consumption-by-operation`). The process asked Catalog directly, through a
// `by` naming itself, so the boundary had no local operation on it at all and
// the reaction walk ran out of chain (card 92).
const checkPetAvailable = orderApp.provides("CheckPetAvailable", {
	description:
		"Read the ordered pet's summary from Catalog, through the ACL, and decide whether Sales may approve the order",
	type: "operation",
	internal: true,
	schema: orderIdSchema,
});
// Placing, reading or deleting an order never calls Catalog; one operation
// does each of these, and naming it keeps the dependency where it really is.
// The same ACL makes both calls, through the open host PetApp offers rather
// than the Pet aggregate itself, and because `by` is what carries the chain
// across the boundary (decision 21's amendment) both are named.
orderApp.consumes(reservePetForOrder, {
	pattern: "anti-corruption-layer",
	by: [reservePetForApproved],
});
orderApp.consumes(markPetSoldForOrder, {
	pattern: "anti-corruption-layer",
	by: [markPetSoldForDelivered],
});

// One order, from placed to delivered, is a process and not three policies: it
// remembers which order is waiting for which pet, so that a relisting later in
// the week approves the order placed on Monday, and it knows when it is done.
// Both its triggers carry a petId; it finds the placed orders for that pet
// (GetOrderById's store, keyed by petId) and asks GetPetSummary before
// approving. The order lifecycle drives the pet lifecycle, which is why Sales
// is the customer: each operation it issues is Sales' own, and that operation
// is what reaches Catalog through the ACL — a context acts through its own
// boundary (decisions 17 and 23).
const orderFulfilment = salesBC
	.addProcess("Order fulfilment", {
		description:
			"From an order being placed to the pet being sold. It starts on OrderPlaced and waits, because the pet may not be available yet: a relisting (PetStatusChanged) makes it look up the placed orders for that petId, confirm availability through GetPetSummary and approve the oldest. On approval it holds the pet (available → pending), and once the order is delivered it tells the catalogue the pet has gone to its owner (pending → sold). It does not listen to PetReserved: that is the fact this very chain produces. Correlation is by petId and then orderId; an order nobody can fulfil is cancelled by hand, which is why there is no timeout here",
	})
	.starts(orderPlaced)
	.on(petStatusChanged)
	.issues(
		checkPetAvailable,
		approveOrder,
		reservePetForApproved,
		markPetSoldForDelivered,
	)
	.ends(orderDelivered);

// The two consumptions the process drives, declared here because the relisting
// one names it. Anti-corruption layer: OrderApp translates the catalog's summary
// into its own notion of availability rather than adopting the catalog's model,
// and it does the same with the relisting fact.
//
// What makes the availability call is CheckPetAvailable, not the process. The
// process is what remembers which order is waiting and decides when to ask; the
// asking is a step of Sales' own boundary, with a translator behind it and a
// place for a comment about it, and the flow map and the reaction walk both
// read the crossing there (decisions 17 and 21). A `by` may name a process, but
// only on an event: nothing stands between a fact arriving and a reaction to
// it, while a call is something a part of this context does.
orderApp.consumes(getPetSummaryOp, {
	pattern: "anti-corruption-layer",
	by: [checkPetAvailable],
	comments: [
		{
			text: "PetSummaryClient is the translator; nothing else in Sales knows the catalog payload shape.",
			link: {
				kind: "code",
				url: "https://github.com/example/petstore/blob/main/sales/acl/PetSummaryClient.ts",
				label: "sales/acl/PetSummaryClient.ts",
			},
		},
	],
});
// Waiting on the catalogue's relisting is a dependency on Catalog like any
// other, so Sales takes the fact in at its own boundary rather than only
// subscribing to it (decision 17; `subscription-consumed`). The same ACL
// translates it: what Sales stores is that the pet it is waiting for may be
// free, not the catalogue's from/to statuses.
orderApp.consumes(petStatusChanged, {
	pattern: "anti-corruption-layer",
	by: [orderFulfilment],
	comments: [
		{
			text: "PetSummaryClient maps the catalogue's status change onto the process's one question, is this pet free.",
			link: {
				kind: "code",
				url: "https://github.com/example/petstore/blob/main/sales/acl/PetSummaryClient.ts",
				label: "sales/acl/PetSummaryClient.ts",
			},
		},
	],
});

salesBC.addTerm("Order", {
	definition:
		"A customer's request to buy one pet; placed, then approved, then delivered",
	aliases: ["Purchase"],
	embodiedBy: orderAgg,
});
// The same word means different things in different contexts, and the
// glossary is where that is written down: in Catalog a Pet is the animal with
// its photos and tags; in Sales it is only an identity to check and reserve.
salesBC.addTerm("Pet", {
	definition:
		"Only the identity of a catalogue pet; Sales holds no pet attributes and asks the catalogue for availability",
	embodiedBy: orderPetId,
});
salesBC.addTerm("Approval", {
	definition: "Confirmation that the ordered pet is available and reserved",
	embodiedBy: approveOrder,
});

/* =======================
   FULFILMENT: Shipment aggregate, DispatchPlanner domain service
   Demonstrates: an `includes` relation to a child entity that cannot exist
   alone, an invariant on an entity, a domain service (logic that belongs to
   no single aggregate), and a policy that acts on another context through an
   operation of its own.
   ======================= */

const shipmentAgg = fulfilmentBC.addAggregate("Shipment", {
	description:
		"The journey of one approved order to its owner. Attempts live inside it because they mean nothing without the shipment",
});

const shipmentRoot = shipmentAgg.addRootEntity("Shipment", {
	description: "One consignment for one order",
});

// A second aggregate in the same context, so the model still demonstrates a
// `references` relation: the one relation kind that may cross an aggregate
// boundary, and only inside one bounded context.
const carrierAgg = fulfilmentBC.addAggregate("Carrier", {
	description:
		"The company that carries a consignment. Its own cluster because carriers are onboarded, rated and retired on their own schedule, nothing to do with any one shipment",
});
const carrierRoot = carrierAgg.addRootEntity("Carrier", {
	description: "One carrier Fulfilment ships with",
});
carrierRoot.addAttribute("id", { type: "int64", identity: true });
carrierRoot.addAttribute("name", { type: "string" });

const deliveryAttempt = shipmentAgg.addEntity("DeliveryAttempt", {
	description:
		"A dated try at handing over the pet; an entity because attempts are counted and ordered, a child because it never exists without its shipment",
});
const trackingNumberVO = fulfilmentBC.addValueObject("TrackingNumber", {
	description:
		"Carrier reference; a value because two shipments never share one",
});
trackingNumberVO.addAttribute("value", { type: "string" });
const shipmentStatusVO = fulfilmentBC.addValueObject("ShipmentStatus", {
	description: "planned, in-transit or delivered",
});
shipmentStatusVO.addAttribute("value", {
	type: "'planned' | 'in-transit' | 'delivered'",
});

shipmentRoot.addAttribute("id", { type: "int64", identity: true });
shipmentRoot.addAttribute("orderId", {
	type: "int64",
	description:
		"Identity of the Order root in Sales; only the id crosses the boundary",
	identifies: orderRoot,
});
shipmentRoot.addAttribute("carrierId", { type: "int64" });
shipmentRoot.addAttribute("status", {
	type: "ShipmentStatus",
	valueobject: shipmentStatusVO,
});
// Every `uses` relation below is the same statement as one of these
// attributes; the attribute says what the shipment holds, the relation draws it.
shipmentRoot.addAttribute("trackingNumber", {
	type: "TrackingNumber",
	valueobject: trackingNumberVO,
});
// Attempts are counted and ordered, so the count is what tells one from the
// next: that is exactly what makes DeliveryAttempt an entity and not a value.
deliveryAttempt.addAttribute("attemptNumber", {
	type: "int32",
	identity: true,
});
deliveryAttempt.addAttribute("attemptedAt", { type: "date-time" });
deliveryAttempt.addAttribute("succeeded", { type: "boolean" });

// `includes` is ownership: the attempt is part of the shipment's consistency boundary.
shipmentRoot.includes(deliveryAttempt, "attempted-by", "*");
shipmentRoot.uses(trackingNumberVO, "tracked-as", "1");
shipmentRoot.uses(shipmentStatusVO, "has-status", "1");
// `references` is the only relation allowed across aggregates, and it must
// target the other aggregate's root. Carrier is a second aggregate inside
// Fulfilment, so the relation stays inside one bounded context; the order it
// fulfils is in Sales, so that one is `orderId` above and no relation at all.
shipmentRoot.references(carrierRoot, "shipped-by", "1");

// This invariant constrains an entity rather than a value: the rule is about
// the shipment as a whole.
shipmentAgg
	.addInvariant("DeliveredOnlyByAttempt", {
		description:
			"A shipment becomes delivered only through a successful delivery attempt, so the audit trail is never empty",
	})
	.constrains(shipmentRoot);

const shipmentDeliveredSchema = fulfilmentBC.addSchema("ShipmentDelivered");
shipmentDeliveredSchema.addAttribute("shipmentId", {
	type: "int64",
	identity: true,
});
shipmentDeliveredSchema.addAttribute("orderId", {
	type: "int64",
	identifies: orderRoot,
});
shipmentDeliveredSchema.addAttribute("deliveredAt", { type: "date-time" });

// An internal event: nothing outside Fulfilment needs to know a plan exists.
const shipmentPlanned = shipmentAgg.provides("ShipmentPlanned", {
	description: "A ship date was chosen for an approved order",
	type: "event",
	internal: true,
});
const shipmentDelivered = shipmentAgg.provides("ShipmentDelivered", {
	description: "The pet reached its owner",
	type: "event",
	pattern: "published-language",
	schema: shipmentDeliveredSchema,
});
shipmentAgg
	.provides("RecordDeliveryAttempt", {
		description:
			"Log a delivery attempt; a successful one delivers the shipment",
		type: "operation",
		internal: true,
	})
	.raises(shipmentDelivered);

// A domain service: choosing a ship date compares several orders, so the
// logic belongs to no single Shipment.
const dispatchPlanner = fulfilmentBC.addService("DispatchPlanner", {
	description:
		"Chooses ship dates across planned shipments so orders approved on the same day leave together; it only needs orderIds and dates, which is all OrderApproved gives it",
	type: "domain",
});
const planDispatch = dispatchPlanner
	.provides("PlanDispatch", {
		description:
			"Create a shipment and pick its ship date for an approved order",
		type: "operation",
		internal: true,
	})
	.raises(shipmentPlanned);

// Fulfilment's own boundary. The policy below cannot name Sales' operation,
// so ShipmentApp offers the local one that does the calling (decision 17).
const shipmentApp = fulfilmentBC.addService("ShipmentApp", {
	description:
		"Fulfilment's application service: the boundary through which Fulfilment reports delivery to Sales",
	type: "application",
});
const reportDelivery = shipmentApp.provides("ReportDelivery", {
	description:
		"Tell Sales the shipment arrived, by calling the order's ConfirmDelivery",
	type: "operation",
	internal: true,
	schema: shipmentDeliveredSchema,
});
// ReportDelivery is the one operation of ShipmentApp that calls out, so it
// names itself in `by` and the chain carries from RecordDeliveryAttempt's
// ShipmentDelivered through the policy into Sales (decision 21).
shipmentApp.consumes(confirmDelivery, { by: [reportDelivery] });
// Sales consumes nothing of Fulfilment's. It was given ShipmentDelivered on
// card 47 so that the partnership had traffic both ways, and nothing in Sales
// ever read it: no policy or process of Sales reacts to it, and OrderDetail
// carries no shipment and no delivery time to show. The order moves to
// delivered because Fulfilment calls ConfirmDelivery, which is the whole of the
// exchange. Decision 20's second amendment says a partnership needs no traffic
// in the quiet direction, so the consumption was silencing a rule that no
// longer asks, and it is gone (card 90).

const planOnApproval = fulfilmentBC
	.addPolicy("Plan dispatch on approval", {
		description: "Every approved order gets a shipment planned straight away",
	})
	.on(orderApproved)
	.issues(planDispatch);

// Conformist: the order events are taken as published, because both contexts
// belong to the Orders Team and the partnership below makes them change
// together. The consumption sits on ShipmentApp, not on the Shipment
// aggregate: an aggregate is a consistency boundary, not a client, so the
// context takes the fact in at its own boundary and the policy above is what
// reacts to it (decision 17).
shipmentApp.consumes(orderApproved, {
	pattern: "conformist",
	by: [planOnApproval],
});
// A policy acts in its own context: Fulfilment names its own ReportDelivery,
// and that operation is what calls the open host Sales offers.
fulfilmentBC
	.addPolicy("Deliver order on delivery", {
		description:
			"When a shipment is delivered, report it to Sales so the order moves to delivered",
	})
	.on(shipmentDelivered)
	.issues(reportDelivery);

fulfilmentBC.addTerm("Shipment", {
	definition: "The consignment that carries one order to its owner",
	aliases: ["Consignment"],
	embodiedBy: shipmentAgg,
});

/* =======================
   INVENTORY: projection and query service
   Demonstrates: a projection modelled as a query service (decision 15),
   conformist consumptions of events from two contexts, and a policy issuing
   the service's own update operation.
   ======================= */

// The counts the projection answers with. A query that takes no request body
// still has a shape worth naming: this is what callers depend on.
const inventoryCountsSchema = inventoryBC.addSchema("InventoryCounts", {
	description: "How many pets stand in each status right now",
});
inventoryCountsSchema.addAttribute("available", { type: "int32" });
inventoryCountsSchema.addAttribute("pending", { type: "int32" });
inventoryCountsSchema.addAttribute("sold", { type: "int32" });

const inventoryQuery = inventoryBC.addService("InventoryQuery", {
	description:
		"Open-host service for /store/inventory: a projection is a service that provides a query (decision 15), not an aggregate with an invented root",
	type: "application",
});
inventoryQuery.provides("GetInventory", {
	description: "GET /store/inventory; takes nothing, answers with the counts",
	type: "operation",
	pattern: "open-host-service",
	returns: inventoryCountsSchema,
});
// The status is Catalog's PetStatus, reached across the shared kernel the
// two contexts declare: one definition, named here rather than restated.
const inventoryUpdatedSchema = inventoryBC.addSchema(
	"InventoryUpdatedPayload",
	{
		description: "Which status's count changed",
	},
);
inventoryUpdatedSchema.addAttribute("status", {
	type: "PetStatus",
	description: "The status whose count moved",
	valueobject: petStatusVO,
});
const inventoryUpdated = inventoryQuery.provides("InventoryUpdated", {
	description: "Inventory counts changed",
	type: "event",
	pattern: "published-language",
	schema: inventoryUpdatedSchema,
});
const recountInventory = inventoryQuery
	.provides("RecountInventory", {
		description: "Recompute the status→count map from catalog and sales facts",
		type: "operation",
		internal: true,
	})
	.raises(inventoryUpdated);

// Conformist: the projection adopts the published events as they are, which
// is cheap because the shared kernel means the status vocabulary is the same.
inventoryQuery.consumes(petRegistered, { pattern: "conformist" });
inventoryQuery.consumes(petDeleted, { pattern: "conformist" });
// The projection counts all three status facts, so it takes all three.
inventoryQuery.consumes(petStatusChanged, { pattern: "conformist" });
inventoryQuery.consumes(petReserved, { pattern: "conformist" });
inventoryQuery.consumes(petSold, { pattern: "conformist" });
inventoryQuery.consumes(orderApproved, { pattern: "conformist" });
inventoryQuery.consumes(orderDelivered, { pattern: "conformist" });
inventoryQuery.consumes(orderDeleted, { pattern: "conformist" });
// InventoryQuery does not consume its own InventoryUpdated. A consumption is
// one node depending on another's consumable; a node taking in what it itself
// provides records no dependency, and the raise on RecountInventory already
// says where the fact comes from. It was written as an example of a
// pattern-less same-context consumption, which PetApp's ReservePet and
// OrderApp's DeliverOrder both show for real (card 90).

inventoryBC
	.addPolicy("Recount on stock change", {
		description: "Keep the availability projection current",
	})
	.on(
		petRegistered,
		petDeleted,
		petStatusChanged,
		petReserved,
		petSold,
		orderApproved,
		orderDelivered,
		orderDeleted,
	)
	.issues(recountInventory);

inventoryBC.addTerm("Availability", {
	definition:
		"How many pets are available, pending and sold right now; a projection, not a source of truth",
	aliases: ["Stock"],
	embodiedBy: inventoryQuery,
});

/* =======================
   IDENTITY: legacy user store
   Demonstrates: a big ball of mud modelled only at its boundary. The
   aggregate records the legacy shape as found (an untyped status int) and
   the service lists the endpoints other contexts might call.
   ======================= */

const userAgg = identityBC.addAggregate("User", {
	description: "Petstore user record, as the legacy API shapes it",
});

const userRoot = userAgg.addRootEntity("User", {
	description: "A registered user of the store",
});

const userStatusVO = identityBC.addValueObject("UserStatus", {
	description:
		"Untyped int per the Petstore v3 model; nobody remembers the meaning of each value",
});
userStatusVO.addAttribute("value", { type: "int" });

userRoot.addAttribute("username", { type: "string", identity: true });
userRoot.addAttribute("email", { type: "string" });
userRoot.addAttribute("userStatus", {
	type: "UserStatus",
	valueobject: userStatusVO,
});
userRoot.uses(userStatusVO, "has-status", "1");

const userRegistered = userAgg.provides("UserRegistered", {
	description: "New user created",
	type: "event",
	pattern: "published-language",
});
const userLoggedIn = userAgg.provides("UserLoggedIn", {
	description: "Login via /user/login",
	type: "event",
	pattern: "published-language",
});
const userLoggedOut = userAgg.provides("UserLoggedOut", {
	description: "Logout via /user/logout",
	type: "event",
	pattern: "published-language",
});

const userApp = identityBC.addService("UserApp", {
	description: "Open-host service for /user endpoints",
	type: "application",
});
userApp
	.provides("CreateUser", {
		description: "POST /user",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(userRegistered);
userApp
	.provides("Login", {
		description:
			"GET /user/login?username=&password= (a GET with credentials: legacy, recorded not endorsed)",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(userLoggedIn);
userApp
	.provides("Logout", {
		description: "GET /user/logout",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(userLoggedOut);
// A returned shape: what GetUserByUsername answers with.
const userSchema = identityBC.addSchema("User", {
	description:
		"The legacy user record, as GET /user/{username} answers with it",
});
userSchema.addAttribute("username", { type: "string", identity: true });
userSchema.addAttribute("email", { type: "string" });
userSchema.addAttribute("userStatus", {
	type: "UserStatus",
	valueobject: userStatusVO,
});
userApp.provides("GetUserByUsername", {
	description: "GET /user/{username}",
	type: "operation",
	pattern: "open-host-service",
	returns: userSchema,
});

identityBC.addTerm("User", {
	definition: "Someone with a login; orders never refer to one",
	aliases: ["Account"],
	embodiedBy: userAgg,
});

/* =======================
   CONTEXT RELATIONSHIPS
   Demonstrates: each of the five relationship types exactly once, with the
   upstream and downstream roles where the type is directed.
   ======================= */

// customer-supplier: Sales can ask Catalog for changes to the summary contract,
// and Catalog commits to it. Sales still protects itself with an ACL.
salesBC.downstreamOf(catalogBC, {
	type: "customer-supplier",
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
	description:
		"Sales needs pet availability; Catalog commits to the summary contract",
	comments: [
		{
			text: "Sales reads Catalog through PetSummaryClient, which maps the catalog payload onto the Sales order model.",
			link: {
				kind: "code",
				url: "https://github.com/example/petstore/blob/main/sales/acl/PetSummaryClient.ts",
				label: "sales/acl/PetSummaryClient.ts",
			},
		},
		{
			text: "The summary contract is versioned and published; Catalog will not break it without a major release.",
			link: {
				kind: "contract",
				url: "https://github.com/example/petstore/blob/main/catalog/openapi.yaml",
				label: "catalog/openapi.yaml",
			},
		},
	],
});

// upstream-downstream: Inventory conforms to whatever Sales publishes and has no say in it.
inventoryBC.downstreamOf(salesBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
	description: "The projection counts orders as Sales reports them",
	disposition: "tolerated",
	comments: [
		{
			text: "The projection conforms to the Sales order events rather than translating them; accepted while Inventory stays read-only.",
			link: {
				kind: "code",
				url: "https://github.com/example/petstore/blob/main/inventory/projection/OrderEventHandler.ts",
				label: "inventory/projection/OrderEventHandler.ts",
			},
		},
	],
});

// shared-kernel: both contexts belong to the Pet Shop Team and share the
// PetStatus vocabulary, so a change to it is made in one place for both.
catalogBC.sharesKernelWith(inventoryBC, {
	description: "PetStatus and its values are one shared definition",
	disposition: "refactor",
	comments: [
		{
			text: "PetStatus and its values live in @petstore/kernel and both services compile against it.",
			link: {
				kind: "code",
				url: "https://github.com/example/petstore/blob/main/packages/kernel/src/PetStatus.ts",
				label: "packages/kernel/src/PetStatus.ts",
			},
		},
		{
			text: "The kernel has grown past the status enum and now carries pricing rules; it should become a Published Language from Catalog.",
			link: {
				kind: "adr",
				url: "https://github.com/example/petstore/blob/main/docs/adr/014-shrink-the-kernel.md",
				label: "ADR-014 Shrink the kernel",
			},
		},
	],
});

// partnership: the Orders Team owns both and releases them together. The
// traffic runs one way — Fulfilment reacts to OrderApproved and calls Sales'
// ConfirmDelivery, and Sales asks Fulfilment for nothing — which is a
// partnership all the same: what binds the two is the release train, not the
// direction of the arrows (decision 20's second amendment).
salesBC.partnerOf(fulfilmentBC, {
	description:
		"Order lifecycle and shipment lifecycle are designed and released together",
	comments: [
		// Deliberately uncited: a comment does not need a link to be evidence,
		// and the report has to read well when nobody has one to give.
		{
			text: "Both services ship from one release train; the pipeline deploys sales and fulfilment as a pair and fails the build if only one is tagged.",
		},
		{
			text: "OrderApproved crosses into Fulfilment and Fulfilment calls ConfirmDelivery back, both with no translation layer. Neither side treats the other as a supplier to be protected from, which is what makes this a partnership rather than customer-supplier; the traffic happening to run one way says nothing about that.",
		},
	],
});

// separate-ways: orders carry no user link, so the two never integrate.
identityBC.separateWaysFrom(salesBC, {
	description: "Orders are anonymous in Petstore v3; no integration by design",
	comments: [
		{
			text: "The order payload carries no user field and the Sales service holds no credentials for the Identity API, so nothing links an order to an account.",
			link: {
				kind: "contract",
				url: "https://github.com/example/petstore/blob/main/sales/openapi.yaml",
				label: "sales/openapi.yaml",
			},
		},
		{
			text: "Keeping the two apart is deliberate: checkout must work for a visitor who never signs in.",
			link: {
				kind: "adr",
				url: "https://github.com/example/petstore/blob/main/docs/adr/007-anonymous-checkout.md",
				label: "ADR-007 Anonymous checkout",
			},
		},
	],
});
