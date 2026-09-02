import { Workspace } from "@open-domain-specification/core";

/**
 * Swagger Petstore (OpenAPI 3) — ODS Core Workspace
 * Modes: Domains → Subdomains → Bounded Contexts → Aggregates / Services
 * Services expose operations (open-host-service); Aggregates publish events (published-language).
 */
export const workspace = new Workspace("Swagger Petstore (v3)", {
	odsVersion: "1.0.0",
	description:
		"DDD/ODS model for Swagger Petstore v3. Inventory is a projection returning a status→count map; Orders use placed|approved|delivered.",
	version: "0.1.0",
	homepage: "https://petstore.swagger.io/",
	primaryColor: "#0ea5e9",
	logoUrl: "https://petstore.swagger.io/favicon-32x32.png",
});

/* =======================
   DOMAINS & SUBDOMAINS
   ======================= */

const commerce = workspace.addDomain("Petstore Commerce", {
	description: "Core pet catalog, sales, and inventory capabilities",
});

const identity = workspace.addDomain("Identity & Accounts", {
	description: "Users and sessions per Petstore API",
});

const catalogSD = commerce.addSubdomain("Catalog", {
	type: "core",
	description: "Pet definitions, attributes, lifecycle",
});
const salesSD = commerce.addSubdomain("Sales", {
	type: "core",
	description: "Orders and order lifecycle",
});
const inventorySD = commerce.addSubdomain("Inventory", {
	type: "supporting",
	description: "Aggregated availability by status",
});
const usersSD = identity.addSubdomain("Users", {
	type: "generic",
	description: "User records and login/logout",
});

/* =======================
   TEAMS
   ======================= */

const petShopTeam = workspace.addTeam("Pet Shop Team", {
	description: "Owns the catalog and the inventory projection",
});
const ordersTeam = workspace.addTeam("Orders Team", {
	description: "Owns order taking and fulfilment",
});
const platformTeam = workspace.addTeam("Platform Team", {
	description: "Runs the legacy user store",
	homepage: "https://petstore.swagger.io/#/user",
});

/* =======================
   BOUNDED CONTEXTS
   ======================= */

const catalogBC = catalogSD.addBoundedcontext("Catalog BC", {
	description: "Owns Pet aggregate & pet-facing operations",
	team: petShopTeam,
});
const salesBC = salesSD.addBoundedcontext("Sales BC", {
	description: "Owns Order aggregate & order-facing operations",
	team: ordersTeam,
});
// A context may serve several subdomains: the inventory projection is
// built from catalog data as well as sales, so it serves both.
const inventoryBC = workspace.addBoundedContext("Inventory BC", {
	description: "Projection for /store/inventory (status→count)",
	subdomains: [inventorySD, catalogSD],
	team: petShopTeam,
});
const identityBC = usersSD.addBoundedcontext("Identity BC", {
	description:
		"Owns User aggregate & user endpoints. Legacy: user status is an untyped int and login is a GET",
	bigBallOfMud: true,
	team: platformTeam,
});

/* =======================
   CATALOG — Aggregate & Service
   ======================= */

// Aggregate: Pet
const petAgg = catalogBC.addAggregate("Pet", {
	description: "A pet listed in the store",
});

const petRoot = petAgg.addRootEntity("Pet", {
	description: "Pet root entity",
});

const categoryVO = petAgg.addValueObject("Category", {
	description: "The kind of animal, e.g. Dogs",
});
categoryVO.addAttribute("id", { type: "int64" });
categoryVO.addAttribute("name", { type: "string" });

const tagVO = petAgg.addValueObject("Tag", {
	description: "Free-form label on a pet",
});
tagVO.addAttribute("id", { type: "int64" });
tagVO.addAttribute("name", { type: "string" });

const photoUrlVO = petAgg.addValueObject("PhotoUrl", {
	description: "Where a photo of the pet can be fetched",
});
photoUrlVO.addAttribute("url", { type: "string (URL)" });

const petStatusVO = petAgg.addValueObject("PetStatus", {
	description: "Where the pet is in its sales lifecycle",
});
petStatusVO.addAttribute("value", {
	type: "'available' | 'pending' | 'sold'",
});

petRoot.addAttribute("id", { type: "int64", identity: true });
petRoot.addAttribute("name", { type: "string" });
petRoot.addAttribute("category", { type: "Category", valueobject: categoryVO });
petRoot.addAttribute("photoUrls", {
	type: "PhotoUrl[]",
	valueobject: photoUrlVO,
});
petRoot.addAttribute("tags", { type: "Tag[]", valueobject: tagVO });
petRoot.addAttribute("status", { type: "PetStatus", valueobject: petStatusVO });

