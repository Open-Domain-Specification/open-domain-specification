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
 * services, schemas, policies and glossary, and finally the context map.
 */
export const workspace = new Workspace("Swagger Petstore (v3)", {
	odsVersion: "1.0.0",
	description:
		"DDD/ODS model for Swagger Petstore v3. Inventory is a projection returning a status→count map; Orders use placed|approved|delivered.",
	version: "0.2.0",
	homepage: "https://petstore.swagger.io/",
	primaryColor: "#0ea5e9",
	logoUrl: "https://petstore.swagger.io/favicon-32x32.png",
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
const categoryVO = petAgg.addValueObject("Category", {
	description:
		"The kind of animal, e.g. Dogs. A value because two pets in Dogs share one category",
});
categoryVO.addAttribute("id", { type: "int64" });
categoryVO.addAttribute("name", { type: "string" });

const tagVO = petAgg.addValueObject("Tag", {
	description: "Free-form label on a pet",
});
tagVO.addAttribute("name", { type: "string" });

const photoUrlVO = petAgg.addValueObject("PhotoUrl", {
	description: "Where a photo of the pet can be fetched",
});
photoUrlVO.addAttribute("url", { type: "string (URL)" });

const petStatusVO = petAgg.addValueObject("PetStatus", {
	description:
		"Where the pet is in its sales lifecycle. Shared with Inventory, which keys its counts by these values",
});
petStatusVO.addAttribute("value", {
	type: "'available' | 'pending' | 'sold'",
});

// Attributes: `identity` marks the one that identifies the entity, and
// `valueobject` links an attribute to the value object that types it.
petRoot.addAttribute("id", { type: "int64", identity: true });
petRoot.addAttribute("name", { type: "string" });
petRoot.addAttribute("category", { type: "Category", valueobject: categoryVO });
petRoot.addAttribute("photoUrls", {
	type: "PhotoUrl[]",
	valueobject: photoUrlVO,
});
petRoot.addAttribute("tags", { type: "Tag[]", valueobject: tagVO });
petRoot.addAttribute("status", { type: "PetStatus", valueobject: petStatusVO });

// `uses` is the relation to a value object; the cardinalities cover 0..1, *, 1..* and 1.
petRoot.uses(categoryVO, "categorized-as", "0..1");
petRoot.uses(tagVO, "tagged-with", "*");
petRoot.uses(photoUrlVO, "has-photo", "1..*");
petRoot.uses(petStatusVO, "has-status", "1");

// Invariants name the rule and point at what it constrains: an attribute here, a value object below.
petAgg
	.addInvariant("NameRequired", {
		description:
			"Pet.name must be non-empty, because the storefront lists pets by name",
	})
	.constrains(petRoot.attributes.get("name")!);
petAgg
	.addInvariant("SoldNotReopen", {
		description:
			"Once sold, a pet does not revert to available without an explicit policy, so a buyer is never undercut",
	})
	.constrains(petStatusVO);

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
const petStatusChanged = petAgg.provides("PetStatusChanged", {
	description: "Pet status changed (available|pending|sold)",
	type: "event",
	pattern: "published-language",
	schema: petStatusChangedSchema,
});
const petDeleted = petAgg.provides("PetDeleted", {
	description: "Pet removed from catalog",
	type: "event",
	pattern: "published-language",
	schema: petIdSchema,
});

// An internal operation never leaves its context, so it declares no pattern.
// Only the catalog moves a pet between statuses; `raises` links it to the fact it produces.
petAgg
	.provides("ChangePetStatus", {
		description: "Move a pet between available, pending and sold",
		type: "operation",
		internal: true,
		schema: petStatusChangedSchema,
	})
	.raises(petStatusChanged);

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
petApp.provides("FindPetsByStatus", {
	description: "GET /pet/findByStatus?status=available|pending|sold",
	type: "operation",
	pattern: "open-host-service",
});
petApp.provides("GetPetById", {
	description: "GET /pet/{petId}",
	type: "operation",
	pattern: "open-host-service",
	schema: petIdSchema,
});
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
		"Slim {id,name,status} read offered to other contexts, so Sales can check availability without coupling to the full Pet",
	type: "operation",
	pattern: "open-host-service",
	schema: petIdSchema,
});

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
		"A pet that can be ordered; it becomes pending once an order is placed",
	embodiedBy: petStatusVO,
});

