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
	type: "core",
});

const identity = workspace.addDomain("Identity & Accounts", {
	description: "Users and sessions per Petstore API",
	type: "supporting",
});

const catalogSD = commerce.addSubdomain("Catalog", {
	description: "Pet definitions, attributes, lifecycle",
});
const salesSD = commerce.addSubdomain("Sales", {
	description: "Orders and order lifecycle",
});
const inventorySD = commerce.addSubdomain("Inventory", {
	description: "Aggregated availability by status",
});
const usersSD = identity.addSubdomain("Users", {
	description: "User records and login/logout",
});

/* =======================
   BOUNDED CONTEXTS
   ======================= */

const catalogBC = catalogSD.addBoundedcontext("Catalog BC", {
	description: "Owns Pet aggregate & pet-facing operations",
});
const salesBC = salesSD.addBoundedcontext("Sales BC", {
	description: "Owns Order aggregate & order-facing operations",
});
const inventoryBC = inventorySD.addBoundedcontext("Inventory BC", {
	description: "Projection for /store/inventory (status→count)",
});
const identityBC = usersSD.addBoundedcontext("Identity BC", {
	description: "Owns User aggregate & user endpoints",
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
const petRegisteredEvt = petAgg.provides("PetRegistered", {
	description: "A new pet was registered",
	type: "event",
	pattern: "published-language",
});
const _petUpdatedEvt = petAgg.provides("PetUpdated", {
	description: "Pet profile updated",
	type: "event",
	pattern: "published-language",
});
const petStatusChangedEvt = petAgg.provides("PetStatusChanged", {
	description: "Pet status changed (available|pending|sold)",
	type: "event",
	pattern: "published-language",
});
const _petPhotoUploadedEvt = petAgg.provides("PetPhotoUploaded", {
	description: "Photo added via upload",
	type: "event",
	pattern: "published-language",
});
const petDeletedEvt = petAgg.provides("PetDeleted", {
	description: "Pet removed from catalog",
	type: "event",
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
const _orderPlacedEvt = orderAgg.provides("OrderPlaced", {
	description: "Order created (status=placed)",
	type: "event",
	pattern: "published-language",
});
const orderApprovedEvt = orderAgg.provides("OrderApproved", {
	description: "Order approved (status=approved)",
	type: "event",
	pattern: "published-language",
});
const orderDeliveredEvt = orderAgg.provides("OrderDelivered", {
	description: "Order delivered (status=delivered)",
	type: "event",
	pattern: "published-language",
});
const orderDeletedEvt = orderAgg.provides("OrderDeleted", {
	description: "Order deleted via DELETE /store/order/{orderId}",
	type: "event",
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
const inventoryUpdatedEvt = inventoryAgg.provides("InventoryUpdated", {
	description: "Inventory counts changed",
	type: "event",
	pattern: "published-language",
});

// Inventory listens to Catalog & Sales events (conformist)
inventoryAgg.consumes(petRegisteredEvt, { pattern: "conformist" });
inventoryAgg.consumes(petDeletedEvt, { pattern: "conformist" });
inventoryAgg.consumes(petStatusChangedEvt, { pattern: "conformist" });
inventoryAgg.consumes(orderApprovedEvt, { pattern: "conformist" });
inventoryAgg.consumes(orderDeliveredEvt, { pattern: "conformist" });
inventoryAgg.consumes(orderDeletedEvt, { pattern: "conformist" });

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
inventoryQuery.consumes(inventoryUpdatedEvt, { pattern: "conformist" });

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
const _userRegisteredEvt = userAgg.provides("UserRegistered", {
	description: "New user created",
	type: "event",
	pattern: "published-language",
});
const _userUpdatedEvt = userAgg.provides("UserUpdated", {
	description: "User fields updated",
	type: "event",
	pattern: "published-language",
});
const _userDeletedEvt = userAgg.provides("UserDeleted", {
	description: "User removed",
	type: "event",
	pattern: "published-language",
});
const _userLoggedInEvt = userAgg.provides("UserLoggedIn", {
	description: "Login via /user/login",
	type: "event",
	pattern: "published-language",
});
const _userLoggedOutEvt = userAgg.provides("UserLoggedOut", {
	description: "Logout via /user/logout",
	type: "event",
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