petRoot.uses(categoryVO, "categorized-as", "0..1");
petRoot.uses(tagVO, "tagged-with", "*");
petRoot.uses(photoUrlVO, "has-photo", "1..*");
petRoot.uses(petStatusVO, "has-status", "1");

petAgg
	.addInvariant("NameRequired", {
		description: "Pet.name must be non-empty",
	})
	.constrains(petRoot.attributes.get("name")!);
petAgg
	.addInvariant("SoldNotReopen", {
		description:
			"Once sold, do not revert to available without explicit policy",
	})
	.constrains(petStatusVO);

// Payload schemas (published language of the catalog)
const petRegisteredSchema = catalogBC.addSchema("PetRegistered", {
	description: "What the outside learns when a pet joins the catalog",
});
petRegisteredSchema.addAttribute("petId", { type: "int64", identity: true });
petRegisteredSchema.addAttribute("name", { type: "string" });
petRegisteredSchema.addAttribute("category", {
	type: "Category",
	valueobject: categoryVO,
});
petRegisteredSchema.addAttribute("status", {
	type: "PetStatus",
	valueobject: petStatusVO,
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
registerPetSchema.addAttribute("photoUrls", {
	type: "PhotoUrl[]",
	valueobject: photoUrlVO,
});
const petIdSchema = catalogBC.addSchema("PetId", {
	description: "Identifies one pet",
});
petIdSchema.addAttribute("petId", { type: "int64", identity: true });

// Events the Pet aggregate publishes (published-language)
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
});
const petStatusChanged = petAgg.provides("PetStatusChanged", {
	description: "Pet status changed (available|pending|sold)",
	type: "event",
	pattern: "published-language",
	schema: petStatusChangedSchema,
});
const petPhotoUploaded = petAgg.provides("PetPhotoUploaded", {
	description: "Photo added via upload",
	type: "event",
	pattern: "published-language",
});
const petDeleted = petAgg.provides("PetDeleted", {
	description: "Pet removed from catalog",
	type: "event",
	pattern: "published-language",
});

// Internal operation: only the catalog itself moves a pet between statuses
const _changePetStatus = petAgg
	.provides("ChangePetStatus", {
		description: "Move a pet between available, pending and sold",
		type: "operation",
		internal: true,
		schema: petStatusChangedSchema,
	})
	.raises(petStatusChanged);

// Service: PetApp (open-host)
const petApp = catalogBC.addService("PetApp", {
	description: "Open-host service for /pet endpoints",
	type: "application",
});

const _addPetOp = petApp
	.provides("AddPet", {
		description: "POST /pet",
		type: "operation",
		pattern: "open-host-service",
		schema: registerPetSchema,
	})
	.raises(petRegistered);