/* =======================
   SALES: Order aggregate, OrderApp service
   Demonstrates: a cross-aggregate `references` relation to another context's
   root, an invariant that constrains two value objects, an anti-corruption
   consumption, and a policy that reacts to events from two contexts.
   ======================= */

const orderAgg = salesBC.addAggregate("Order", {
	description: "Order for a single pet",
});

const orderRoot = orderAgg.addRootEntity("Order", {
	description: "The customer's request to buy one pet",
});

const orderStatusVO = orderAgg.addValueObject("OrderStatus", {
	description: "Where the order is in its lifecycle",
});
orderStatusVO.addAttribute("value", {
	type: "'placed' | 'approved' | 'delivered'",
});
const quantityVO = orderAgg.addValueObject("Quantity", {
	description: "How many of the pet are ordered",
});
quantityVO.addAttribute("value", { type: "int > 0" });
const shipDateVO = orderAgg.addValueObject("ShipDate", {
	description:
		"When the order ships; set by Fulfilment once dispatch is planned",
});
shipDateVO.addAttribute("value", { type: "date-time" });

orderRoot.addAttribute("id", { type: "int64", identity: true });
orderRoot.addAttribute("petId", {
	type: "int64",
	description:
		"Identity of the Pet root in Catalog; only the id crosses the boundary",
});
orderRoot.addAttribute("quantity", {
	type: "Quantity",
	valueobject: quantityVO,
});
orderRoot.addAttribute("shipDate", {
	type: "ShipDate",
	valueobject: shipDateVO,
});
orderRoot.addAttribute("status", {
	type: "OrderStatus",
	valueobject: orderStatusVO,
});

orderRoot.uses(orderStatusVO, "has-status", "1");
orderRoot.uses(quantityVO, "has-quantity", "1");
orderRoot.uses(shipDateVO, "ships-on", "0..1");
// `references` is the only relation allowed across aggregates, and it must
// target the other aggregate's root: the order holds the pet's identity, nothing more.
orderRoot.references(petRoot, "for-pet", "1");

orderAgg
	.addInvariant("QuantityPositive", {
		description:
			"Quantity must be > 0; an order for nothing is a mistake, not an order",
	})
	.constrains(quantityVO);
// An invariant may span aggregates when the rule genuinely does: approval
// depends on the pet's status, so both value objects are named.
orderAgg
	.addInvariant("ApproveOnlyWhenAvailable", {
		description: "Approve only if Pet.status == available",
	})
	.constrains(orderStatusVO, petStatusVO);
orderAgg
	.addInvariant("DeliverOnlyWhenApproved", {
		description:
			"Deliver only from approved, so nothing ships that was never checked",
	})
	.constrains(orderStatusVO);

const orderPlacedSchema = salesBC.addSchema("OrderPlaced");
orderPlacedSchema.addAttribute("orderId", { type: "int64", identity: true });
orderPlacedSchema.addAttribute("petId", { type: "int64" });
orderPlacedSchema.addAttribute("quantity", {
	type: "Quantity",
	valueobject: quantityVO,
});
const placeOrderSchema = salesBC.addSchema("PlaceOrder", {
	description: "Request body for placing an order",
});
placeOrderSchema.addAttribute("petId", { type: "int64" });
placeOrderSchema.addAttribute("quantity", {
	type: "Quantity",
	valueobject: quantityVO,
});
const orderIdSchema = salesBC.addSchema("OrderId");
orderIdSchema.addAttribute("orderId", { type: "int64", identity: true });

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

// Approval is internal: only the sales policy below decides it.
const approveOrder = orderAgg
	.provides("ApproveOrder", {
		description: "Approve a placed order once the pet is available",
		type: "operation",
		internal: true,
		schema: orderIdSchema,
	})
	.raises(orderApproved);
