import { Workspace } from "@open-domain-specification/core";

export const workspace = new Workspace("eShop", {
	odsVersion: "1.0.0",
	description:
		"DDD workspace for the current dotnet/eShop reference app (.NET 9, .NET Aspire).",
	version: "0.2.1",
	homepage: "https://github.com/dotnet/eShop",
	primaryColor: "#2563eb",
	logoUrl: "https://cdn-icons-png.flaticon.com/512/1162/1162456.png",
});

// === DOMAINS ===
const commerce = workspace.addDomain("Commerce", {
	description: "Core e-commerce capabilities (catalog, basket, ordering).",
	type: "core",
});
const identity = workspace.addDomain("Identity & Access", {
	description: "Authentication/authorization via Duende IdentityServer.",
	type: "supporting",
});
const apiIntegration = workspace.addDomain("API Integration", {
	description: "Cross-cutting integration (webhooks, external processors).",
	type: "supporting",
});
const payment = workspace.addDomain("Payment Processing", {
	description: "External payment processor integration.",
	type: "supporting",
});
const edge = workspace.addDomain("Edge & Experience", {
	description: "Customer-facing web app and mobile BFF.",
	type: "supporting",
});
const operations = workspace.addDomain("Operations", {
	description: "Backoffice and admin operations.",
	type: "supporting",
});

// === SUBDOMAINS ===
const catalogSd = commerce.addSubdomain("Catalog", {
	description: "Manage and query product catalog.",
});
const basketSd = commerce.addSubdomain("Basket", {
	description: "Shopping basket management.",
});
const orderingSd = commerce.addSubdomain("Ordering", {
	description: "Order lifecycle and payments coordination.",
});
const authSd = identity.addSubdomain("AuthN and AuthZ", {
	description: "OpenID Connect identity provider.",
});
const webhooksSd = apiIntegration.addSubdomain("Webhooks", {
	description: "Webhook registration and event delivery.",
});
const paymentProcessorsSd = payment.addSubdomain("Payment Processors", {
	description: "Background processors that integrate with external systems.",
});
const webSd = edge.addSubdomain("Web", {
	description: "Blazor web UI for customers.",
});

const mobileSd = edge.addSubdomain("Mobile", {
	description: "Mobile BFF/aggregator for shopping flows.",
});

const backofficeSd = operations.addSubdomain("Backoffice", {
	description: "Admin/ops touchpoints (price updates, etc.).",
});

// === BOUNDED CONTEXTS ===

const webappBc = webSd.addBoundedcontext("Web", {
	description: "Blazor Server web app for customers.",
});

const bffBc = mobileSd.addBoundedcontext("Mobile BFF", {
	description: "BFF that aggregates catalog/basket/ordering.",
});

const catalogBc = catalogSd.addBoundedcontext("Catalog", {
	description: "Minimal API for catalog queries and management.",
});

const basketBc = basketSd.addBoundedcontext("Basket", {
	description: "Basket service (gRPC/HTTP) to manage user baskets.",
});

const orderingBc = orderingSd.addBoundedcontext("Ordering", {
	description: "Order lifecycle, status and events.",
});

const identityBc = authSd.addBoundedcontext("Identity", {
	description: "Identity provider (Duende IdentityServer / OIDC).",
});

const webhooksBc = webhooksSd.addBoundedcontext("Webhooks", {
	description: "Register webhooks and deliver order events to subscribers.",
});

const webhookClientBc = webhooksSd.addBoundedcontext("WebhookClient", {
	description: "Sample receiver app for incoming webhook deliveries.",
});

const paymentBc = paymentProcessorsSd.addBoundedcontext("PaymentProcessor", {
	description: "Simulated external payment processor.",
});

const backofficeBc = backofficeSd.addBoundedcontext("BackofficeApp", {
	description: "Admin/demo app for price updates.",
});

// === SERVICES ===
const catalogSvc = catalogBc.addService("CatalogService", {
	description: "Catalog application service (HTTP).",
	type: "application",
});

const basketSvc = basketBc.addService("BasketService", {
	description: "Basket application service.",
	type: "application",
});

const orderingSvc = orderingBc.addService("OrderingService", {
	description: "Ordering application service.",
	type: "application",
});

const identitySvc = identityBc.addService("IdentityService", {
	description: "Token service for authN/authZ.",
	type: "application",
});

const webhooksSvc = webhooksBc.addService("WebhooksService", {
	description: "Webhook registration/delivery application service.",
	type: "application",
});

const webhookClientSvc = webhookClientBc.addService("WebhookReceiver", {
	description: "Receives webhook POSTs.",
	type: "application",
});

const paymentSvc = paymentBc.addService("PaymentService", {
	description: "Takes payments and emits status changes.",
	type: "application",
});

const webappSvc = webappBc.addService("WebApp", {
	description: "Customer-facing web application.",
	type: "application",
});

const bffSvc = bffBc.addService("ShoppingBff", {
	description: "Aggregation endpoints for shopping journeys.",
	type: "application",
});

const backofficeSvc = backofficeBc.addService("Backoffice", {
	description: "Uses open-host operations for admin workflows.",
	type: "application",
});

// === AGGREGATES, ENTITIES, VALUE OBJECTS ===

const catalogAgg = catalogBc.addAggregate("CatalogItem", {
	description: "Sellable product item.",
});