const _updatePetOp = petApp
	.provides("UpdatePet", {
		description: "PUT /pet",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(petUpdated);
const _findByStatusOp = petApp.provides("FindPetsByStatus", {
	description: "GET /pet/findByStatus?status=available|pending|sold",
	type: "operation",
	pattern: "open-host-service",
});
const _findByTagsOp = petApp.provides("FindPetsByTags", {
	description: "GET /pet/findByTags?tags=tag1,tag2",
	type: "operation",
	pattern: "open-host-service",
});
const _getPetByIdOp = petApp.provides("GetPetById", {
	description: "GET /pet/{petId}",
	type: "operation",
	pattern: "open-host-service",
});
const _uploadImageOp = petApp
	.provides("UploadPetImage", {
		description:
			"POST /pet/{petId}/uploadImage (multipart: additionalMetadata, file)",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(petPhotoUploaded);
const _deletePetOp = petApp
	.provides("DeletePet", {
		description: "DELETE /pet/{petId}",
		type: "operation",
		pattern: "open-host-service",
		schema: petIdSchema,
	})
	.raises(petDeleted);

// Internal ACL-friendly read
const getPetSummaryOp = petApp.provides("GetPetSummary", {
	description:
		"Slim {id,name,status} read offered to other contexts for ACL checks",
	type: "operation",
	pattern: "open-host-service",
});

// Ubiquitous language of the catalog
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
   SALES — Aggregate & Service
   ======================= */

// Aggregate: Order
const orderAgg = salesBC.addAggregate("Order", {
	description: "Order for a single pet",
});

const orderRoot = orderAgg.addRootEntity("Order", {
	description: "Order root entity",
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
	description: "When the order ships",
});
shipDateVO.addAttribute("value", { type: "date-time" });
const completeFlagVO = orderAgg.addValueObject("CompleteFlag", {
	description: "Whether the order is complete",
});
completeFlagVO.addAttribute("value", { type: "boolean" });

orderRoot.addAttribute("id", { type: "int64", identity: true });
orderRoot.addAttribute("petId", { type: "int64" });
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
orderRoot.addAttribute("complete", {
	type: "CompleteFlag",
	valueobject: completeFlagVO,
});

orderRoot.uses(orderStatusVO, "has-status", "1");
orderRoot.uses(quantityVO, "has-quantity", "1");
orderRoot.uses(shipDateVO, "ships-on", "0..1");
orderRoot.uses(completeFlagVO, "is-complete", "1");
// Cross-aggregate reference by identity to the Pet root
orderRoot.references(petRoot, "for-pet", "1");

orderAgg
	.addInvariant("QuantityPositive", {
		description: "Quantity must be > 0",
	})
	.constrains(quantityVO);
orderAgg
	.addInvariant("ApproveOnlyWhenAvailable", {
		description: "Approve only if Pet.status == available",
	})
	.constrains(orderStatusVO, petStatusVO);
orderAgg
	.addInvariant("DeliverOnlyWhenApproved", {
		description: "Deliver only from approved",
	})
	.constrains(orderStatusVO);

// Payload schemas
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

// Events the Order aggregate publishes
const orderPlaced = orderAgg.provides("OrderPlaced", {
	description: "Order created (status=placed)",
	type: "event",
	pattern: "published-language",
	schema: orderPlacedSchema,
});
const orderApproved = orderAgg.provides("OrderApproved", {
	description: "Order approved (status=approved)",
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

// Internal operations: the order lifecycle is driven from inside sales
const approveOrder = orderAgg
	.provides("ApproveOrder", {
		description: "Approve a placed order once the pet is available",
		type: "operation",
		internal: true,
		schema: orderIdSchema,
	})
	.raises(orderApproved);
const _deliverOrder = orderAgg
	.provides("DeliverOrder", {
		description: "Mark an approved order as delivered",
		type: "operation",
		internal: true,
		schema: orderIdSchema,
	})
	.raises(orderDelivered);

// Service: OrderApp
const orderApp = salesBC.addService("OrderApp", {
	description: "Open-host service for /store/order endpoints",
	type: "application",
});

const _placeOrderOp = orderApp
	.provides("PlaceOrder", {
		description: "POST /store/order",
		type: "operation",
		pattern: "open-host-service",
		schema: placeOrderSchema,
	})
	.raises(orderPlaced);
const _getOrderByIdOp = orderApp.provides("GetOrderById", {
	description: "GET /store/order/{orderId}",
	type: "operation",
	pattern: "open-host-service",
});
const _deleteOrderOp = orderApp
	.provides("DeleteOrder", {
		description: "DELETE /store/order/{orderId}",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(orderDeleted);

// Ubiquitous language of sales
salesBC.addTerm("Order", {
	definition: "A customer's request to buy one pet in a given quantity",
	aliases: ["Purchase"],
	embodiedBy: orderAgg,
});
salesBC.addTerm("Approval", {
	definition: "Confirmation that the ordered pet is available and reserved",
	embodiedBy: approveOrder,
});

// OrderApp depends on Catalog for status checks
orderApp.consumes(getPetSummaryOp, { pattern: "anti-corruption-layer" });

/* =======================
   CONTEXT RELATIONSHIPS
   ======================= */

// Sales is a customer of Catalog: it can ask for changes to the pet summary
// contract, and protects itself with an anti-corruption layer.
salesBC.downstreamOf(catalogBC, {
	type: "customer-supplier",
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
	description:
		"Sales needs pet availability; Catalog commits to the summary contract",
});

// Identity is deliberately kept apart from Sales: orders carry no user link.
identityBC.separateWaysFrom(
	salesBC,
	"Orders are anonymous in Petstore v3; no integration by design",
);

// Policy: a placed order is approved as soon as its pet is available
salesBC
	.addPolicy("Approve when pet available", {
		description:
			"When a pet becomes available and an order for it is placed, approve the order",
	})
	.on(petStatusChanged, orderPlaced)
	.then(approveOrder);

/* =======================
   INVENTORY — Projection & Service
   ======================= */

// Aggregate (projection): InventoryProjection
const inventoryAgg = inventoryBC.addAggregate("InventoryProjection", {
	description:
		"Materialized view: { available: number, pending: number, sold: number }",
});

const _invView = inventoryAgg.addRootEntity("InventoryView", {
	description: "Status→count map for /store/inventory",
});

// Projection event and the internal operation that rebuilds it
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

// Inventory listens to Catalog & Sales events (conformist)
inventoryAgg.consumes(petRegistered, { pattern: "conformist" });
inventoryAgg.consumes(petDeleted, { pattern: "conformist" });
inventoryAgg.consumes(petStatusChanged, { pattern: "conformist" });
inventoryAgg.consumes(orderApproved, { pattern: "conformist" });
inventoryAgg.consumes(orderDelivered, { pattern: "conformist" });
inventoryAgg.consumes(orderDeleted, { pattern: "conformist" });

inventoryBC.addTerm("Availability", {
	definition:
		"How many pets are available, pending and sold right now; a projection, not a source of truth",
	aliases: ["Stock"],
	embodiedBy: inventoryAgg,
});

// Policy: any stock-affecting fact triggers a recount
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

// Service: InventoryQuery
const inventoryQuery = inventoryBC.addService("InventoryQuery", {
	description: "Open-host service for /store/inventory",
	type: "application",
});

const _getInventoryOp = inventoryQuery.provides("GetInventory", {
	description: "GET /store/inventory → { [status]: count }",
	type: "operation",
	pattern: "open-host-service",
});

// Service consumes its own projection's update to drive re-query/push, if desired
inventoryQuery.consumes(inventoryUpdated, { pattern: "conformist" });

/* =======================
   IDENTITY — Aggregate & Service
   ======================= */

// Aggregate: User
const userAgg = identityBC.addAggregate("User", {
	description: "Petstore user record",
});

const userRoot = userAgg.addRootEntity("User", {
	description: "A registered user of the store",
});

const userStatusVO = userAgg.addValueObject("UserStatus", {
	description: "Untyped int per the Petstore v3 model",
});
userStatusVO.addAttribute("value", { type: "int" });

userRoot.addAttribute("username", { type: "string", identity: true });
userRoot.addAttribute("firstName", { type: "string" });
userRoot.addAttribute("lastName", { type: "string" });
userRoot.addAttribute("email", { type: "string" });
userRoot.addAttribute("phone", { type: "string" });
userRoot.addAttribute("userStatus", {
	type: "UserStatus",
	valueobject: userStatusVO,
});

userRoot.uses(userStatusVO, "has-status");

// Events the User aggregate publishes
const userEvent = (name: string, description: string) =>
	userAgg.provides(name, {
		description,
		type: "event",
		pattern: "published-language",
	});
const userRegistered = userEvent("UserRegistered", "New user created");
const userUpdated = userEvent("UserUpdated", "User fields updated");
const userDeleted = userEvent("UserDeleted", "User removed");
const userLoggedIn = userEvent("UserLoggedIn", "Login via /user/login");
const userLoggedOut = userEvent("UserLoggedOut", "Logout via /user/logout");

// Service: UserApp
const userApp = identityBC.addService("UserApp", {
	description: "Open-host service for /user endpoints",
	type: "application",
});

const _createUserOp = userApp
	.provides("CreateUser", {
		description: "POST /user",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(userRegistered);
const _createUsersWithArrayOp = userApp
	.provides("CreateUsersWithArray", {
		description: "POST /user/createWithArray",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(userRegistered);
const _createUsersWithListOp = userApp
	.provides("CreateUsersWithList", {
		description: "POST /user/createWithList",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(userRegistered);
const _loginOp = userApp
	.provides("Login", {
		description: "GET /user/login?username=&password=",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(userLoggedIn);
const _logoutOp = userApp
	.provides("Logout", {
		description: "GET /user/logout",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(userLoggedOut);
const _getUserByUsernameOp = userApp.provides("GetUserByUsername", {
	description: "GET /user/{username}",
	type: "operation",
	pattern: "open-host-service",
});
const _updateUserOp = userApp
	.provides("UpdateUser", {
		description: "PUT /user/{username}",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(userUpdated);
const _deleteUserOp = userApp
	.provides("DeleteUser", {
		description: "DELETE /user/{username}",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(userDeleted);
