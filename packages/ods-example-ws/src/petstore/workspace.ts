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
	description: "{ id?: number, name?: string }",
});
const tagVO = petAgg.addValueObject("Tag", {
	description: "{ id?: number, name?: string }",
});
const photoUrlVO = petAgg.addValueObject("PhotoUrl", {
	description: "string (URL)",
});
const petStatusVO = petAgg.addValueObject("PetStatus", {
	description: "'available' | 'pending' | 'sold'",
});

petRoot.uses(categoryVO, "categorized-as");
petRoot.uses(tagVO, "tagged-with");
petRoot.uses(photoUrlVO, "has-photo");
petRoot.uses(petStatusVO, "has-status");

petAgg.addInvariant("NameRequired", {
	description: "Pet.name must be non-empty",
});
petAgg.addInvariant("SoldNotReopen", {
	description: "Once sold, do not revert to available without explicit policy",
});

// Aggregate events (published-language)
const petRegisteredEvent = petAgg.addEvent("PetRegistered", {
	description: "A new pet was registered",
});
petRegisteredEvent.addAttribute("petId", { type: "int64", identity: true });
petRegisteredEvent.addAttribute("name", { type: "string" });
petRegisteredEvent.addAttribute("category", {
	type: "Category",
	valueobject: categoryVO,
});
petRegisteredEvent.addAttribute("status", {
	type: "PetStatus",
	valueobject: petStatusVO,
});
const petRegisteredPublished = petAgg.publishes(petRegisteredEvent, {
	pattern: "published-language",
});
const _petUpdatedEvent = petAgg.addEvent("PetUpdated", {
	description: "Pet profile updated",
});
const _petUpdatedPublished = petAgg.publishes(_petUpdatedEvent, {
	pattern: "published-language",
});
const petStatusChangedEvent = petAgg.addEvent("PetStatusChanged", {
	description: "Pet status changed (available|pending|sold)",
});
petStatusChangedEvent.addAttribute("petId", { type: "int64", identity: true });
petStatusChangedEvent.addAttribute("from", {
	type: "PetStatus",
	valueobject: petStatusVO,
});
petStatusChangedEvent.addAttribute("to", {
	type: "PetStatus",
	valueobject: petStatusVO,
});
const petStatusChangedPublished = petAgg.publishes(petStatusChangedEvent, {
	pattern: "published-language",
});
const _petPhotoUploadedEvent = petAgg.addEvent("PetPhotoUploaded", {
	description: "Photo added via upload",
});
const _petPhotoUploadedPublished = petAgg.publishes(_petPhotoUploadedEvent, {
	pattern: "published-language",
});
const petDeletedEvent = petAgg.addEvent("PetDeleted", {
	description: "Pet removed from catalog",
});
const petDeletedPublished = petAgg.publishes(petDeletedEvent, {
	pattern: "published-language",
});

// Service: PetApp (open-host)
const petApp = catalogBC.addService("PetApp", {
	description: "Open-host service for /pet endpoints",
	type: "application",
});

const _addPetOp = petApp.provides("AddPet", {
	description: "POST /pet",
	type: "operation",
	pattern: "open-host-service",
});
const _updatePetOp = petApp.provides("UpdatePet", {
	description: "PUT /pet",
	type: "operation",
	pattern: "open-host-service",
});
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
const _uploadImageOp = petApp.provides("UploadPetImage", {
	description:
		"POST /pet/{petId}/uploadImage (multipart: additionalMetadata, file)",
	type: "operation",
	pattern: "open-host-service",
});
const _deletePetOp = petApp.provides("DeletePet", {
	description: "DELETE /pet/{petId}",
	type: "operation",
	pattern: "open-host-service",
});

// Internal ACL-friendly read
const getPetSummaryOp = petApp.provides("GetPetSummary", {
	description: "Internal: {id,name,status} for ACL checks",
	type: "operation",
	pattern: "open-host-service",
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
	description: "'placed' | 'approved' | 'delivered'",
});
const quantityVO = orderAgg.addValueObject("Quantity", {
	description: "int > 0",
});
const shipDateVO = orderAgg.addValueObject("ShipDate", {
	description: "date-time",
});
const completeFlagVO = orderAgg.addValueObject("CompleteFlag", {
	description: "boolean",
});

orderRoot.uses(orderStatusVO, "has-status");
orderRoot.uses(quantityVO, "has-quantity");
orderRoot.uses(shipDateVO, "ships-on");
orderRoot.uses(completeFlagVO, "is-complete");

orderAgg.addInvariant("QuantityPositive", {
	description: "Quantity must be > 0",
});
orderAgg.addInvariant("ApproveOnlyWhenAvailable", {
	description: "Approve only if Pet.status == available",
});
orderAgg.addInvariant("DeliverOnlyWhenApproved", {
	description: "Deliver only from approved",
});