const skuVO = catalogAgg.addValueObject("Sku", {
	description: "Stock-keeping unit.",
});

const priceVO = catalogAgg.addValueObject("Money", {
	description: "Amount + currency.",
});

const catalogRoot = catalogAgg.addRootEntity("CatalogItem", {
	description: "Catalog item root with price and stock.",
});

catalogRoot.uses(skuVO, "identified by");
catalogRoot.uses(priceVO, "priced in");

const basketAgg = basketBc.addAggregate("Basket", {
	description: "Customer basket.",
});
const basketRoot = basketAgg.addRootEntity("Basket", {
	description: "Basket root with items and user ownership.",
});
const basketItemVO = basketAgg.addValueObject("BasketItem", {
	description: "ProductId, quantity, unit price snapshot.",
});
basketRoot.uses(basketItemVO, "contains");

const getBasketOp = basketSvc.provides("GetBasket", {
	description: "Fetch basket by user.",
	type: "operation",
	pattern: "open-host-service",
});
const addItemOp = basketSvc.provides("AddItem", {
	description: "Add/merge an item into basket.",
	type: "operation",
	pattern: "open-host-service",
});
const clearBasketOp = basketSvc.provides("ClearBasket", {
	description: "Remove all items from basket.",
	type: "operation",
	pattern: "open-host-service",
});

const orderAgg = orderingBc.addAggregate("Order", {
	description: "Order aggregate with status transitions.",
});
const orderRoot = orderAgg.addRootEntity("Order", {
	description: "Order header.",
});
const orderIdVO = orderAgg.addValueObject("OrderId", {
	description: "Order identifier.",
});
const currencyVO = orderAgg.addValueObject("Money", {
	description: "Totals & fees.",
});
orderRoot.uses(orderIdVO, "identified by");
orderRoot.uses(currencyVO, "totals");
orderAgg.addInvariant("TotalsNonNegative", {
	description: "Order totals must be >= 0.",
});

const placeOrderOp = orderingSvc.provides("PlaceOrder", {
	description: "Create an order from a valid basket.",
	type: "operation",
	pattern: "open-host-service",
});
const orderPaidEvt = orderingSvc.provides("OrderPaid", {
	description: "Integration event when an order is marked paid.",
	type: "event",
	pattern: "published-language",
});

const issueTokenOp = identitySvc.provides("IssueToken", {
	description: "Obtain access/id tokens via OIDC flows.",
	type: "operation",
	pattern: "open-host-service",
});

// Webhooks.API + WebhookClient

const registerWebhookOp = webhooksSvc.provides("RegisterWebhook", {
	description: "Register a webhook endpoint for an event (e.g., OrderPaid).",
	type: "operation",
	pattern: "open-host-service",
});

const receiveWebhookOp = webhookClientSvc.provides("ReceiveWebhook", {
	description: "Endpoint to receive webhook deliveries.",
	type: "operation",
	pattern: "open-host-service",
});

// PaymentProcessor (worker/external)

const authorizePaymentOp = paymentSvc.provides("ProcessPayment", {
	description: "Process/authorize payment for an order.",
	type: "operation",
	pattern: "open-host-service",
});
const paymentSucceededEvt = paymentSvc.provides("PaymentSucceeded", {
	description: "Integration event when a payment is successful.",
	type: "event",
	pattern: "published-language",
});

// === CONSUMABLES ===
const getCatalogItemsOp = catalogSvc.provides("GetCatalogItems", {
	description: "Browse/search catalog items.",
	type: "operation",
	pattern: "open-host-service",
});

const changePriceOp = catalogSvc.provides("ChangePrice", {
	description: "Admin operation to change item price.",
	type: "operation",
	pattern: "open-host-service",
});

// === CONSUMPTIONS ===
webappSvc.consumes(issueTokenOp, { pattern: "customer-supplier" });
webappSvc.consumes(getCatalogItemsOp, { pattern: "anti-corruption-layer" });
webappSvc.consumes(getBasketOp, { pattern: "anti-corruption-layer" });
webappSvc.consumes(addItemOp, { pattern: "anti-corruption-layer" });
webappSvc.consumes(clearBasketOp, { pattern: "anti-corruption-layer" });
webappSvc.consumes(placeOrderOp, { pattern: "anti-corruption-layer" });

bffSvc.consumes(issueTokenOp, { pattern: "customer-supplier" });
bffSvc.consumes(getCatalogItemsOp, { pattern: "anti-corruption-layer" });
bffSvc.consumes(getBasketOp, { pattern: "anti-corruption-layer" });
bffSvc.consumes(addItemOp, { pattern: "anti-corruption-layer" });
bffSvc.consumes(clearBasketOp, { pattern: "anti-corruption-layer" });
bffSvc.consumes(placeOrderOp, { pattern: "anti-corruption-layer" });

orderingSvc.consumes(authorizePaymentOp, { pattern: "customer-supplier" });
orderingSvc.consumes(paymentSucceededEvt, { pattern: "conformist" });

webhooksSvc.consumes(orderPaidEvt, { pattern: "conformist" });
webhookClientSvc.consumes(registerWebhookOp, { pattern: "customer-supplier" });
webhooksSvc.consumes(receiveWebhookOp, { pattern: "customer-supplier" });

backofficeSvc.consumes(changePriceOp, { pattern: "customer-supplier" });
