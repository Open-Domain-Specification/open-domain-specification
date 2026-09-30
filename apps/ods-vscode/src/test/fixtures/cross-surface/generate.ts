/**
 * Writes `.ods/cross_surface.json`, the one workspace that holds every fact the
 * cross-surface pass (epic #62) compares: authored and generated relationship
 * descriptions, two named agreements with a consumption under each and one that
 * names none, a tolerated relationship for the health report, and identities
 * into an external, a boundary-only and a big-ball-of-mud context.
 *
 * Run from the repository root:
 * `node apps/ods-vscode/src/test/fixtures/cross-surface/generate.ts`.
 * The JSON is committed, never edited by hand; the expectations every harness
 * asserts are in `expected.ts`, beside it. Given a folder as its argument, the
 * script writes there instead, which is how `src/cross-surface-fixture.test.ts`
 * checks that the committed JSON is still what this script writes.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Workspace } from "@open-domain-specification/core";

const workspace = new Workspace("Cross surface", {
	description:
		"One small model holding every fact the four surfaces are compared on.",
	version: "0.1.0",
});

const domain = workspace.addDomain("Trade", {
	description: "Selling, billing and shipping goods.",
});
const subdomain = domain.addSubdomain("Order Handling", {
	type: "core",
	description: "Taking an order and seeing it through.",
});
const team = workspace.addTeam("Trade Team");

const ordersBC = subdomain.addBoundedcontext("Orders", {
	description: "Takes orders.",
	team,
});
const billingBC = subdomain.addBoundedcontext("Billing", {
	description: "Bills for orders.",
	team,
});
const shippingBC = subdomain.addBoundedcontext("Shipping", {
	description: "Ships orders.",
	team,
});
const warehouseBC = subdomain.addBoundedcontext("Warehouse", {
	description: "Holds stock and receives deliveries.",
	team,
});
const vendorBC = subdomain.addBoundedcontext("Vendor", {
	description: "Supplies the stock the warehouse receives.",
	team,
});

// Outside contexts an identity may name: one of each kind.
const gatewayBC = workspace.addBoundedContext("Payment Gateway", {
	description: "The provider's own system.",
	external: true,
});
const registryBC = subdomain.addBoundedcontext("Tax Registry", {
	description: "Published by a regulator; we know its edge and nothing inside.",
	boundaryOnly: true,
});
const mainframeBC = subdomain.addBoundedcontext("Legacy Mainframe", {
	description: "Ninety jobs nobody can describe.",
	bigBallOfMud: true,
});

// A relationship with an authored description, and one without (generated).
// The authored one is tolerated, so it appears in the health report.
ordersBC.upstreamOf(billingBC, {
	type: "customer-supplier",
	description: "Billing is told what to charge before an order is confirmed.",
	disposition: "tolerated",
	comments: [
		{ text: "Billing waits on Orders; nobody has had time to decouple them." },
	],
});
ordersBC.upstreamOf(shippingBC, {
	type: "customer-supplier",
	comments: [{ text: "Shipping takes what Orders hands it." }],
});

// Two named agreements between one pair, in one direction.
const purchaseFeed = warehouseBC.downstreamOf(vendorBC, {
	name: "purchase feed",
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "The nightly purchase file.",
});
const priceLookup = warehouseBC.downstreamOf(vendorBC, {
	name: "price lookup",
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "One read endpoint for a vendor's price.",
});

const vendorApi = vendorBC.addService("Vendor API", {
	description: "What the vendor offers the warehouse.",
	type: "application",
});
const feedSchema = vendorBC.addSchema("Purchase File", {
	description: "The nightly file.",
});
feedSchema.addAttribute("fileName", { type: "string", identity: true });
const priceSchema = vendorBC.addSchema("Price Answer", {
	description: "A price.",
});
priceSchema.addAttribute("sku", { type: "string", identity: true });
const stockSchema = vendorBC.addSchema("Stock Level", {
	description: "Stock on hand.",
});
stockSchema.addAttribute("sku", { type: "string", identity: true });
const feedPublished = vendorApi.provides("PurchaseFilePublished", {
	description: "The nightly purchase file is ready.",
	type: "event",
	pattern: "published-language",
	schema: feedSchema,
});
const askPrice = vendorApi.provides("AskPrice", {
	description: "Answers with the price of a SKU.",
	type: "operation",
	pattern: "open-host-service",
	schema: priceSchema,
	returns: priceSchema,
});
const stockChecked = vendorApi.provides("StockChecked", {
	description: "Reports stock on hand.",
	type: "event",
	pattern: "published-language",
	schema: stockSchema,
});

vendorApi
	.provides("PublishPurchaseFile", {
		description: "Puts the nightly file out.",
		type: "operation",
		internal: true,
	})
	.raises(feedPublished);
vendorApi
	.provides("CheckStock", {
		description: "Looks stock up and reports it.",
		type: "operation",
		internal: true,
	})
	.raises(stockChecked);

const warehouseApi = warehouseBC.addService("Warehouse API", {
	description: "The warehouse's front.",
	type: "application",
});
const recordDelivery = warehouseApi.provides("Record Delivery", {
	description: "Books a delivery in against what the vendor said.",
	type: "operation",
	internal: true,
});
warehouseApi.consumes(feedPublished, {
	pattern: "anti-corruption-layer",
	relationship: purchaseFeed,
});
warehouseApi.consumes(askPrice, {
	pattern: "anti-corruption-layer",
	by: [recordDelivery],
	relationship: priceLookup,
});
warehouseApi.consumes(stockChecked, { pattern: "anti-corruption-layer" });
warehouseBC
	.addPolicy("Book in on file", { description: "A file becomes a delivery." })
	.on(feedPublished)
	.issues(recordDelivery);
warehouseBC
	.addPolicy("Book in on stock report", {
		description: "A stock report becomes a delivery.",
	})
	.on(stockChecked)
	.issues(recordDelivery);

// An entity whose identity attributes name the three kinds of outside context.
const accountAgg = ordersBC.addAggregate("Customer Account", {
	description: "A customer and the outside references held for them.",
});
const customer = accountAgg.addRootEntity("Customer", {
	description: "Somebody who orders.",
});
customer.addAttribute("customerId", { type: "string", identity: true });
const gatewayRef = accountAgg.addEntity("Gateway Reference", {
	description: "The customer's id at the payment gateway.",
});
gatewayRef.addAttribute("gatewayRefId", { type: "string", identity: true });
gatewayRef.addAttribute("reference", {
	type: "string",
	identifies: gatewayBC,
});
const registryRef = accountAgg.addEntity("Registry Reference", {
	description: "The customer's id at the tax registry.",
});
registryRef.addAttribute("registryRefId", { type: "string", identity: true });
registryRef.addAttribute("reference", {
	type: "string",
	identifies: registryBC,
});
const mainframeRef = accountAgg.addEntity("Mainframe Reference", {
	description: "The customer's id on the mainframe.",
});
mainframeRef.addAttribute("mainframeRefId", { type: "string", identity: true });
mainframeRef.addAttribute("reference", {
	type: "string",
	identifies: mainframeBC,
});
customer.includes(gatewayRef, "is known to the gateway as", "1");
customer.includes(registryRef, "is known to the registry as", "1");
customer.includes(mainframeRef, "is known to the mainframe as", "1");

const out =
	process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), ".ods");
mkdirSync(out, { recursive: true });
writeFileSync(
	join(out, `${workspace.id}.json`),
	`${JSON.stringify(workspace.toSchema(), null, "\t")}\n`,
);
for (const d of workspace.validate())
	console.log(`${d.severity} ${d.rule}: ${d.message}`);
console.log(`wrote ${workspace.id}.json`);