// Delivery is confirmed by Fulfilment, so this operation is offered as an
// open host rather than kept internal.
const deliverOrder = orderAgg
	.provides("DeliverOrder", {
		description:
			"Mark an approved order as delivered; issued by Fulfilment when the shipment arrives",
		type: "operation",
		pattern: "open-host-service",
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
});
orderApp
	.provides("DeleteOrder", {
		description: "DELETE /store/order/{orderId}",
		type: "operation",
		pattern: "open-host-service",
		schema: orderIdSchema,
	})
	.raises(orderDeleted);

// Anti-corruption layer: OrderApp translates the catalog's summary into its
// own notion of availability rather than adopting the catalog's model.
orderApp.consumes(getPetSummaryOp, { pattern: "anti-corruption-layer" });

// A policy is "when this happens, do that". It may react to events from
// several contexts, but issues an operation of its own context here.
salesBC
	.addPolicy("Approve when pet available", {
		description:
			"When a pet becomes available and an order for it is placed, approve the order",
	})
	.on(petStatusChanged, orderPlaced)
	.then(approveOrder);

salesBC.addTerm("Order", {
	definition: "A customer's request to buy one pet in a given quantity",
	aliases: ["Purchase"],
	embodiedBy: orderAgg,
});
salesBC.addTerm("Approval", {
	definition: "Confirmation that the ordered pet is available and reserved",
	embodiedBy: approveOrder,
});

/* =======================
   FULFILMENT: Shipment aggregate, DispatchPlanner domain service
   Demonstrates: an `includes` relation to a child entity that cannot exist
   alone, an invariant on an entity, a domain service (logic that belongs to
   no single aggregate), and a policy that issues another context's operation.
   ======================= */

const shipmentAgg = fulfilmentBC.addAggregate("Shipment", {
	description:
		"The journey of one approved order to its owner. Attempts live inside it because they mean nothing without the shipment",
});

const shipmentRoot = shipmentAgg.addRootEntity("Shipment", {
	description: "One consignment for one order",
});
const deliveryAttempt = shipmentAgg.addEntity("DeliveryAttempt", {
	description:
		"A dated try at handing over the pet; an entity because attempts are counted and ordered, a child because it never exists without its shipment",
});
const trackingNumberVO = shipmentAgg.addValueObject("TrackingNumber", {
	description:
		"Carrier reference; a value because two shipments never share one",
});
trackingNumberVO.addAttribute("value", { type: "string" });
const shipmentStatusVO = shipmentAgg.addValueObject("ShipmentStatus", {
	description: "planned, in-transit or delivered",
});
shipmentStatusVO.addAttribute("value", {
	type: "'planned' | 'in-transit' | 'delivered'",
});

shipmentRoot.addAttribute("id", { type: "int64", identity: true });
shipmentRoot.addAttribute("orderId", { type: "int64" });
shipmentRoot.addAttribute("status", {
	type: "ShipmentStatus",
	valueobject: shipmentStatusVO,
});
deliveryAttempt.addAttribute("attemptedAt", { type: "date-time" });
deliveryAttempt.addAttribute("succeeded", { type: "boolean" });

// `includes` is ownership: the attempt is part of the shipment's consistency boundary.
shipmentRoot.includes(deliveryAttempt, "attempted-by", "*");
shipmentRoot.uses(trackingNumberVO, "tracked-as", "1");
shipmentRoot.uses(shipmentStatusVO, "has-status", "1");
shipmentRoot.references(orderRoot, "fulfils", "1");

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
shipmentDeliveredSchema.addAttribute("orderId", { type: "int64" });
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
		"Chooses ship dates across pending shipments so pets of one category travel together",
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

// Conformist: the order events are taken as published, because both contexts
// belong to the Orders Team and the partnership below makes them change together.
shipmentAgg.consumes(orderApproved, { pattern: "conformist" });

fulfilmentBC
	.addPolicy("Plan dispatch on approval", {
		description: "Every approved order gets a shipment planned straight away",
	})
	.on(orderApproved)
	.then(planDispatch);