// Aggregate events
const _orderPlacedEvent = orderAgg.addEvent("OrderPlaced", {
	description: "Order created (status=placed)",
});
_orderPlacedEvent.addAttribute("orderId", { type: "int64", identity: true });
_orderPlacedEvent.addAttribute("petId", { type: "int64" });
_orderPlacedEvent.addAttribute("quantity", {
	type: "Quantity",
	valueobject: quantityVO,
});
const _orderPlacedPublished = orderAgg.publishes(_orderPlacedEvent, {
	pattern: "published-language",
});
const orderApprovedEvent = orderAgg.addEvent("OrderApproved", {
	description: "Order approved (status=approved)",
});
const orderApprovedPublished = orderAgg.publishes(orderApprovedEvent, {
	pattern: "published-language",
});
const orderDeliveredEvent = orderAgg.addEvent("OrderDelivered", {
	description: "Order delivered (status=delivered)",
});
const orderDeliveredPublished = orderAgg.publishes(orderDeliveredEvent, {
	pattern: "published-language",
});
const orderDeletedEvent = orderAgg.addEvent("OrderDeleted", {
	description: "Order deleted via DELETE /store/order/{orderId}",
});
const orderDeletedPublished = orderAgg.publishes(orderDeletedEvent, {
	pattern: "published-language",
});

// Service: OrderApp
const orderApp = salesBC.addService("OrderApp", {
	description: "Open-host service for /store/order endpoints",
	type: "application",
});

const _placeOrderOp = orderApp.provides("PlaceOrder", {
	description: "POST /store/order",
	type: "operation",
	pattern: "open-host-service",
});
const _getOrderByIdOp = orderApp.provides("GetOrderById", {
	description: "GET /store/order/{orderId}",
	type: "operation",
	pattern: "open-host-service",
});
const _deleteOrderOp = orderApp.provides("DeleteOrder", {
	description: "DELETE /store/order/{orderId}",
	type: "operation",
	pattern: "open-host-service",
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

// Projection event
const inventoryUpdatedEvent = inventoryAgg.addEvent("InventoryUpdated", {
	description: "Inventory counts changed",
});
const inventoryUpdatedPublished = inventoryAgg.publishes(
	inventoryUpdatedEvent,
	{
		pattern: "published-language",
	},
);

// Inventory listens to Catalog & Sales events (conformist)
inventoryAgg.consumes(petRegisteredPublished, { pattern: "conformist" });
inventoryAgg.consumes(petDeletedPublished, { pattern: "conformist" });
inventoryAgg.consumes(petStatusChangedPublished, { pattern: "conformist" });
inventoryAgg.consumes(orderApprovedPublished, { pattern: "conformist" });
inventoryAgg.consumes(orderDeliveredPublished, { pattern: "conformist" });
inventoryAgg.consumes(orderDeletedPublished, { pattern: "conformist" });

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
inventoryQuery.consumes(inventoryUpdatedPublished, { pattern: "conformist" });

/* =======================
   IDENTITY — Aggregate & Service
   ======================= */

// Aggregate: User
const userAgg = identityBC.addAggregate("User", {
	description: "Petstore user record",
});

const userRoot = userAgg.addRootEntity("User", {
	description:
		"username, firstName, lastName, email, password, phone, userStatus(int)",
});

const userStatusVO = userAgg.addValueObject("UserStatus", {
	description: "int (per Petstore v3 model)",
});

userRoot.uses(userStatusVO, "has-status");

// User events
const _userRegisteredEvent = userAgg.addEvent("UserRegistered", {
	description: "New user created",
});
const _userRegisteredPublished = userAgg.publishes(_userRegisteredEvent, {
	pattern: "published-language",
});
const _userUpdatedEvent = userAgg.addEvent("UserUpdated", {
	description: "User fields updated",
});
const _userUpdatedPublished = userAgg.publishes(_userUpdatedEvent, {
	pattern: "published-language",
});
const _userDeletedEvent = userAgg.addEvent("UserDeleted", {
	description: "User removed",
});
const _userDeletedPublished = userAgg.publishes(_userDeletedEvent, {
	pattern: "published-language",
});
const _userLoggedInEvent = userAgg.addEvent("UserLoggedIn", {
	description: "Login via /user/login",
});
const _userLoggedInPublished = userAgg.publishes(_userLoggedInEvent, {
	pattern: "published-language",
});
const _userLoggedOutEvent = userAgg.addEvent("UserLoggedOut", {
	description: "Logout via /user/logout",
});
const _userLoggedOutPublished = userAgg.publishes(_userLoggedOutEvent, {
	pattern: "published-language",
});

// Service: UserApp
const userApp = identityBC.addService("UserApp", {
	description: "Open-host service for /user endpoints",
	type: "application",
});

const _createUserOp = userApp.provides("CreateUser", {
	description: "POST /user",
	type: "operation",
	pattern: "open-host-service",
});
const _createUsersWithArrayOp = userApp.provides("CreateUsersWithArray", {
	description: "POST /user/createWithArray",
	type: "operation",
	pattern: "open-host-service",
});
const _createUsersWithListOp = userApp.provides("CreateUsersWithList", {
	description: "POST /user/createWithList",
	type: "operation",
	pattern: "open-host-service",
});
const _loginOp = userApp.provides("Login", {
	description: "GET /user/login?username=&password=",
	type: "operation",
	pattern: "open-host-service",
});
const _logoutOp = userApp.provides("Logout", {
	description: "GET /user/logout",
	type: "operation",
	pattern: "open-host-service",
});
const _getUserByUsernameOp = userApp.provides("GetUserByUsername", {
	description: "GET /user/{username}",
	type: "operation",
	pattern: "open-host-service",
});
const _updateUserOp = userApp.provides("UpdateUser", {
	description: "PUT /user/{username}",
	type: "operation",
	pattern: "open-host-service",
});
const _deleteUserOp = userApp.provides("DeleteUser", {
	description: "DELETE /user/{username}",
	type: "operation",
	pattern: "open-host-service",
});
