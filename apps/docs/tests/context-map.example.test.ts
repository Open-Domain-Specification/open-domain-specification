import { writeFileSync } from "node:fs";
import { ODSContextMap, Workspace } from "@open-domain-specification/core";
import { contextMapToDigraph } from "@open-domain-specification/graphviz";
import { describe, expect, it } from "vitest";

const ws = new Workspace("eCommerce", {
	odsVersion: "1.0.0",
	description: "DDD workspace for an eCommerce platform example",
	version: "0.1.0",
	homepage: "https://example.com",
	primaryColor: "#0ea5e9",
	logoUrl: "https://example.com/logo.svg",
});

// === DOMAINS ===
const commerce = ws.addDomain("Commerce", {
	description: "Core commerce capabilities",
	type: "core",
});

const content = ws.addDomain("Content", {
	description: "Supporting site content",
	type: "supporting",
});

// === SUBDOMAINS ===
const sales = commerce.addSubdomain("Sales", {
	description: "From cart to order",
});

const publishing = content.addSubdomain("Publishing", {
	description: "Pages and articles",
});

// === BOUNDED CONTEXTS ===
const orderingBC = sales.addBoundedcontext("Ordering", {
	description: "Checkout flow and orders",
});

const cmsBC = publishing.addBoundedcontext("CMS", {
	description: "Site content retrieval/rendering",
});

// === ORDERING ===
const checkoutSvc = orderingBC.addService("CheckoutApp", {
	description: "Application service for placing orders",
	type: "application",
});

const orderAgg = orderingBC.addAggregate("Order", {
	description: "Immutable record of a purchase",
});

const orderEntity = orderAgg.addRootEntity("Order", {
	description: "Order header",
});

const moneyVO = orderAgg.addValueObject("Money", {
	description: "Amount + currency",
});

orderEntity.uses(moneyVO, "totals");

orderAgg.addInvariant("TotalsNonNegative", {
	description: "Order totals must be >= 0",
});

// Checkout exposes an operation to place orders
const placeOrderOp = checkoutSvc.provides("PlaceOrder", {
	description: "Create an order from a valid checkout",
	type: "operation",
	pattern: "open-host-service",
});

// === CMS ===
const rendererSvc = cmsBC.addService("ContentRenderer", {
	description: "Application service for fetching/rendering content",
	type: "application",
});

const articleAgg = cmsBC.addAggregate("Article", {
	description: "Renderable content unit",
});

const articleEntity = articleAgg.addRootEntity("Article", {
	description: "Article/page content",
});

const slugVO = articleAgg.addValueObject("Slug", {
	description: "URL-safe identifier",
});

articleEntity.uses(slugVO, "addressable by");

articleAgg.addInvariant("SlugFormatValid", {
	description: "Slug must be lowercase, dash-separated",
});

// CMS exposes an operation to get content
const getArticleOp = rendererSvc.provides("GetArticle", {
	description: "Fetch article/page content by slug",
	type: "operation",
	pattern: "open-host-service",
});

// === CONSUMES ===
// Ordering needs content (e.g., terms page) during checkout
checkoutSvc.consumes(getArticleOp, {
	pattern: "anti-corruption-layer",
});

// CMS might reference latest orders count/snippet for a dynamic page
rendererSvc.consumes(placeOrderOp, {
	pattern: "conformist",
});

describe("Context Map Example", () => {
	it("should compile ", async () => {
		const svg = await contextMapToDigraph(
			ODSContextMap.fromWorkspace(ws),
		).toSVG();
		expect(svg).toMatchSnapshot();
		writeFileSync("./static/img/context-map-example.svg", svg);
	});
});