// A policy whose command lives in another context: Fulfilment tells Sales
// the order is delivered, through the open-host operation Sales offers.
fulfilmentBC
	.addPolicy("Deliver order on delivery", {
		description:
			"When a shipment is delivered, mark the order delivered in Sales",
	})
	.on(shipmentDelivered)
	.then(deliverOrder);

fulfilmentBC.addTerm("Shipment", {
	definition: "The consignment that carries one order to its owner",
	aliases: ["Consignment"],
	embodiedBy: shipmentAgg,
});

/* =======================
   INVENTORY: projection and query service
   Demonstrates: a projection modelled as an aggregate, conformist
   consumptions of events from two contexts, and a policy fanning many
   events into one internal operation.
   ======================= */

const inventoryAgg = inventoryBC.addAggregate("InventoryProjection", {
	description:
		"Materialized view: { available: number, pending: number, sold: number }. An aggregate because the counts are rebuilt as one unit",
});

inventoryAgg.addRootEntity("InventoryView", {
	description: "Status→count map for /store/inventory",
});

const inventoryUpdated = inventoryAgg.provides("InventoryUpdated", {
	description: "Inventory counts changed",
	type: "event",
	pattern: "published-language",
});
const recountInventory = inventoryAgg
	.provides("RecountInventory", {
		description: "Recompute the status→count map from catalog and sales facts",
		type: "operation",
		internal: true,
	})
	.raises(inventoryUpdated);

// Conformist: the projection adopts the published events as they are, which
// is cheap because the shared kernel means the status vocabulary is the same.
inventoryAgg.consumes(petRegistered, { pattern: "conformist" });
inventoryAgg.consumes(petDeleted, { pattern: "conformist" });
inventoryAgg.consumes(petStatusChanged, { pattern: "conformist" });
inventoryAgg.consumes(orderApproved, { pattern: "conformist" });
inventoryAgg.consumes(orderDelivered, { pattern: "conformist" });
inventoryAgg.consumes(orderDeleted, { pattern: "conformist" });

inventoryBC
	.addPolicy("Recount on stock change", {
		description: "Keep the availability projection current",
	})
	.on(
		petRegistered,
		petDeleted,
		petStatusChanged,
		orderApproved,
		orderDelivered,
		orderDeleted,
	)
	.then(recountInventory);

const inventoryQuery = inventoryBC.addService("InventoryQuery", {
	description: "Open-host service for /store/inventory",
	type: "application",
});
inventoryQuery.provides("GetInventory", {
	description: "GET /store/inventory → { [status]: count }",
	type: "operation",
	pattern: "open-host-service",
});
// A consumption inside one context needs no pattern: there is no boundary to protect.
inventoryQuery.consumes(inventoryUpdated, {});

inventoryBC.addTerm("Availability", {
	definition:
		"How many pets are available, pending and sold right now; a projection, not a source of truth",
	aliases: ["Stock"],
	embodiedBy: inventoryAgg,
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

const userStatusVO = userAgg.addValueObject("UserStatus", {
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
userApp.provides("GetUserByUsername", {
	description: "GET /user/{username}",
	type: "operation",
	pattern: "open-host-service",
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
});

// upstream-downstream: Inventory conforms to whatever Sales publishes and has no say in it.
inventoryBC.downstreamOf(salesBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
	description: "The projection counts orders as Sales reports them",
});

// shared-kernel: both contexts belong to the Pet Shop Team and share the
// PetStatus vocabulary, so a change to it is made in one place for both.
catalogBC.sharesKernelWith(
	inventoryBC,
	"PetStatus and its values are one shared definition",
);

// partnership: the Orders Team owns both, releases them together, and each
// issues the other's operations (DeliverOrder) or events (OrderApproved).
salesBC.partnerOf(
	fulfilmentBC,
	"Order lifecycle and shipment lifecycle are designed and released together",
);

// separate-ways: orders carry no user link, so the two never integrate.
identityBC.separateWaysFrom(
	salesBC,
	"Orders are anonymous in Petstore v3; no integration by design",
);
