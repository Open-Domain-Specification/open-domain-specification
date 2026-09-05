import {
	type BoundedContext,
	Workspace,
} from "@open-domain-specification/core";

/**
 * Money, declared once in each context that carries an amount: a value object
 * belongs to the context's language, and every aggregate in that context
 * holds the same one.
 */
const money = (boundedcontext: BoundedContext) => {
	const vo = boundedcontext.addValueObject("Money", {
		description: "An amount in a currency: minor units and an ISO 4217 code",
	});
	vo.addAttribute("amountMinor", { type: "int64" });
	vo.addAttribute("currency", { type: "ISO 4217 code" });
	return vo;
};

/**
 * RiverMart: a fictional online retailer in the shape of a large marketplace.
 *
 * The business: RiverMart lists its own stock beside third-party sellers'
 * offers, wins customers on selection and delivery speed, and makes much of
 * its margin from advertising sold to those sellers. That shapes the
 * classification below: discovery, the buy box, the warehouse network and
 * sponsored products are core; cart, orders, last mile, seller onboarding and
 * customer service are supporting; payments and identity are generic.
 *
 * This workspace exists to stress the tooling: many contexts, cross-context
 * events and operations with schemas, a shared kernel, a partnership, a
 * separate-ways pair, a legacy big ball of mud, deep aggregates and two
 * deliberate findings (marked DELIBERATE) that trigger the rules
 * aggregate-root and cross-aggregate-reference.
 *
 * Provenance: BRIEF.md is the client onboarding pack and DISCOVERY.md the
 * record of the interviews and the event-storming session the model came
 * from. Every context, relationship, invariant and policy below traces to a
 * paragraph there; comments of the form "DISCOVERY: <who>" point at the
 * interview that produced the element they sit above.
 */
export const workspace = new Workspace("RiverMart", {
	id: "rivermart",
	odsVersion: "1.0.0",
	description:
		"A fictional online marketplace: catalogue, search, sellers and the buy box, cart and checkout, payments, warehousing, last mile, advertising, customer service and fraud.",
	version: "1.0.0",
	primaryColor: "#f59e0b",
});

/* =======================
   DOMAINS & SUBDOMAINS
   ======================= */

const shopping = workspace.addDomain("Shopping", {
	description: "Everything a customer touches from search to placed order",
});
const discoverySD = shopping.addSubdomain("Discovery", {
	type: "core",
	description:
		"Catalogue and search. Core: finding the right product among millions is why customers start here",
});
const orderingSD = shopping.addSubdomain("Ordering", {
	type: "supporting",
	description:
		"Cart, checkout and the order record. Supporting: essential, but a well-understood problem",
});

const marketplace = workspace.addDomain("Marketplace", {
	description: "Third-party sellers and their offers",
});
const sellersSD = marketplace.addSubdomain("Seller Onboarding", {
	type: "supporting",
	description:
		"Registering and verifying sellers. Supporting: regulated and necessary, not a differentiator",
});
const offersSD = marketplace.addSubdomain("Offers & Buy Box", {
	type: "core",
	description:
		"Which seller's offer wins the buy box. Core: this decision drives price, speed and seller trust",
});

const fulfilment = workspace.addDomain("Fulfilment & Delivery", {
	description: "Getting stock into warehouses and parcels to doors",
});
const warehousingSD = fulfilment.addSubdomain("Warehousing", {
	type: "core",
	description:
		"Stock positions, picking and dispatch. Core: the warehouse network is the moat behind next-day delivery",
});
const lastMileSD = fulfilment.addSubdomain("Last Mile", {
	type: "supporting",
	description:
		"Routes and delivery attempts. Supporting: carriers can do it, RiverMart does it to control the experience",
});
const vendorSD = fulfilment.addSubdomain("Vendor Purchasing", {
	type: "supporting",
	description: "Buying first-party stock from wholesale vendors",
});

const paymentsRisk = workspace.addDomain("Payments & Risk", {
	description: "Taking money safely",
});
const paymentsSD = paymentsRisk.addSubdomain("Payments", {
	type: "generic",
	description:
		"Authorise, capture, refund. Generic: a payment service provider does this for everyone",
});
const fraudSD = paymentsRisk.addSubdomain("Fraud", {
	type: "supporting",
	description:
		"Scoring orders and sellers. Supporting: vendors exist, but marketplace signals are RiverMart's own",
});

const advertising = workspace.addDomain("Advertising", {
	description: "Sponsored placements sold to sellers",
});
const sponsoredSD = advertising.addSubdomain("Sponsored Products", {
	type: "core",
	description:
		"Auctions for sponsored slots. Core: a large share of profit comes from here",
});

const customerExperience = workspace.addDomain("Customer Experience", {
	description: "Help after the order",
});
const customerServiceSD = customerExperience.addSubdomain("Customer Service", {
	type: "supporting",
	description: "Cases, contacts and resolutions",
});

const platform = workspace.addDomain("Platform", {
	description: "Shared capabilities every domain leans on",
});
const identitySD = platform.addSubdomain("Identity", {
	type: "generic",
	description: "Customer accounts and sign-in",
});

/* =======================
   TEAMS
   ======================= */

const catalogueTeam = workspace.addTeam("Catalogue Team", {
	description: "Owns product data and its quality",
});
const discoveryTeam = workspace.addTeam("Discovery Team", {
	description: "Owns search ranking; partners with Ads on sponsored slots",
});
const marketplaceTeam = workspace.addTeam("Marketplace Team", {
	description: "Owns offers and the buy box",
});
const sellerServicesTeam = workspace.addTeam("Seller Services Team", {
	description: "Owns seller registration and verification",
});
const checkoutTeam = workspace.addTeam("Checkout Team", {
	description: "Owns cart and the checkout orchestration",
});
const ordersTeam = workspace.addTeam("Orders Team", {
	description: "Owns the order record from placement to completion",
});
const paymentsTeam = workspace.addTeam("Payments Team", {
	description: "Owns the payment gateway integration",
});
const trustTeam = workspace.addTeam("Trust & Safety Team", {
	description: "Owns fraud scoring for orders and sellers",
});
const fulfilmentTeam = workspace.addTeam("Fulfilment Team", {
	description:
		"Owns warehouse systems; co-owns the parcel kernel with Logistics",
});
const logisticsTeam = workspace.addTeam("Logistics Team", {
	description: "Owns routing and delivery",
});
const adsTeam = workspace.addTeam("Ads Team", {
	description: "Owns campaigns and the sponsored auction",
});
const csTeam = workspace.addTeam("Customer Service Team", {
	description: "Owns the case system used by agents",
});
const retailSystemsTeam = workspace.addTeam("Retail Systems Team", {
	description: "Keeps the legacy vendor purchasing system running",
});
const platformTeam = workspace.addTeam("Platform Team", {
	description: "Owns identity",
});

/* =======================
   BOUNDED CONTEXTS
   ======================= */

const catalogueBC = discoverySD.addBoundedcontext("Catalogue", {
	description:
		"The product records: what a thing is, independent of who sells it",
	team: catalogueTeam,
});
const searchBC = discoverySD.addBoundedcontext("Search", {
	description: "The index and ranking that turns a query into a results page",
	team: discoveryTeam,
});
const offersBC = offersSD.addBoundedcontext("Offers", {
	description: "Sellers' offers on catalogue products and the buy box award",
	team: marketplaceTeam,
});
const sellerBC = sellersSD.addBoundedcontext("Seller Onboarding", {
	description: "Seller accounts, verification and suspension",
	team: sellerServicesTeam,
});
const cartBC = orderingSD.addBoundedcontext("Cart & Checkout", {
	description:
		"The cart and the checkout orchestration across payments and orders",
	team: checkoutTeam,
});
const orderBC = orderingSD.addBoundedcontext("Order Management", {
	description:
		"The order as the customer sees it: lines, shipments and returns",
	team: ordersTeam,
});
const paymentsBC = paymentsSD.addBoundedcontext("Payments", {
	description: "Authorisation, capture and refund against a payment provider",
	team: paymentsTeam,
});
const fraudBC = fraudSD.addBoundedcontext("Fraud", {
	description: "Risk scoring for orders and sellers",
	team: trustTeam,
});
const warehouseBC = warehousingSD.addBoundedcontext("Warehouse", {
	description: "Stock positions, reservations, picking and dispatch",
	team: fulfilmentTeam,
});
const lastMileBC = lastMileSD.addBoundedcontext("Last Mile", {
	description: "Delivery routes, stops and proof of delivery",
	team: logisticsTeam,
});
const adsBC = sponsoredSD.addBoundedcontext("Advertising", {
	description: "Seller campaigns and the auction for sponsored slots",
	team: adsTeam,
});
const csBC = customerServiceSD.addBoundedcontext("Customer Service", {
	description: "Cases raised by or for customers, and their resolution",
	team: csTeam,
});
// Legacy: a vendor purchasing system nobody wants to model inside. Only its
// one useful event is recorded.
const vendorBC = vendorSD.addBoundedcontext("Vendor Purchasing (legacy)", {
	description:
		"The 2009 purchasing system for first-party stock. Batch jobs, shared tables, no owner of the schema",
	bigBallOfMud: true,
	team: retailSystemsTeam,
});
const identityBC = identitySD.addBoundedcontext("Identity", {
	description: "Customer accounts",
	team: platformTeam,
});

// The one system RiverMart integrates with and does not run. Payments' own
// pages already spoke of "the provider's hold" and "the provider refused"
// without the provider being anywhere in the model; it is a bounded context
// now, with no subdomain, no team and no insides of ours (decision 28).
const paymentProviderBC = workspace.addBoundedContext("Payment Provider", {
	description:
		"The acquirer that actually holds, takes and returns the customer's money. RiverMart calls it and translates everything it says",
	external: true,
});

/* =======================
   CATALOGUE
   DISCOVERY: Head of Catalogue. "A product is one thing that can be sold,
   independent of who sells it"; SKUs are what everyone downstream uses.
   ======================= */

const productAgg = catalogueBC.addAggregate("Product", {
	description:
		"A product and its variants. One aggregate because a variant is meaningless without its parent",
});
const product = productAgg.addRootEntity("Product", {
	description: "The catalogue record for one thing that can be sold",
});
const variant = productAgg.addEntity("Variant", {
	description:
		"A sellable version of the product (size, colour). An entity because each has its own SKU",
});
const brandVO = catalogueBC.addValueObject("Brand", {
	description:
		"The maker's name; a value shared by every product of that brand",
});
brandVO.addAttribute("name", { type: "string" });
const dimensionVO = catalogueBC.addValueObject("Dimensions", {
	description: "Packaged size and weight, which the warehouse needs to slot it",
});
dimensionVO.addAttribute("weightGrams", { type: "int" });
dimensionVO.addAttribute("lengthMm", { type: "int" });

product.addAttribute("productId", { type: "string", identity: true });
product.addAttribute("title", { type: "string" });
product.addAttribute("brand", {
	type: "Brand",
	valueobject: brandVO,
	optional: true,
	description: "Absent on own-label and unbranded goods",
});
variant.addAttribute("sku", { type: "string", identity: true });
variant.addAttribute("option", {
	type: "string",
	description: "What distinguishes it, e.g. 'Blue / L'",
});
variant.addAttribute("dimensions", {
	type: "Dimensions",
	valueobject: dimensionVO,
});

product.includes(variant, "sold-as", "1..*");
product.uses(brandVO, "made-by", "0..1");
variant.uses(dimensionVO, "packaged-as", "1");

productAgg
	.addInvariant("AtLeastOneVariant", {
		description:
			"A product has at least one variant, or nothing can be offered",
	})
	.constrains(product);
productAgg
	.addInvariant("UniqueSkuWithinProduct", {
		description: "Two variants of one product never share a SKU",
	})
	.constrains(variant.attributes.get("sku")!);

const productListedSchema = catalogueBC.addSchema("ProductListed", {
	description: "What other contexts learn about a new product",
});
productListedSchema.addAttribute("productId", {
	type: "string",
	identity: true,
});
productListedSchema.addAttribute("title", { type: "string" });
productListedSchema.addAttribute("skus", { type: "string[]" });
const productRefSchema = catalogueBC.addSchema("ProductRef");
productRefSchema.addAttribute("productId", { type: "string", identity: true });
// A returned shape: GetProduct is asked with a ProductRef and answers with
// this, which is wider than the ProductListed event other contexts react to.
const productDetailSchema = catalogueBC.addSchema("ProductDetail", {
	description: "One product with its variants, as GetProduct answers it",
});
productDetailSchema.addAttribute("productId", {
	type: "string",
	identity: true,
});
productDetailSchema.addAttribute("title", { type: "string" });
productDetailSchema.addAttribute("brand", {
	type: "Brand",
	valueobject: brandVO,
});
productDetailSchema.addAttribute("variants", { type: "Variant[]" });

const productListed = productAgg.provides("ProductListed", {
	description: "A product joined the catalogue",
	type: "event",
	pattern: "published-language",
	schema: productListedSchema,
});
const productRetired = productAgg.provides("ProductRetired", {
	description: "A product was withdrawn; offers and index entries must go",
	type: "event",
	pattern: "published-language",
	schema: productRefSchema,
});

const catalogueApi = catalogueBC.addService("CatalogueAPI", {
	description:
		"The documented product API used by sellers and internal contexts",
	type: "application",
});
catalogueApi
	.provides("ListProduct", {
		description: "Create a product with its first variant",
		type: "operation",
		pattern: "open-host-service",
		schema: productListedSchema,
	})
	.raises(productListed);
catalogueApi
	.provides("RetireProduct", {
		description: "Withdraw a product",
		type: "operation",
		pattern: "open-host-service",
		schema: productRefSchema,
	})
	.raises(productRetired);
const getProduct = catalogueApi.provides("GetProduct", {
	description:
		"Asked with a ProductRef, answers with one product and its variants",
	type: "operation",
	pattern: "open-host-service",
	schema: productRefSchema,
	returns: productDetailSchema,
});

catalogueBC.addTerm("Product", {
	definition: "One thing that can be sold, independent of who sells it",
	aliases: ["Item", "Listing"],
	embodiedBy: productAgg,
});
catalogueBC.addTerm("SKU", {
	definition: "The identifier of one sellable variant",
	embodiedBy: variant,
});

/* =======================
   SEARCH
   DISCOVERY: Search product lead. "The index is a copy, never the truth."
   ======================= */

// A projection is a service that provides a query operation, not an
// aggregate with an invented root (decision 15). The index is a copy, never
// the truth, and SearchAPI is that service: it answers SearchProducts and
// takes the update operations the feeding policies below issue.
const searchHitSchema = searchBC.addSchema("SearchHit", {
	description: "One indexed product with the fields ranking needs",
});
searchHitSchema.addAttribute("productId", {
	type: "string",
	identity: true,
	identifies: product,
});
searchHitSchema.addAttribute("buyBoxPriceMinor", { type: "int64" });
searchHitSchema.addAttribute("nextDayEligible", {
	type: "boolean",
	description:
		"The badge: the buy box offer ships from a RiverMart warehouse, so next-day is the default",
});
const searchResultsSchema = searchBC.addSchema("SearchResults", {
	description: "A ranked page of hits",
});
searchResultsSchema.addAttribute("hits", {
	type: "SearchHit[]",
	schema: searchHitSchema,
});

const ranker = searchBC.addService("Ranker", {
	description:
		"Orders candidates by relevance, price and delivery promise; spans every document so it is a domain service",
	type: "domain",
});
ranker.provides("RankCandidates", {
	description: "Score and sort a candidate set",
	type: "operation",
	internal: true,
	returns: searchResultsSchema,
});

const searchApi = searchBC.addService("SearchAPI", {
	description:
		"The results page endpoint and the index it is read from: a projection modelled as a query service (decision 15)",
	type: "application",
});
const searchProducts = searchApi.provides("SearchProducts", {
	description: "Query → ranked page, with sponsored slots merged in",
	type: "operation",
	pattern: "open-host-service",
	returns: searchResultsSchema,
});
const documentIndexed = searchApi.provides("DocumentIndexed", {
	description: "A document was (re)written into the index",
	type: "event",
	internal: true,
});
const indexProduct = searchApi
	.provides("IndexProduct", {
		description: "Write or refresh a product's document",
		type: "operation",
		internal: true,
	})
	.raises(documentIndexed);
const removeDocument = searchApi.provides("RemoveDocument", {
	description: "Drop a retired product from the index",
	type: "operation",
	internal: true,
});
// DISCOVERY: Ads, "Search calls us for the slots ... and tells us when one of
// them is clicked". Telling Advertising is an outbound call, and a context
// makes those through its own boundary (decision 17), so it is an operation of
// SearchAPI. It was left unnamed while the consumption of RecordAdClick named
// no caller at all, which made the whole of Search look like the caller
// (card 90).
const reportAdClick = searchApi.provides("ReportAdClick", {
	description:
		"Tell Advertising that a sponsored slot on the results page was clicked; the click, not the impression, is what the seller pays for",
	type: "operation",
	internal: true,
});

searchApi.consumes(productListed, { pattern: "conformist" });
searchApi.consumes(productRetired, { pattern: "conformist" });

searchBC
	.addPolicy("Index on listing", {
		description: "Every listed product becomes searchable",
	})
	.on(productListed)
	.issues(indexProduct);
searchBC
	.addPolicy("Remove on retirement", {
		description: "A retired product disappears from results",
	})
	.on(productRetired)
	.issues(removeDocument);

searchBC.addTerm("Relevance", {
	definition:
		"How well a document answers the query, before price and delivery are weighed",
	embodiedBy: ranker,
});

/* =======================
   OFFERS & BUY BOX
   DISCOVERY: Head of Marketplace. "Everything here is about the buy box."
   ======================= */

const offerAgg = offersBC.addAggregate("Offer", {
	description:
		"One seller's price and stock for one SKU. RiverMart's own retail arm is one more seller here and wins the buy box on the same rules",
});
const offer = offerAgg.addRootEntity("Offer", {
	description: "The seller's terms for a SKU",
});
const offerMoney = money(offersBC);
const conditionVO = offersBC.addValueObject("Condition", {
	description: "new, used-like-new, used-good; buyers filter on it",
});
conditionVO.addAttribute("value", {
	type: "'new' | 'used-like-new' | 'used-good'",
});
offer.addAttribute("offerId", { type: "string", identity: true });
// `sellerId` is declared with the SellerAccount root further down, because the
// root it identifies has to exist before the attribute can name it.
const offerSku = offer.addAttribute("sku", {
	type: "string",
	identifies: variant,
});
offer.addAttribute("price", { type: "Money", valueobject: offerMoney });
offer.addAttribute("availableQuantity", { type: "int" });
offer.addAttribute("condition", {
	type: "Condition",
	valueobject: conditionVO,
});
// The other two buy box inputs the Head of Marketplace named. The delivery
// promise follows from whether the stock sits in a RiverMart warehouse; the
// seller rating is a rolling score the marketplace keeps (reviews are out of scope).
offer.addAttribute("fulfilledByRiverMart", {
	type: "boolean",
	description:
		"Stock is in a RiverMart warehouse, so the offer carries the next-day promise",
});
offer.addAttribute("sellerRating", {
	type: "int 0..100",
	description:
		"The marketplace's rolling score for the seller, weighed against price and delivery in the buy box",
});
offer.uses(offerMoney, "priced-at", "1");
offer.uses(conditionVO, "in-condition", "1");

offerAgg
	.addInvariant("PricePositive", {
		description: "An offer's price is greater than zero",
	})
	.constrains(offer.attributes.get("price")!);
// `OneActiveOfferPerSellerSku` is declared with the SellerAccount root further
// down, because it constrains `sellerId`, and that attribute can only be
// declared once the root it identifies exists.

const offerPublishedSchema = offersBC.addSchema("OfferPublished");
offerPublishedSchema.addAttribute("offerId", {
	type: "string",
	identity: true,
});
offerPublishedSchema.addAttribute("sku", {
	type: "string",
	identifies: variant,
});
offerPublishedSchema.addAttribute("price", {
	type: "Money",
	valueobject: offerMoney,
});
const buyBoxAwardedSchema = offersBC.addSchema("BuyBoxAwarded");
buyBoxAwardedSchema.addAttribute("sku", {
	type: "string",
	identity: true,
	identifies: variant,
});
buyBoxAwardedSchema.addAttribute("offerId", { type: "string" });
const offerRefSchema = offersBC.addSchema("OfferRef");
offerRefSchema.addAttribute("offerId", { type: "string", identity: true });
// A returned shape: what GetOffer answers with.
const offerDetailSchema = offersBC.addSchema("OfferDetail", {
	description: "One offer with its current price and stock",
});
offerDetailSchema.addAttribute("offerId", { type: "string", identity: true });
offerDetailSchema.addAttribute("price", {
	type: "Money",
	valueobject: offerMoney,
});
offerDetailSchema.addAttribute("availableQuantity", { type: "int" });

const offerPublished = offerAgg.provides("OfferPublished", {
	description: "A seller's offer went live",
	type: "event",
	pattern: "published-language",
	schema: offerPublishedSchema,
});
const offerWithdrawn = offerAgg.provides("OfferWithdrawn", {
	description: "An offer was taken down",
	type: "event",
	pattern: "published-language",
	schema: offerRefSchema,
});
const buyBoxAwarded = offerAgg.provides("BuyBoxAwarded", {
	description: "The offer shown by default for a SKU changed",
	type: "event",
	pattern: "published-language",
	schema: buyBoxAwardedSchema,
});
const withdrawSellerOffers = offerAgg
	.provides("WithdrawSellerOffers", {
		description: "Take down every offer of a seller",
		type: "operation",
		internal: true,
	})
	.raises(offerWithdrawn);

const buyBoxService = offersBC.addService("BuyBoxService", {
	description:
		"Compares all offers on a SKU by landed price, delivery speed and seller rating; a domain service because it reads across offers",
	type: "domain",
});
const awardBuyBox = buyBoxService
	.provides("AwardBuyBox", {
		description: "Recompute the buy box for a SKU",
		type: "operation",
		internal: true,
	})
	.raises(buyBoxAwarded);

const offerApi = offersBC.addService("OfferAPI", {
	description: "Seller-facing and internal offer endpoints",
	type: "application",
});
const publishOffer = offerApi
	.provides("PublishOffer", {
		description: "Create or update an offer",
		type: "operation",
		pattern: "open-host-service",
		schema: offerPublishedSchema,
	})
	.raises(offerPublished);
const getOffer = offerApi.provides("GetOffer", {
	description: "Read one offer with its current price and stock",
	type: "operation",
	pattern: "open-host-service",
	schema: offerRefSchema,
	returns: offerDetailSchema,
});

// DISCOVERY: Head of Marketplace, "the catalogue sends us events when products
// appear or disappear and we keep our own SKU list from them; we don't want
// their whole product model in our tables". Keeping that list is the reaction,
// and until card 92 the model had the consumptions with nothing under them.
const recordCatalogueSku = offerApi.provides("RecordCatalogueSku", {
	description:
		"Add a listed product to Offers' own SKU list, or take a retired one off it; the list is Offers' translation of the catalogue and holds no product model",
	type: "operation",
	internal: true,
});
// Offers translate the catalogue into their own SKU list rather than embedding Product.
const keepSkuList = offersBC
	.addPolicy("Keep the SKU list in step", {
		description:
			"Offers may only be published against a SKU the catalogue has, so the list follows every listing and retirement",
	})
	.on(productListed, productRetired)
	.issues(recordCatalogueSku);
offerApi.consumes(productListed, {
	pattern: "anti-corruption-layer",
	by: [keepSkuList],
});
offerApi.consumes(productRetired, {
	pattern: "anti-corruption-layer",
	by: [keepSkuList],
});

offersBC
	.addPolicy("Recompute buy box on offer change", {
		description: "Any published offer can win or lose the buy box",
	})
	.on(offerPublished, offerWithdrawn)
	.issues(awardBuyBox);

offersBC.addTerm("Buy Box", {
	definition: "The default offer a customer adds to cart for a SKU",
	aliases: ["Featured Offer"],
	embodiedBy: buyBoxService,
});
offersBC.addTerm("Offer", {
	definition:
		"A seller's price, stock and condition for one SKU; first-party retail is a seller like any other for this purpose",
	embodiedBy: offerAgg,
});

// Search also indexes the buy box price, declared here because the event exists now.
searchApi.consumes(buyBoxAwarded, { pattern: "conformist" });
searchBC
	.addPolicy("Reindex on buy box change", {
		description: "Results show the buy box price, so it must be refreshed",
	})
	.on(buyBoxAwarded)
	.issues(indexProduct);

/* =======================
   SELLER ONBOARDING
   DISCOVERY: Head of Seller Services. Active only after identity and bank
   checks; suspension on Trust & Safety's say-so; vendors are not sellers.
   ======================= */

const sellerAgg = sellerBC.addAggregate("SellerAccount", {
	description: "A third-party seller and its verification history",
});
const seller = sellerAgg.addRootEntity("SellerAccount", {
	description: "The legal entity selling on RiverMart",
});
const verificationCheck = sellerAgg.addEntity("VerificationCheck", {
	description: "One identity or bank check run on the seller; kept for audit",
});
const sellerStatusVO = sellerBC.addValueObject("SellerStatus", {
	description: "registered, active or suspended",
});
sellerStatusVO.addAttribute("value", {
	type: "'registered' | 'active' | 'suspended'",
});
seller.addAttribute("sellerId", { type: "string", identity: true });
seller.addAttribute("legalName", { type: "string" });
seller.addAttribute("status", {
	type: "SellerStatus",
	valueobject: sellerStatusVO,
});
verificationCheck.addAttribute("checkId", { type: "string", identity: true });
verificationCheck.addAttribute("checkType", {
	type: "'identity' | 'bank-account' | 'address'",
});
verificationCheck.addAttribute("passed", { type: "boolean" });
seller.includes(verificationCheck, "verified-by", "*");
seller.uses(sellerStatusVO, "has-status", "1");

sellerAgg
	.addInvariant("ActiveOnlyAfterChecks", {
		description:
			"A seller becomes active only when identity and bank checks both passed",
	})
	.constrains(sellerStatusVO, verificationCheck);
// `sellerId` on Offer is declared here, because an attribute can only name a
// root that already exists and this is where the SellerAccount root is.
const offerSellerId = offer.addAttribute("sellerId", {
	type: "string",
	identifies: seller,
});
// A uniqueness rule across offers: no single Offer can see the others, so the
// context holds the rule and names the operation that keeps it. PublishOffer
// looks up the seller's offers for the SKU before creating a new one, and the
// invariant names the pair that must be unique (decision 27).
offersBC
	.addInvariant("OneActiveOfferPerSellerSku", {
		description:
			"A seller has at most one active offer per SKU, so the buy box compares like with like. PublishOffer checks the seller's existing offers, since one Offer cannot see another",
	})
	.constrains(offerSellerId, offerSku, publishOffer);

const sellerRefSchema = sellerBC.addSchema("SellerRef");
sellerRefSchema.addAttribute("sellerId", { type: "string", identity: true });

const sellerRegistered = sellerAgg.provides("SellerRegistered", {
	description: "A seller signed up; checks are still pending",
	type: "event",
	internal: true,
});
const sellerActivated = sellerAgg.provides("SellerActivated", {
	description: "A seller may now publish offers",
	type: "event",
	pattern: "published-language",
	schema: sellerRefSchema,
});
const sellerSuspended = sellerAgg.provides("SellerSuspended", {
	description:
		"A seller lost the right to sell; offers and campaigns must stop",
	type: "event",
	pattern: "published-language",
	schema: sellerRefSchema,
});
const verifySeller = sellerAgg
	.provides("VerifySeller", {
		description: "Run the checks and activate on success",
		type: "operation",
		internal: true,
	})
	.raises(sellerActivated);

const sellerCentral = sellerBC.addService("SellerCentralAPI", {
	description: "The seller sign-up endpoints",
	type: "application",
});
sellerCentral
	.provides("RegisterSeller", {
		description: "Start a seller account",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(sellerRegistered);
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const suspendSeller = sellerCentral
	.provides("SuspendSeller", {
		description:
			"Suspend a seller; used by Trust & Safety through the policy below",
		type: "operation",
		pattern: "open-host-service",
		schema: sellerRefSchema,
	})
	.raises(sellerSuspended);

sellerBC
	.addPolicy("Verify on registration", {
		description: "Every new seller is checked before selling",
	})
	.on(sellerRegistered)
	.issues(verifySeller);

sellerBC.addTerm("Seller", {
	definition: "A third party selling through RiverMart under its own name",
	aliases: ["Merchant", "3P"],
	embodiedBy: sellerAgg,
});
// Recorded as its own term, not an alias, so the 2015 decision stays visible.
sellerBC.addTerm("Vendor", {
	definition:
		"Not a seller. A wholesale supplier to first-party retail, handled by Vendor Purchasing; the two accounts were never unified and will not be. Seller Onboarding has no vendor of its own, which is the point: the word is a false friend and nothing here embodies it",
});

// DISCOVERY: Head of Seller Services and the wall's "Offers allows publishing".
// Nothing in Offers reacts to an activation — no offer appears because a seller
// was activated — so what the subscription is for is `PublishOffer`, the part of
// Offers that refuses a seller who is not active yet (`subscription-backed`).
offerApi.consumes(sellerActivated, {
	pattern: "conformist",
	by: [publishOffer],
});
offerApi.consumes(sellerSuspended, { pattern: "conformist" });
offersBC
	.addPolicy("Withdraw offers of suspended seller", {
		description: "A suspended seller's offers come down immediately",
	})
	.on(sellerSuspended)
	.issues(withdrawSellerOffers);

/* =======================
   CART & CHECKOUT
   DISCOVERY: Checkout tech lead. Hold the money first, then create the order;
   fifty lines because checkout times out beyond that.
   ======================= */

const cartAgg = cartBC.addAggregate("Cart", {
	description:
		"What a customer intends to buy. Lines are part of it: a line outside a cart is nothing",
});
const cart = cartAgg.addRootEntity("Cart", {
	description: "One customer's open basket",
});
const cartLine = cartAgg.addEntity("CartLine", {
	description: "An offer and a quantity",
});
const cartMoney = money(cartBC);
cart.addAttribute("cartId", { type: "string", identity: true });
// `customerId` is declared with the CustomerAccount root further down.
cartLine.addAttribute("lineId", { type: "string", identity: true });
cartLine.addAttribute("offerId", { type: "string", identifies: offer });
cartLine.addAttribute("quantity", { type: "int" });
cartLine.addAttribute("unitPrice", { type: "Money", valueobject: cartMoney });
cart.includes(cartLine, "contains", "*");
cartLine.uses(cartMoney, "priced-at", "1");
// The Offer root lives in Offers, another bounded context: a relation never
// crosses one, so `offerId` above is the only thing that crosses the boundary.

cartAgg
	.addInvariant("LineQuantityAtLeastOne", {
		description: "A line with quantity zero is removed, not kept",
	})
	.constrains(cartLine.attributes.get("quantity")!);
cartAgg
	.addInvariant("MaxFiftyLines", {
		description:
			"A cart holds at most fifty lines; beyond that checkout times out",
	})
	.constrains(cart);

const cartCheckedOutSchema = cartBC.addSchema("CartCheckedOut", {
	description: "The snapshot handed to payments and orders",
});
cartCheckedOutSchema.addAttribute("cartId", { type: "string", identity: true });
// `customerId` is declared with the CustomerAccount root further down.
cartCheckedOutSchema.addAttribute("total", {
	type: "Money",
	valueobject: cartMoney,
});

const cartCheckedOut = cartAgg.provides("CartCheckedOut", {
	description: "The customer confirmed the basket; payment and order follow",
	type: "event",
	pattern: "published-language",
	schema: cartCheckedOutSchema,
});
// "If the hold fails the customer sees an error and the cart stays open":
// the frozen cart is reopened, which is a change to the cart, so it is an operation.
const reopenCart = cartAgg.provides("ReopenCart", {
	description:
		"Unfreeze a checked-out cart after a declined payment so the customer can try again",
	type: "operation",
	internal: true,
});

// DELIBERATE (aggregate-root): both entities are marked root. Someone
// modelled Wishlist and WishlistItem as peers; the rule reports two roots.
const wishlistAgg = cartBC.addAggregate("Wishlist", {
	description: "Saved-for-later items",
});
const wishlist = wishlistAgg.addRootEntity("Wishlist", {
	description: "A named list of products a customer may buy later",
});
const wishlistItem = wishlistAgg.addRootEntity("WishlistItem", {
	description: "One saved product",
});
wishlist.addAttribute("wishlistId", { type: "string", identity: true });
wishlistItem.addAttribute("productId", {
	type: "string",
	identity: true,
	identifies: product,
});
wishlist.includes(wishlistItem, "saves", "*");
// DELIBERATE (cross-aggregate-reference): the cart "includes" wishlist items
// from the Wishlist aggregate. The basket screen wanted the saved items beside
// the lines and the modeller copied them in. Across aggregates only references
// is allowed, and only to the other aggregate's root. Both aggregates are in
// Cart & Checkout, so this trips that one rule and nothing else.
cart.includes(wishlistItem, "saves-for-later", "*");

const checkoutOrchestrator = cartBC.addService("CheckoutOrchestrator", {
	description:
		"Drives a checkout through payment authorisation and order placement; an application service because it coordinates other contexts",
	type: "application",
});
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const addToCart = checkoutOrchestrator.provides("AddToCart", {
	description: "Add or increase a line",
	type: "operation",
	pattern: "open-host-service",
});
const checkoutOperation = checkoutOrchestrator
	.provides("Checkout", {
		description: "Freeze the cart and start the purchase",
		type: "operation",
		pattern: "open-host-service",
		schema: cartCheckedOutSchema,
	})
	.raises(cartCheckedOut);
// DISCOVERY: Checkout tech lead, "we read offers through the Offers API but
// keep our own line shape" — which happens as a line goes in, not at checkout.
checkoutOrchestrator.consumes(getOffer, {
	pattern: "anti-corruption-layer",
	by: [addToCart],
});

cartBC.addTerm("Cart", {
	definition: "The basket a customer fills before checkout",
	aliases: ["Basket"],
	embodiedBy: cartAgg,
});

/* =======================
   ORDER MANAGEMENT: the deep aggregate
   DISCOVERY: Orders Team lead. Shipments and returns live on the order because
   "the customer tracks by order, not by warehouse box, and a return has to
   check what was actually shipped".
   ======================= */

const orderAgg = orderBC.addAggregate("Order", {
	description:
		"The order with its lines, the shipments that carry them and the returns that undo them. One aggregate because a return must check what was shipped, and a shipment what was ordered",
});
const order = orderAgg.addRootEntity("Order", {
	description: "The customer-facing record of a purchase",
});
const orderLine = orderAgg.addEntity("OrderLine", {
	description: "One SKU, quantity and price as sold",
});
const shipment = orderAgg.addEntity("Shipment", {
	description:
		"A customer-visible group of lines travelling together. An entity here because the customer tracks it by order, not by warehouse",
});
const returnEntity = orderAgg.addEntity("Return", {
	description:
		"A request to send lines back, with what came back and what was refunded",
});
const returnLine = orderAgg.addEntity("ReturnLine", {
	description: "One order line and the quantity returned from it",
});
const orderMoney = money(orderBC);
const addressVO = orderBC.addValueObject("Address", {
	description:
		"Where it ships; a value because the same address on two orders is the same place",
});
addressVO.addAttribute("lines", { type: "string[]" });
addressVO.addAttribute("postcode", { type: "string" });
addressVO.addAttribute("country", { type: "ISO 3166 code" });
const orderStatusVO = orderBC.addValueObject("OrderStatus", {
	description:
		"placed, awaiting-stock, cancelled, partially-shipped, shipped, completed",
});
orderStatusVO.addAttribute("value", {
	type: "'placed' | 'awaiting-stock' | 'cancelled' | 'partially-shipped' | 'shipped' | 'completed'",
});
const trackingRefVO = orderBC.addValueObject("TrackingReference", {
	description: "The carrier reference the customer sees",
});
trackingRefVO.addAttribute("value", { type: "string" });

order.addAttribute("orderId", { type: "string", identity: true });
// `customerId` is declared with the CustomerAccount root further down.
order.addAttribute("total", { type: "Money", valueobject: orderMoney });
order.addAttribute("shippingAddress", {
	type: "Address",
	valueobject: addressVO,
});
order.addAttribute("status", {
	type: "OrderStatus",
	valueobject: orderStatusVO,
});
orderLine.addAttribute("lineId", { type: "string", identity: true });
orderLine.addAttribute("sku", { type: "string", identifies: variant });
orderLine.addAttribute("offerId", {
	type: "string",
	description:
		"Identity of the Offer root in Offers; only the id crosses the boundary. `sku` is the catalogue code the line was bought under, which is not the same thing",
	identifies: offer,
});
orderLine.addAttribute("quantity", { type: "int" });
orderLine.addAttribute("unitPrice", { type: "Money", valueobject: orderMoney });
shipment.addAttribute("shipmentId", { type: "string", identity: true });
shipment.addAttribute("tracking", {
	type: "TrackingReference",
	valueobject: trackingRefVO,
	optional: true,
	description: "Absent until the carrier has given a reference",
});
returnEntity.addAttribute("returnId", { type: "string", identity: true });
returnEntity.addAttribute("reason", { type: "string" });
returnEntity.addAttribute("refund", { type: "Money", valueobject: orderMoney });
returnLine.addAttribute("returnLineId", { type: "string", identity: true });
returnLine.addAttribute("quantity", { type: "int" });

order.includes(orderLine, "has-lines", "1..*");
order.includes(shipment, "shipped-in", "*");
order.includes(returnEntity, "returned-by", "*");
shipment.references(orderLine, "carries", "1..*");
returnEntity.includes(returnLine, "for-lines", "1..*");
returnLine.references(orderLine, "returns", "1");
order.uses(orderMoney, "totals", "1");
orderLine.uses(orderMoney, "priced-at", "1");
returnEntity.uses(orderMoney, "refunds", "1");
order.uses(addressVO, "ships-to", "1");
order.uses(orderStatusVO, "has-status", "1");
shipment.uses(trackingRefVO, "tracked-as", "0..1");
// The Offer root is in another bounded context, so the line holds `offerId`
// and no relation.

orderAgg
	.addInvariant("TotalEqualsLines", {
		description:
			"The order total is the sum of its lines; a discrepancy is a bug, never rounding",
	})
	.constrains(order.attributes.get("total")!, orderLine);
orderAgg
	.addInvariant("LineShippedOnce", {
		description: "A line belongs to at most one shipment",
	})
	.constrains(shipment);
orderAgg
	.addInvariant("ReturnWithinShipped", {
		description:
			"A return line's quantity never exceeds the quantity shipped for that line",
	})
	.constrains(returnLine.attributes.get("quantity")!);
orderAgg
	.addInvariant("CancelOnlyBeforeShipment", {
		description: "An order with a shipment is returned, not cancelled",
	})
	.constrains(orderStatusVO);

// A payload with a shape inside it: the line is a schema of its own rather
// than a flattened type string, so a consumer reads its fields on one page.
const orderLineSchema = orderBC.addSchema("OrderLine", {
	description: "One line of an order, as the fact carries it",
});
orderLineSchema.addAttribute("sku", { type: "string", identity: true });
orderLineSchema.addAttribute("quantity", { type: "int32" });

const orderPlacedSchema = orderBC.addSchema("OrderPlaced", {
	description: "The fact warehouse, fraud and payments react to",
});
orderPlacedSchema.addAttribute("orderId", { type: "string", identity: true });
// `customerId` is declared with the CustomerAccount root further down.
orderPlacedSchema.addAttribute("lines", {
	type: "OrderLine[]",
	schema: orderLineSchema,
});
orderPlacedSchema.addAttribute("total", {
	type: "Money",
	valueobject: orderMoney,
});
const orderRefSchema = orderBC.addSchema("OrderRef");
orderRefSchema.addAttribute("orderId", { type: "string", identity: true });
// A returned shape: what GetOrder answers with.
const orderDetailSchema = orderBC.addSchema("OrderDetail", {
	description: "One order with its lines, shipments and returns",
});
orderDetailSchema.addAttribute("orderId", { type: "string", identity: true });
orderDetailSchema.addAttribute("status", {
	type: "OrderStatus",
	valueobject: orderStatusVO,
});
orderDetailSchema.addAttribute("total", {
	type: "Money",
	valueobject: orderMoney,
});
orderDetailSchema.addAttribute("lines", {
	type: "OrderLine[]",
	schema: orderLineSchema,
});
orderDetailSchema.addAttribute("shipmentIds", {
	type: "string[]",
	description: "Shipments dispatched for this order",
});
orderDetailSchema.addAttribute("returnIds", {
	type: "string[]",
	description: "Returns opened for this order",
});
const returnLineSchema = orderBC.addSchema("ReturnLine", {
	description: "One line of a return: which line of the order, and how many",
});
returnLineSchema.addAttribute("lineId", { type: "string", identity: true });
returnLineSchema.addAttribute("quantity", { type: "int32" });
// A rejection shape: what CancelOrder answers with once something has shipped.
// Nothing was cancelled, so no OrderCancelled is raised; the storefront is
// told which shipment blocked it so it can offer a return instead (decision 25).
const cancelRefusedSchema = orderBC.addSchema("CancelRefused", {
	description:
		"Why the order could not be cancelled: a shipment has already left the dock",
});
cancelRefusedSchema.addAttribute("orderId", {
	type: "string",
	identifies: order,
});
cancelRefusedSchema.addAttribute("shipmentId", {
	type: "string",
	identifies: shipment,
});
const returnRequestedSchema = orderBC.addSchema("ReturnRequested");
returnRequestedSchema.addAttribute("returnId", {
	type: "string",
	identity: true,
	identifies: returnEntity,
});
returnRequestedSchema.addAttribute("orderId", {
	type: "string",
	identifies: order,
});
returnRequestedSchema.addAttribute("lines", {
	type: "ReturnLine[]",
	schema: returnLineSchema,
});

const orderPlaced = orderAgg.provides("OrderPlaced", {
	description: "A paid-for order exists",
	type: "event",
	pattern: "published-language",
	schema: orderPlacedSchema,
});
const orderCancelled = orderAgg.provides("OrderCancelled", {
	description: "The order was cancelled before shipment",
	type: "event",
	pattern: "published-language",
	schema: orderRefSchema,
});
const returnRequested = orderAgg.provides("ReturnRequested", {
	description: "The customer wants to send lines back",
	type: "event",
	pattern: "published-language",
	schema: returnRequestedSchema,
});
const orderCompleted = orderAgg.provides("OrderCompleted", {
	description: "Everything was delivered",
	type: "event",
	pattern: "published-language",
	schema: orderRefSchema,
});

const recordShipment = orderAgg.provides("RecordShipment", {
	description:
		"Attach a warehouse dispatch to the order as a customer-visible shipment",
	type: "operation",
	internal: true,
});
const completeOrder = orderAgg
	.provides("CompleteOrder", {
		description: "Close the order once every shipment is delivered",
		type: "operation",
		internal: true,
	})
	.raises(orderCompleted);
// The warehouse's StockShort is not the end of the order: it waits, visibly.
const holdForStock = orderAgg.provides("HoldForStock", {
	description:
		"Put the order into awaiting-stock when no site could reserve for it; it is retried when stock is received or cancelled by the customer",
	type: "operation",
	internal: true,
});

const orderApi = orderBC.addService("OrderAPI", {
	description: "Read access to orders for the storefront and agents",
	type: "application",
});
const getOrder = orderApi.provides("GetOrder", {
	description: "Read one order with lines, shipments and returns",
	type: "operation",
	pattern: "open-host-service",
	schema: orderRefSchema,
	returns: orderDetailSchema,
});
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const placeOrder = orderApi
	.provides("PlaceOrder", {
		description: "Create the order from a checked-out cart",
		type: "operation",
		pattern: "open-host-service",
		schema: orderPlacedSchema,
	})
	.raises(orderPlaced);
const cancelOrder = orderApi
	.provides("CancelOrder", {
		description: "Cancel before anything ships",
		type: "operation",
		pattern: "open-host-service",
		schema: orderRefSchema,
		rejects: [cancelRefusedSchema],
	})
	.raises(orderCancelled);
const requestReturn = orderApi
	.provides("RequestReturn", {
		description: "Open a return for some lines",
		type: "operation",
		pattern: "open-host-service",
		schema: returnRequestedSchema,
	})
	.raises(returnRequested);

orderBC.addTerm("Order", {
	definition: "A paid-for purchase of one or more lines",
	embodiedBy: orderAgg,
});
orderBC.addTerm("Shipment", {
	definition: "A group of lines travelling together, as the customer tracks it",
	aliases: ["Package", "Parcel"],
	embodiedBy: shipment,
});
orderBC.addTerm("Return", {
	definition: "Lines sent back for a refund",
	aliases: ["RMA"],
	embodiedBy: returnEntity,
});

/* =======================
   PAYMENTS
   DISCOVERY: Payments engineering lead. Capture per shipment at dispatch "so a
   cancelled order costs the customer nothing".
   ======================= */

const paymentAgg = paymentsBC.addAggregate("Payment", {
	description:
		"An intent to take money and everything done against it. Captures and refunds must be checked against the authorisation, so they live inside",
});
const paymentIntent = paymentAgg.addRootEntity("PaymentIntent", {
	description: "The amount RiverMart may take for an order",
});
const authorisation = paymentAgg.addEntity("Authorisation", {
	description: "The provider's hold on the customer's funds",
});
const capture = paymentAgg.addEntity("Capture", {
	description: "Money actually taken; one per shipment",
});
const refund = paymentAgg.addEntity("Refund", {
	description: "Money given back against a capture",
});
const paymentMoney = money(paymentsBC);
paymentIntent.addAttribute("paymentId", { type: "string", identity: true });
// Optional, because the model's own comment on `AttachOrder` says why: the hold
// is taken against a cart and the order id only exists after PlaceOrder, so an
// intent has none until the order is placed (decision 24; card 92).
paymentIntent.addAttribute("orderId", {
	type: "string",
	identifies: order,
	optional: true,
	description: "Absent until the order exists; AttachOrder fills it",
});
paymentIntent.addAttribute("amount", {
	type: "Money",
	valueobject: paymentMoney,
});
// The acquirer's own reference for the hold: it identifies the Authorisation
// here and it is the provider's id out there. The provider has no entities of
// RiverMart's to name -- what happens inside the acquirer is not RiverMart's
// to state -- so the attribute names the system the id belongs to
// (decision 28, card 81).
authorisation.addAttribute("providerRef", {
	type: "string",
	identity: true,
	identifies: paymentProviderBC,
});
authorisation.addAttribute("expiresAt", { type: "date-time" });
capture.addAttribute("captureId", { type: "string", identity: true });
capture.addAttribute("amount", { type: "Money", valueobject: paymentMoney });
refund.addAttribute("refundId", { type: "string", identity: true });
refund.addAttribute("amount", { type: "Money", valueobject: paymentMoney });
paymentIntent.includes(authorisation, "held-by", "0..1");
paymentIntent.includes(capture, "captured-by", "*");
capture.includes(refund, "refunded-by", "*");
paymentIntent.uses(paymentMoney, "for-amount", "1");
capture.uses(paymentMoney, "of-amount", "1");
refund.uses(paymentMoney, "of-amount", "1");

paymentAgg
	.addInvariant("CapturesWithinAuthorisation", {
		description: "Captures never sum to more than the authorised amount",
	})
	.constrains(capture, authorisation);
paymentAgg
	.addInvariant("RefundsWithinCapture", {
		description: "Refunds against a capture never exceed it",
	})
	.constrains(refund);
paymentAgg
	.addInvariant("SingleCurrency", {
		description: "Every amount on one payment shares the intent's currency",
	})
	.constrains(paymentMoney);

const paymentAuthorisedSchema = paymentsBC.addSchema("PaymentAuthorised");
paymentAuthorisedSchema.addAttribute("paymentId", {
	type: "string",
	identity: true,
});
paymentAuthorisedSchema.addAttribute("cartId", {
	type: "string",
	identifies: cart,
});
const paymentRefSchema = paymentsBC.addSchema("PaymentRef");
paymentRefSchema.addAttribute("paymentId", { type: "string", identity: true });
// DISCOVERY: Checkout tech lead, "if the hold fails the customer sees an error
// and the cart stays open". A decline is the authorisation call refusing, not
// a fact the world is told about: nothing happened, and the only party who
// hears it is the caller who asked. It was published as an event until card 92,
// against decision 25's own example; it is now what AuthorisePayment rejects
// with, and the Checkout process waits on the answer (decision 23).
const paymentDeclinedSchema = paymentsBC.addSchema("PaymentDeclined", {
	description: "Why the hold was refused, in the words the customer is shown",
});
paymentDeclinedSchema.addAttribute("paymentId", {
	type: "string",
	identity: true,
});
paymentDeclinedSchema.addAttribute("reason", {
	type: "'insufficient-funds' | 'instrument-refused' | 'provider-unavailable'",
	description: "What the storefront tells the customer to try instead",
});
const authorisePaymentSchema = paymentsBC.addSchema("AuthorisePayment", {
	description:
		"What checkout sends: the cart total and the customer's instrument token",
});
authorisePaymentSchema.addAttribute("cartId", {
	type: "string",
	identifies: cart,
});
authorisePaymentSchema.addAttribute("amount", {
	type: "Money",
	valueobject: paymentMoney,
});
authorisePaymentSchema.addAttribute("instrumentToken", { type: "string" });

const paymentAuthorised = paymentAgg.provides("PaymentAuthorised", {
	description: "Funds are held; the order may be placed",
	type: "event",
	pattern: "published-language",
	schema: paymentAuthorisedSchema,
});
const paymentCaptured = paymentAgg.provides("PaymentCaptured", {
	description: "Money was taken for a dispatched shipment",
	type: "event",
	pattern: "published-language",
	schema: paymentRefSchema,
});
const refundIssued = paymentAgg.provides("RefundIssued", {
	description: "Money went back to the customer",
	type: "event",
	pattern: "published-language",
	schema: paymentRefSchema,
});

// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const paymentsApi = paymentsBC.addService("PaymentsAPI", {
	description:
		"Payments' application service: the boundary checkout and order management ask for money through",
	type: "application",
});
const authorisePayment = paymentsApi
	.provides("AuthorisePayment", {
		description:
			"Hold the cart total on the customer's instrument; the caller waits, and is told either that the money is held or why it is not",
		type: "operation",
		pattern: "open-host-service",
		schema: authorisePaymentSchema,
		rejects: [paymentDeclinedSchema],
	})
	.raises(paymentAuthorised);
const capturePayment = paymentsApi
	.provides("CapturePayment", {
		description:
			"Take the money for one shipment; charging at dispatch keeps cancelled orders free",
		type: "operation",
		pattern: "open-host-service",
		schema: paymentRefSchema,
	})
	.raises(paymentCaptured);
const refundPayment = paymentsApi
	.provides("RefundPayment", {
		description: "Return money for a received return",
		type: "operation",
		pattern: "open-host-service",
		schema: paymentRefSchema,
	})
	.raises(refundIssued);

// DISCOVERY: Payments engineering lead. The hold, the take and the return all
// happen at the acquirer; Payments is the model over them, and it translates
// every answer into its own words (decision 28, card 71).
const providerRequestSchema = paymentProviderBC.addSchema("ProviderRequest", {
	description: "The acquirer's wire format, which RiverMart does not shape",
});
providerRequestSchema.addAttribute("merchantReference", {
	type: "string",
	identity: true,
});
providerRequestSchema.addAttribute("amountMinorUnits", { type: "int64" });
providerRequestSchema.addAttribute("currency", { type: "ISO 4217 code" });
providerRequestSchema.addAttribute("instrumentToken", { type: "string" });
const acquirerApi = paymentProviderBC.addService("Acquirer API", {
	description: "The provider's documented interface, and all RiverMart sees",
	type: "application",
});
const holdFunds = acquirerApi.provides("HoldFunds", {
	description: "Put a hold on the customer's instrument",
	type: "operation",
	pattern: "open-host-service",
	schema: providerRequestSchema,
});
const takeFunds = acquirerApi.provides("TakeFunds", {
	description: "Take money against an existing hold",
	type: "operation",
	pattern: "open-host-service",
	schema: providerRequestSchema,
});
const returnFunds = acquirerApi.provides("ReturnFunds", {
	description: "Send money back against something already taken",
	type: "operation",
	pattern: "open-host-service",
	schema: providerRequestSchema,
});
paymentsApi.consumes(holdFunds, {
	pattern: "anti-corruption-layer",
	by: [authorisePayment],
});
paymentsApi.consumes(takeFunds, {
	pattern: "anti-corruption-layer",
	by: [capturePayment],
});
paymentsApi.consumes(returnFunds, {
	pattern: "anti-corruption-layer",
	by: [refundPayment],
});
paymentProviderBC.upstreamOf(paymentsBC, {
	description:
		"The acquirer's API is the acquirer's; Payments keeps its own intent, capture and refund and translates at the edge",
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
});

paymentsBC.addTerm("Authorisation", {
	definition:
		"A hold on funds that expires if not captured; the customer sees it as pending",
	aliases: ["Auth", "Hold"],
	embodiedBy: authorisation,
});

// Checkout is one process, not three policies: it holds the frozen cart from
// the moment the customer confirms it until an order exists, and what it does
// next depends on which answer comes back from Payments.
//
// A policy names operations of its own context, so the orchestrator holds the
// two steps that reach out through the ACL (decision 17).
const requestAuthorisation = checkoutOrchestrator.provides(
	"RequestAuthorisation",
	{
		description:
			"Ask Payments to hold the cart total, through the ACL; the checkout's own step",
		type: "operation",
		internal: true,
	},
);
const placeOrderForCart = checkoutOrchestrator.provides("PlaceOrderForCart", {
	description:
		"Ask Order Management to create the order for an authorised cart, through the ACL",
	type: "operation",
	internal: true,
});
const checkout = cartBC
	.addProcess("Checkout", {
		description:
			"From the customer confirming the basket to an order existing. It asks Payments to hold the cart total and then waits: on a hold the order is placed, on a decline — the answer AuthorisePayment refuses with — the cart is unfrozen so another instrument can be tried and the same instance waits for the next attempt. Correlation is by cartId, which the authorisation carries back. An instance nobody comes back to ends when its own clock runs out: the hold Payments took lasts thirty minutes, and after that the checkout is over. The cart is not: a cart nobody returns to is the customer's to abandon",
	})
	.starts(cartCheckedOut)
	.on(paymentAuthorised, authorisePayment.rejected(paymentDeclinedSchema))
	.issues(requestAuthorisation, placeOrderForCart, reopenCart);
// DISCOVERY: Payments engineering lead, and the Authorisation glossary entry:
// a hold "expires if not captured"; neither gives an interval. Card 92
// wrote that as an `ExpireAuthorisations` operation on Payments that a
// scheduler ran and an `AuthorisationExpired` event only the checkout heard,
// which is five declarations and a fact about the world — that something
// outside the software sweeps holds — for one instance's clock. It is the
// process's own: it starts when this instance asks for the hold, nobody
// outside knows the instance exists, and running out of time is how a checkout
// nobody comes back to finishes (decision 23, fourth amendment; card 95).
checkout.ends(
	orderPlaced,
	checkout.addDeadline("Authorisation expiry", {
		description:
			"The hold Payments took is released and the checkout is over; the cart stays open for the customer to come back to",
		after: "when the hold expires; the interviews give no interval",
	}),
);
// Everything the checkout reaches for, declared together now that both the
// operations and the process exist to be named. The orchestrator offers four
// operations, so which one calls out is a real question and `by` answers it
// (decision 21, third amendment); the facts the process waits on are
// consumptions as well as subscriptions, because a context takes a foreign fact
// in at its own boundary (decision 17; `subscription-consumed`). The decline
// needs no consumption of its own: it comes back down the AuthorisePayment call
// the line above already declares, which is what makes it this context's to
// hear (decision 23).
checkoutOrchestrator.consumes(authorisePayment, {
	pattern: "anti-corruption-layer",
	by: [requestAuthorisation],
});
checkoutOrchestrator.consumes(placeOrder, {
	pattern: "anti-corruption-layer",
	by: [placeOrderForCart],
});
checkoutOrchestrator.consumes(paymentAuthorised, {
	pattern: "anti-corruption-layer",
	by: [checkout],
});
// The order the checkout ends on. Cart & Checkout hears that the order exists
// and stops there; what happens to the order afterwards is Order Management's.
checkoutOrchestrator.consumes(orderPlaced, {
	pattern: "anti-corruption-layer",
	by: [checkout],
});

// The intent is authorised against a cart; the order id only exists after
// PlaceOrder, and captures at dispatch arrive by order id, so Payments
// attaches it when the order is placed.
const attachOrder = paymentAgg.provides("AttachOrder", {
	description:
		"Record the order id on the payment intent so captures and refunds can find it",
	type: "operation",
	internal: true,
});
paymentsApi.consumes(orderPlaced, { pattern: "anti-corruption-layer" });
paymentsBC
	.addPolicy("Attach order to payment", {
		description: "Every placed order is linked to the hold that paid for it",
	})
	.on(orderPlaced)
	.issues(attachOrder);

/* =======================
   FRAUD
   DISCOVERY: Trust & Safety lead. Scored from events, after the fact; "a flag
   without an explanation is useless to an agent".
   ======================= */

const assessmentAgg = fraudBC.addAggregate("RiskAssessment", {
	description:
		"The score and signals for one order or seller, kept so decisions can be explained",
});
const assessment = assessmentAgg.addRootEntity("RiskAssessment", {
	description: "One scoring run",
});
const riskScoreVO = fraudBC.addValueObject("RiskScore", {
	description: "0 to 1000; above the threshold is flagged",
});
riskScoreVO.addAttribute("value", { type: "int 0..1000" });
const signalVO = fraudBC.addValueObject("Signal", {
	description:
		"A named contribution to the score, e.g. 'new account, high value'",
});
signalVO.addAttribute("name", { type: "string" });
signalVO.addAttribute("weight", { type: "int" });
assessment.addAttribute("assessmentId", { type: "string", identity: true });
// DISCOVERY: Trust & Safety lead. "We score an order or a seller." One
// attribute called subjectId, typed string and described as "an order id or a
// seller id", identified nothing: `identifies` names one kind of thing, and an
// id that is either of two is not one. Decision 15 gave the model's answer in
// the same breath and cited this very attribute as following it, which it did
// not: two optional attributes, each identifying its own target, and an
// invariant in prose that exactly one is set (card 95).
const assessedOrder = assessment.addAttribute("orderId", {
	type: "string",
	optional: true,
	identifies: order,
	description: "Set when the assessment is of an order",
});
const assessedSeller = assessment.addAttribute("sellerId", {
	type: "string",
	optional: true,
	identifies: seller,
	description: "Set when the assessment is of a seller",
});
assessment.addAttribute("score", {
	type: "RiskScore",
	valueobject: riskScoreVO,
});
assessment.addAttribute("signals", {
	type: "Signal[]",
	valueobject: signalVO,
	description:
		"What the score is made of; at least one, or the score is unexplained",
});
assessment.uses(riskScoreVO, "scored", "1");
assessment.uses(signalVO, "explained-by", "1..*");
// The rule the two optional ids need, and the one the model states in prose
// because no field can: a union identity would need a union type, which
// decision 18 leaves out.
assessmentAgg
	.addInvariant("OneSubject", {
		description:
			"Exactly one of orderId and sellerId is set: an assessment is of an order or of a seller, never both and never neither",
	})
	.constrains(assessedOrder, assessedSeller);
assessmentAgg
	.addInvariant("ScoreExplained", {
		description:
			"A flagged score always carries at least one signal, so an agent can defend it",
	})
	.constrains(signalVO);

const orderRiskSchema = fraudBC.addSchema("OrderRiskFlagged");
orderRiskSchema.addAttribute("orderId", {
	type: "string",
	identity: true,
	identifies: order,
});
orderRiskSchema.addAttribute("score", {
	type: "RiskScore",
	valueobject: riskScoreVO,
});
const sellerRiskSchema = fraudBC.addSchema("SellerRiskFlagged");
sellerRiskSchema.addAttribute("sellerId", {
	type: "string",
	identity: true,
	identifies: seller,
});
sellerRiskSchema.addAttribute("score", {
	type: "RiskScore",
	valueobject: riskScoreVO,
});

const orderRiskFlagged = assessmentAgg.provides("OrderRiskFlagged", {
	description: "An order scored above the threshold",
	type: "event",
	pattern: "published-language",
	schema: orderRiskSchema,
});
const sellerRiskFlagged = assessmentAgg.provides("SellerRiskFlagged", {
	description: "A seller looks like a bad actor",
	type: "event",
	pattern: "published-language",
	schema: sellerRiskSchema,
});

const riskScorer = fraudBC.addService("RiskScorer", {
	description:
		"Runs the model over an order or seller and its history; a domain service because it reads across assessments",
	type: "domain",
});
const scoreOrder = riskScorer
	.provides("ScoreOrder", {
		description: "Assess a newly placed order",
		type: "operation",
		internal: true,
	})
	.raises(orderRiskFlagged);
const scoreSeller = riskScorer
	.provides("ScoreSeller", {
		description: "Assess a newly activated seller",
		type: "operation",
		internal: true,
	})
	.raises(sellerRiskFlagged);

// Fraud takes the facts it scores in at its own boundary: an aggregate is a
// consistency boundary, not a client, and the policies below are what react
// (decision 17).
const fraudApi = fraudBC.addService("FraudAPI", {
	description:
		"Trust & Safety's application service: the boundary through which the orders and sellers to be scored arrive",
	type: "application",
});
fraudApi.consumes(orderPlaced, { pattern: "anti-corruption-layer" });
fraudApi.consumes(sellerActivated, { pattern: "anti-corruption-layer" });
fraudBC
	.addPolicy("Score every order", {
		description: "No order ships unscored",
	})
	.on(orderPlaced)
	.issues(scoreOrder);
fraudBC
	.addPolicy("Score every new seller", {
		description: "Activation triggers a first assessment",
	})
	.on(sellerActivated)
	.issues(scoreSeller);

fraudBC.addTerm("Flag", {
	definition: "A score above threshold; it pauses the subject until reviewed",
	embodiedBy: riskScoreVO,
});

// Downstream reactions to fraud verdicts.
orderApi.consumes(orderRiskFlagged, { pattern: "anti-corruption-layer" });
orderBC
	.addPolicy("Cancel flagged orders", {
		description: "A flagged order is cancelled before the warehouse picks it",
	})
	.on(orderRiskFlagged)
	.issues(cancelOrder);
sellerCentral.consumes(sellerRiskFlagged, { pattern: "anti-corruption-layer" });
sellerBC
	.addPolicy("Suspend flagged sellers", {
		description: "Trust & Safety's verdict suspends the seller pending review",
	})
	.on(sellerRiskFlagged)
	.issues(suspendSeller);

/* =======================
   WAREHOUSE
   DISCOVERY: Head of Fulfilment and the Rotherham shift lead. "Reserved can
   never exceed on hand; that would be overselling."
   ======================= */

const inventoryAgg = warehouseBC.addAggregate("InventoryPosition", {
	description: "How much of a SKU one site holds and how much is promised",
});
const position = inventoryAgg.addRootEntity("InventoryPosition", {
	description: "SKU at site",
});
const reservation = inventoryAgg.addEntity("Reservation", {
	description: "Stock promised to an order but not yet picked",
});
const binVO = warehouseBC.addValueObject("Bin", {
	description: "Aisle, shelf, slot",
});
binVO.addAttribute("code", { type: "string" });
position.addAttribute("sku", { type: "string", identity: true });
position.addAttribute("siteId", { type: "string", identity: true });
const onHand = position.addAttribute("onHand", { type: "int" });
reservation.addAttribute("reservationId", { type: "string", identity: true });
reservation.addAttribute("orderId", {
	type: "string",
	identifies: order,
});
reservation.addAttribute("quantity", { type: "int" });
position.includes(reservation, "reserved-by", "*");
position.addAttribute("bins", {
	type: "Bin[]",
	valueobject: binVO,
	description: "Where in the site the stock physically sits",
});
position.uses(binVO, "stored-in", "1..*");
inventoryAgg
	.addInvariant("ReservedWithinOnHand", {
		description:
			"Reservations never exceed stock on hand; overselling is a broken promise",
	})
	.constrains(onHand, reservation);
// The other half of "never pick a flagged order": a cancelled order gives
// its reservation back, and its pick tasks are voided below.
const releaseReservation = inventoryAgg.provides("ReleaseReservation", {
	description:
		"Drop the reservation held for a cancelled order so the stock is available again",
	type: "operation",
	internal: true,
});

const fulfilmentOrderAgg = warehouseBC.addAggregate("FulfilmentOrder", {
	description:
		"The warehouse's view of an order: what to pick, how to pack, when it left",
});
const fulfilmentOrder = fulfilmentOrderAgg.addRootEntity("FulfilmentOrder", {
	description: "Work to do for one order at one site",
});
const pickTask = fulfilmentOrderAgg.addEntity("PickTask", {
	description: "One SKU and quantity for a picker to collect",
});
const packageEntity = fulfilmentOrderAgg.addEntity("Package", {
	description: "A box that leaves the dock",
});
const trackingLabelVO = warehouseBC.addValueObject("TrackingLabel", {
	description:
		"Carrier barcode and scan vocabulary. Part of the kernel shared with Last Mile: one library, one format",
});
trackingLabelVO.addAttribute("barcode", { type: "string" });
trackingLabelVO.addAttribute("carrier", { type: "string" });
fulfilmentOrder.addAttribute("fulfilmentOrderId", {
	type: "string",
	identity: true,
});
fulfilmentOrder.addAttribute("orderId", { type: "string", identifies: order });
pickTask.addAttribute("taskId", { type: "string", identity: true });
pickTask.addAttribute("sku", { type: "string" });
pickTask.addAttribute("quantity", { type: "int" });
const pickStatus = pickTask.addAttribute("status", {
	type: "'pending' | 'picked' | 'voided'",
	description:
		"pending until the picker scans it; voided when the order is cancelled first",
});
packageEntity.addAttribute("packageId", { type: "string", identity: true });
packageEntity.addAttribute("label", {
	type: "TrackingLabel",
	valueobject: trackingLabelVO,
});
fulfilmentOrder.includes(pickTask, "picks", "1..*");
fulfilmentOrder.includes(packageEntity, "packed-into", "*");
// A package knows which pick tasks went into it, which is what the
// invariant below reads. Inside one aggregate a reference is enough.
packageEntity.references(pickTask, "packs", "1..*");
packageEntity.uses(trackingLabelVO, "labelled", "1");
// The Order root is in Order Management, another bounded context: the
// fulfilment order holds `orderId` and nothing more.
fulfilmentOrderAgg
	.addInvariant("DispatchOnlyWhenPicked", {
		description:
			"A package is dispatched only when every pick task packed into it has status picked",
	})
	.constrains(packageEntity, pickStatus);

const stockReservedSchema = warehouseBC.addSchema("StockReserved");
stockReservedSchema.addAttribute("orderId", {
	type: "string",
	identity: true,
	identifies: order,
});
stockReservedSchema.addAttribute("siteId", { type: "string" });
const shipmentDispatchedSchema = warehouseBC.addSchema("ShipmentDispatched", {
	description: "The fact orders, payments and last mile all react to",
});
shipmentDispatchedSchema.addAttribute("packageId", {
	type: "string",
	identity: true,
	identifies: packageEntity,
});
shipmentDispatchedSchema.addAttribute("orderId", {
	type: "string",
	identifies: order,
});
shipmentDispatchedSchema.addAttribute("label", {
	type: "TrackingLabel",
	valueobject: trackingLabelVO,
});
const returnReceivedSchema = warehouseBC.addSchema("ReturnReceived");
returnReceivedSchema.addAttribute("returnId", {
	type: "string",
	identity: true,
	identifies: returnEntity,
});
returnReceivedSchema.addAttribute("condition", {
	type: "'resellable' | 'damaged'",
});

const stockReserved = inventoryAgg.provides("StockReserved", {
	description: "Stock is held for an order at a site",
	type: "event",
	pattern: "published-language",
	schema: stockReservedSchema,
});
const stockShort = inventoryAgg.provides("StockShort", {
	description: "No site could cover the order; it waits or is split",
	type: "event",
	pattern: "published-language",
	schema: stockReservedSchema,
});
const stockReceived = inventoryAgg.provides("StockReceived", {
	description: "A vendor delivery was booked in",
	type: "event",
	internal: true,
});
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const warehouseApi = warehouseBC.addService("WarehouseAPI", {
	description:
		"The warehouse's application service: the boundary stock is reserved through",
	type: "application",
});
const reserveStock = warehouseApi
	.provides("ReserveStock", {
		description:
			"Hold stock for an order, choosing the nearest site that has it",
		type: "operation",
		pattern: "open-host-service",
		schema: stockReservedSchema,
	})
	.raises(stockReserved, stockShort);
const receiveStock = inventoryAgg
	.provides("ReceiveStock", {
		description: "Book in a vendor delivery",
		type: "operation",
		internal: true,
	})
	.raises(stockReceived);

const shipmentDispatched = fulfilmentOrderAgg.provides("ShipmentDispatched", {
	description: "A package left the dock",
	type: "event",
	pattern: "published-language",
	schema: shipmentDispatchedSchema,
});
const returnReceived = fulfilmentOrderAgg.provides("ReturnReceived", {
	description: "A return arrived and was graded",
	type: "event",
	pattern: "published-language",
	schema: returnReceivedSchema,
});
const createPickTasks = fulfilmentOrderAgg.provides("CreatePickTasks", {
	description: "Turn a reservation into work for pickers",
	type: "operation",
	internal: true,
});
const voidPickTasks = fulfilmentOrderAgg.provides("VoidPickTasks", {
	description:
		"Mark every pending pick task of a cancelled order voided so nothing is picked or packed for it",
	type: "operation",
	internal: true,
});
fulfilmentOrderAgg
	.provides("Dispatch", {
		description: "Hand a packed package to the carrier",
		type: "operation",
		internal: true,
	})
	.raises(shipmentDispatched);
const receiveReturn = fulfilmentOrderAgg
	.provides("ReceiveReturn", {
		description: "Grade a returned item and restock or scrap it",
		type: "operation",
		internal: true,
	})
	.raises(returnReceived);

warehouseApi.consumes(orderPlaced, { pattern: "anti-corruption-layer" });
warehouseApi.consumes(returnRequested, {
	pattern: "anti-corruption-layer",
});
warehouseBC
	.addPolicy("Reserve on order", {
		description: "Every placed order gets stock held immediately",
	})
	.on(orderPlaced)
	.issues(reserveStock);
warehouseBC
	.addPolicy("Pick on reservation", {
		description: "Held stock becomes pick tasks",
	})
	.on(stockReserved)
	.issues(createPickTasks);
warehouseBC
	.addPolicy("Expect requested returns", {
		description: "A requested return is graded on arrival",
	})
	.on(returnRequested)
	.issues(receiveReturn);
// The guarantee the warehouse asked for: a cancellation (fraud or customer)
// releases the reservation and voids the pick tasks, so a flagged order that
// was reserved a moment earlier is never picked.
// One consumption, though two aggregates act on it: the context takes the
// cancellation in at its boundary and the policy below is what fans it out.
warehouseApi.consumes(orderCancelled, { pattern: "anti-corruption-layer" });
warehouseBC
	.addPolicy("Release on cancellation", {
		description:
			"A cancelled order gives its stock back and its pick tasks are voided before a picker reaches them",
	})
	.on(orderCancelled)
	.issues(releaseReservation, voidPickTasks);

warehouseBC.addTerm("On hand", {
	definition: "Physically present stock, whether or not reserved",
	aliases: ["Stock"],
	embodiedBy: position,
});
warehouseBC.addTerm("Package", {
	definition: "A box with one tracking label",
	aliases: ["Parcel"],
	embodiedBy: packageEntity,
});
// "Order means three things in this building"; the shift lead says which.
warehouseBC.addTerm("Fulfilment order", {
	definition:
		"The warehouse's own work record for one customer order at one site. 'Order' alone is ambiguous here: customer order (Orders), purchase order (VPS) or this",
	embodiedBy: fulfilmentOrderAgg,
});

// Order, payments and customer service react to warehouse facts.
orderApi.consumes(shipmentDispatched, { pattern: "anti-corruption-layer" });
orderApi.consumes(returnReceived, { pattern: "anti-corruption-layer" });
orderApi.consumes(stockShort, { pattern: "anti-corruption-layer" });
// The refund is asked for by an operation of Order Management's own boundary,
// which is what the policy below names and what makes the call (decision 17).
const requestRefund = orderApi.provides("RequestRefund", {
	description:
		"Ask Payments to return the money for a graded return, through the ACL",
	type: "operation",
	internal: true,
});
orderApi.consumes(refundPayment, {
	pattern: "anti-corruption-layer",
	by: [requestRefund],
});
// One order, from placed to delivered, is a process: it remembers which of its
// shipments have gone and which have arrived, so nothing completes the order
// until the last parcel is handed over. The last mile's fact is joined to it
// further down, once ParcelDelivered exists.
const orderToDelivery = orderBC
	.addProcess("Order to delivery", {
		description:
			"From a paid-for order to every line in the customer's hands. It waits for the warehouse: a dispatch becomes a customer-visible shipment, a stock shortage puts the order into awaiting-stock rather than letting it stall silently, and the last parcel handed over completes it. Correlation is by orderId, which every fact it waits for carries; it ends when the order is completed, or earlier if the order is cancelled before anything ships",
	})
	.starts(orderPlaced)
	.on(shipmentDispatched, stockShort)
	.issues(recordShipment, holdForStock)
	.ends(orderCompleted, orderCancelled);
orderBC
	.addPolicy("Refund on received return", {
		description: "Money goes back once the warehouse has graded the return",
	})
	.on(returnReceived)
	.issues(requestRefund);
paymentsApi.consumes(shipmentDispatched, { pattern: "anti-corruption-layer" });
paymentsBC
	.addPolicy("Capture on dispatch", {
		description: "Charge for each shipment as it leaves",
	})
	.on(shipmentDispatched)
	.issues(capturePayment);

/* =======================
   LAST MILE
   DISCOVERY: Logistics operations manager. Up to 150 stops a day; proof of
   delivery; the unresolved question of conform-or-translate.
   ======================= */

const routeAgg = lastMileBC.addAggregate("DeliveryRoute", {
	description: "A driver's day: an ordered list of stops",
});
const route = routeAgg.addRootEntity("DeliveryRoute", {
	description: "One vehicle, one date, one sequence of stops",
});
const stop = routeAgg.addEntity("Stop", {
	description: "One address and the parcels to hand over there",
});
// Logistics says parcel and means the thing at a stop: the third of the
// three words (shipment, package, parcel), each an entity in its own context.
const parcel = routeAgg.addEntity("Parcel", {
	description:
		"One labelled item to hand over at a stop; the warehouse's package once it is on a van",
});
// The same barcode and scan vocabulary the warehouse prints: the shared
// kernel is one library, so Last Mile holds the warehouse's own value object
// rather than a copy of it. A relation may not cross a context boundary, so
// the attribute's `valueobject` is the whole of the link.
const lastMileLabelVO = trackingLabelVO;
const proofVO = lastMileBC.addValueObject("ProofOfDelivery", {
	description: "Photo, signature or safe-place note",
});
proofVO.addAttribute("kind", { type: "'photo' | 'signature' | 'safe-place'" });
proofVO.addAttribute("capturedAt", { type: "date-time" });
route.addAttribute("routeId", { type: "string", identity: true });
route.addAttribute("date", { type: "date" });
// A stop is told apart from the next by where it falls on the route.
stop.addAttribute("sequence", { type: "int", identity: true });
parcel.addAttribute("label", {
	type: "TrackingLabel",
	valueobject: lastMileLabelVO,
});
parcel.addAttribute("parcelId", { type: "string", identity: true });
parcel.addAttribute("orderId", { type: "string", identifies: order });
route.includes(stop, "visits", "1..*");
stop.includes(parcel, "hands-over", "1..*");
stop.addAttribute("proofOfDelivery", {
	type: "ProofOfDelivery",
	valueobject: proofVO,
	optional: true,
	description: "Captured at the door; absent until the stop is completed",
});
stop.uses(proofVO, "proven-by", "0..1");
routeAgg
	.addInvariant("MaxStopsPerRoute", {
		description:
			"A route has at most 150 stops, the most a driver can do in a shift",
	})
	.constrains(route);

const parcelDeliveredSchema = lastMileBC.addSchema("ParcelDelivered");
parcelDeliveredSchema.addAttribute("barcode", {
	type: "string",
	identity: true,
});
parcelDeliveredSchema.addAttribute("orderId", {
	type: "string",
	identifies: order,
});
parcelDeliveredSchema.addAttribute("deliveredAt", { type: "date-time" });
const attemptFailedSchema = lastMileBC.addSchema("DeliveryAttemptFailed");
attemptFailedSchema.addAttribute("barcode", { type: "string", identity: true });
attemptFailedSchema.addAttribute("orderId", {
	type: "string",
	identifies: order,
});
attemptFailedSchema.addAttribute("reason", { type: "string" });

const parcelDelivered = routeAgg.provides("ParcelDelivered", {
	description: "Handed over with proof",
	type: "event",
	pattern: "published-language",
	schema: parcelDeliveredSchema,
});
const attemptFailed = routeAgg.provides("DeliveryAttemptFailed", {
	description: "Nobody home, or the address was wrong",
	type: "event",
	pattern: "published-language",
	schema: attemptFailedSchema,
});
const assignParcel = routeAgg.provides("AssignParcelToRoute", {
	description: "Put a dispatched package on tomorrow's route",
	type: "operation",
	internal: true,
});
routeAgg
	.provides("RecordDelivery", {
		description: "The driver scans the label at the door",
		type: "operation",
		internal: true,
	})
	.raises(parcelDelivered, attemptFailed);

// No downstream role, and none is wanted: Warehouse and Last Mile share a
// kernel, so neither is upstream of the other and there is nothing to conform
// to or translate. role-coherence exempts symmetric partners for that reason.
const lastMileApi = lastMileBC.addService("LastMileAPI", {
	description:
		"Last Mile's application service: the boundary through which dispatched packages arrive to be routed",
	type: "application",
});
lastMileApi.consumes(shipmentDispatched, {});
lastMileBC
	.addPolicy("Route dispatched packages", {
		description: "Every dispatched package gets a stop",
	})
	.on(shipmentDispatched)
	.issues(assignParcel);

lastMileBC.addTerm("Stop", {
	definition: "One address on a route, however many parcels go there",
	embodiedBy: stop,
});
lastMileBC.addTerm("Parcel", {
	definition:
		"The labelled item handed over at a stop. Orders calls it a shipment and the warehouse a package; the label is the one thing all three agree on",
	aliases: ["Package"],
	embodiedBy: parcel,
});

orderApi.consumes(parcelDelivered, { pattern: "anti-corruption-layer" });
// The last step of the order-to-delivery process above: it is written here
// because ParcelDelivered belongs to Last Mile, which is declared below Orders.
orderToDelivery.on(parcelDelivered).issues(completeOrder);

/* =======================
   ADVERTISING
   DISCOVERY: Ads product lead. Second-price auction; no bid above the daily
   budget; campaigns pause the moment a seller is suspended.
   ======================= */

const campaignAgg = adsBC.addAggregate("Campaign", {
	description: "A seller's budget and the ad groups that spend it",
});
const campaign = campaignAgg.addRootEntity("Campaign", {
	description: "One seller's advertising plan with a daily budget",
});
const adGroup = campaignAgg.addEntity("AdGroup", {
	description: "Products and keywords that share a bid",
});
const campaignMoney = money(adsBC);
const bidVO = adsBC.addValueObject("Bid", {
	description: "What the seller pays per click, at most",
});
bidVO.addAttribute("maxCpc", { type: "Money", valueobject: campaignMoney });
bidVO.uses(campaignMoney, "capped-at", "1");
campaign.addAttribute("campaignId", { type: "string", identity: true });
campaign.addAttribute("sellerId", { type: "string", identifies: seller });
const dailyBudget = campaign.addAttribute("dailyBudget", {
	type: "Money",
	valueobject: campaignMoney,
});
adGroup.addAttribute("adGroupId", { type: "string", identity: true });
adGroup.addAttribute("keywords", { type: "string[]" });
adGroup.addAttribute("bid", { type: "Bid", valueobject: bidVO });
adGroup.addAttribute("productId", {
	type: "string",
	description:
		"Identity of the Product root in Catalogue; only the id crosses the boundary",
	identifies: product,
});
campaign.includes(adGroup, "spends-through", "1..*");
campaign.uses(campaignMoney, "budgeted", "1");
adGroup.uses(bidVO, "bids", "1");
// The Product root is in Catalogue, another bounded context, so the ad group
// holds `productId` instead of pointing at it.
campaignAgg
	.addInvariant("BidWithinBudget", {
		description: "No bid exceeds the daily budget",
	})
	.constrains(bidVO, dailyBudget);
campaignAgg
	.addInvariant("BudgetPositive", {
		description: "A campaign with no budget cannot run",
	})
	.constrains(dailyBudget);

const adClickedSchema = adsBC.addSchema("AdClicked");
adClickedSchema.addAttribute("campaignId", { type: "string", identity: true });
adClickedSchema.addAttribute("productId", {
	type: "string",
	identifies: product,
});
adClickedSchema.addAttribute("cost", {
	type: "Money",
	valueobject: campaignMoney,
});

const adClicked = campaignAgg.provides("AdClicked", {
	description: "A sponsored result was clicked and the bid charged",
	type: "event",
	pattern: "published-language",
	schema: adClickedSchema,
});
const slotsAwarded = campaignAgg.provides("SlotsAwarded", {
	description:
		"An auction chose the winners for one results page; nothing is charged until a click",
	type: "event",
	internal: true,
});
const campaignLaunched = campaignAgg.provides("CampaignLaunched", {
	description: "A campaign began spending",
	type: "event",
	internal: true,
});
const pauseCampaigns = campaignAgg.provides("PauseSellerCampaigns", {
	description: "Stop every campaign of a seller",
	type: "operation",
	internal: true,
});

// A returned shape: the winners RunAuction and GetSponsoredResults answer with.
const sponsoredSlotSchema = adsBC.addSchema("SponsoredSlot", {
	description: "One paid placement won for a query",
});
sponsoredSlotSchema.addAttribute("productId", {
	type: "string",
	identity: true,
	identifies: product,
});
sponsoredSlotSchema.addAttribute("bid", { type: "Bid", valueobject: bidVO });
const sponsoredResultsSchema = adsBC.addSchema("SponsoredResults", {
	description: "The winning slots for a query, ranked",
});
sponsoredResultsSchema.addAttribute("slots", {
	type: "SponsoredSlot[]",
	schema: sponsoredSlotSchema,
});

const auction = adsBC.addService("AuctionService", {
	description:
		"Runs the second-price auction for the sponsored slots on a results page",
	type: "domain",
});
// Pay per click: the auction awards slots, and only a click, reported by the
// results page, charges the second price.
auction
	.provides("RunAuction", {
		description: "Pick winners for a query's sponsored slots",
		type: "operation",
		internal: true,
		returns: sponsoredResultsSchema,
	})
	.raises(slotsAwarded);

const adsApi = adsBC.addService("AdsAPI", {
	description:
		"Campaign management for sellers and the sponsored-results read for Search",
	type: "application",
});
const createCampaign = adsApi
	.provides("CreateCampaign", {
		description: "Start a campaign",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(campaignLaunched);
const getSponsoredResults = adsApi.provides("GetSponsoredResults", {
	description:
		"Sponsored slots for a query, merged into organic results by Search",
	type: "operation",
	pattern: "open-host-service",
	returns: sponsoredResultsSchema,
});
const recordAdClick = adsApi
	.provides("RecordAdClick", {
		description:
			"The results page reports a click on a sponsored slot; this is the moment the seller is charged",
		type: "operation",
		pattern: "open-host-service",
		schema: adClickedSchema,
	})
	.raises(adClicked);
// Ad groups advertise catalogue products; the ids are checked against the
// product API when the campaign is created, which is the only one of AdsAPI's
// three operations that reaches Catalogue.
adsApi.consumes(getProduct, { pattern: "conformist", by: [createCampaign] });

adsApi.consumes(sellerSuspended, { pattern: "conformist" });
adsBC
	.addPolicy("Pause campaigns of suspended seller", {
		description:
			"A suspended seller stops spending the moment they are suspended",
	})
	.on(sellerSuspended)
	.issues(pauseCampaigns);

// Partnership: search and ads tune the results page together, so Search
// takes the sponsored slots as-is and reports clicks on them the same way.
// SearchAPI answers four operations and one of them makes each call: the
// results page merges the slots, and the click report is its own step.
searchApi.consumes(getSponsoredResults, {
	pattern: "conformist",
	by: [searchProducts],
});
searchApi.consumes(recordAdClick, {
	pattern: "conformist",
	by: [reportAdClick],
});

adsBC.addTerm("Sponsored slot", {
	definition:
		"A results-page position sold by auction rather than earned by relevance",
	aliases: ["Sponsored Product"],
	embodiedBy: auction,
});

/* =======================
   CUSTOMER SERVICE
   DISCOVERY: Customer Service operations manager. Failed deliveries open cases
   automatically; the copied order lines are the wrong-refund problem.
   ======================= */

const caseAgg = csBC.addAggregate("Case", {
	description: "A customer's problem and everything done about it",
});
const caseRoot = caseAgg.addRootEntity("Case", {
	description: "One problem, one owner, one outcome",
});
const interaction = caseAgg.addEntity("Interaction", {
	description: "A call, chat or email on the case",
});
const resolutionVO = csBC.addValueObject("Resolution", {
	description: "How it ended: refund, replacement, information, no action",
});
resolutionVO.addAttribute("kind", {
	type: "'refund' | 'replacement' | 'information' | 'no-action'",
});
caseRoot.addAttribute("caseId", { type: "string", identity: true });
// OpenCase creates a case for a customer and only optionally about an order,
// so a case that is about the account rather than an order holds no orderId.
caseRoot.addAttribute("orderId", {
	type: "string",
	identifies: order,
	optional: true,
});
// `customerId` is declared with the CustomerAccount root further down, because
// the root it identifies has to exist before the attribute can name it.
interaction.addAttribute("interactionId", { type: "string", identity: true });
interaction.addAttribute("channel", { type: "'call' | 'chat' | 'email'" });
interaction.addAttribute("at", { type: "date-time" });
caseRoot.includes(interaction, "logged", "*");
caseRoot.addAttribute("resolution", {
	type: "Resolution",
	valueobject: resolutionVO,
	optional: true,
	description: "Absent while the case is open",
});
caseRoot.uses(resolutionVO, "resolved-as", "0..1");
// The Order root is in Order Management, another bounded context, so the case
// holds `orderId` above and no relation.

caseAgg
	.addInvariant("ResolvedCaseHasInteraction", {
		description:
			"A case is never resolved without at least one interaction with the customer",
	})
	.constrains(caseRoot);

const caseOpened = caseAgg.provides("CaseOpened", {
	description: "A case exists and needs an agent",
	type: "event",
	pattern: "published-language",
});
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const caseApi = csBC.addService("CaseAPI", {
	description:
		"Customer Service's application service: the boundary cases are opened through",
	type: "application",
});
const openCase = caseApi
	.provides("OpenCase", {
		description: "Create a case for a customer, optionally about an order",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(caseOpened);
caseAgg.provides("ResolveCase", {
	description: "Close the case with a resolution",
	type: "operation",
	internal: true,
});

caseApi.consumes(getOrder, {
	pattern: "anti-corruption-layer",
	by: [openCase],
});
// RequestReturn names no caller: an agent raises a return while working a case,
// and the operation that does it is the aggregate's ResolveCase, which is not
// CaseAPI's to name (decision 21). CaseAPI offers one operation, so nothing is
// ambiguous either way (`consumption-by-required`).
caseApi.consumes(requestReturn, { pattern: "anti-corruption-layer" });
caseApi.consumes(attemptFailed, { pattern: "anti-corruption-layer" });
csBC
	.addPolicy("Open case on failed delivery", {
		description:
			"A failed attempt reaches an agent before the customer has to call",
	})
	.on(attemptFailed)
	.issues(openCase);

csBC.addTerm("Case", {
	definition: "One customer problem tracked to an outcome",
	aliases: ["Ticket", "Contact"],
	embodiedBy: caseAgg,
});

/* =======================
   VENDOR PURCHASING (legacy)
   DISCOVERY: Retail Systems engineer. "I can describe the export; I can't
   describe the rest."
   ======================= */

const purchaseOrderAgg = vendorBC.addAggregate("PurchaseOrder", {
	description:
		"As far as anyone can tell, the central table of the legacy system",
});
const purchaseOrder = purchaseOrderAgg.addRootEntity("PurchaseOrder", {
	description: "An order placed with a wholesale vendor",
});
purchaseOrder.addAttribute("poNumber", { type: "string", identity: true });
purchaseOrder.addAttribute("vendorCode", { type: "string" });

const purchaseOrderLineSchema = vendorBC.addSchema("PurchaseOrderLine", {
	description: "One line of the nightly export",
});
purchaseOrderLineSchema.addAttribute("sku", { type: "string", identity: true });
purchaseOrderLineSchema.addAttribute("quantity", { type: "int32" });
const poReceivedSchema = vendorBC.addSchema("PurchaseOrderReceived", {
	description: "The nightly export the warehouse reads",
});
poReceivedSchema.addAttribute("poNumber", { type: "string", identity: true });
poReceivedSchema.addAttribute("lines", {
	type: "PurchaseOrderLine[]",
	schema: purchaseOrderLineSchema,
});
const purchaseOrderReceived = purchaseOrderAgg.provides(
	"PurchaseOrderReceived",
	{
		description:
			"Vendor stock arrived at a site (a nightly batch, not real time)",
		type: "event",
		pattern: "published-language",
		schema: poReceivedSchema,
	},
);

// DISCOVERY: Retail Systems engineer, "the nightly export of received vendor
// stock". Card 81 gave that a NightlyExport service with a RunNightlyExport
// operation so the event had a raiser, and its own description gave the game
// away: "the one job of the ninety that anyone can describe". Ninety jobs
// nobody can read is what a big ball of mud is, and such a context may say what
// it emits without saying how (decision 28, second amendment; card 90). The
// service and its operation are gone; the export file still arrives.

vendorBC.addTerm("Purchase order", {
	definition:
		"An order RiverMart places with a wholesale vendor; the second of the three meanings of 'order' on a warehouse floor",
	aliases: ["PO"],
	embodiedBy: purchaseOrderAgg,
});

warehouseApi.consumes(purchaseOrderReceived, {
	pattern: "anti-corruption-layer",
});
warehouseBC
	.addPolicy("Book in vendor deliveries", {
		description: "The legacy export is translated into stock receipts",
	})
	.on(purchaseOrderReceived)
	.issues(receiveStock);

/* =======================
   IDENTITY
   ======================= */

const customerAgg = identityBC.addAggregate("CustomerAccount", {
	description: "Who is shopping",
});
const customer = customerAgg.addRootEntity("CustomerAccount", {
	description: "A registered customer",
});
customer.addAttribute("customerId", { type: "string", identity: true });
customer.addAttribute("email", { type: "string" });
// Every customer id in the model is declared here, because an attribute can
// only name a root that already exists and this is where the CustomerAccount
// root is. Each of these aggregates is in another bounded context, so this
// identity is the whole of what it holds of a customer.
cart.addAttribute("customerId", { type: "string", identifies: customer });
order.addAttribute("customerId", { type: "string", identifies: customer });
caseRoot.addAttribute("customerId", { type: "string", identifies: customer });
// The same customer id, carried on two payloads declared earlier: a payload
// that carries an id says whose it is, same as an attribute.
cartCheckedOutSchema.addAttribute("customerId", {
	type: "string",
	identifies: customer,
});
orderPlacedSchema.addAttribute("customerId", {
	type: "string",
	identifies: customer,
});

const customerRegistered = customerAgg.provides("CustomerRegistered", {
	description: "A new customer account exists",
	type: "event",
	pattern: "published-language",
});
const identityApi = identityBC.addService("IdentityAPI", {
	description: "Account endpoints",
	type: "application",
});
identityApi
	.provides("RegisterCustomer", {
		description: "Create an account",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(customerRegistered);
// A returned shape: what GetCustomer answers with.
const customerProfileSchema = identityBC.addSchema("CustomerProfile", {
	description: "A customer's profile",
});
customerProfileSchema.addAttribute("customerId", {
	type: "string",
	identity: true,
});
customerProfileSchema.addAttribute("email", { type: "string" });
const getCustomer = identityApi.provides("GetCustomer", {
	description: "Read a customer's profile",
	type: "operation",
	pattern: "open-host-service",
	returns: customerProfileSchema,
});
// Who the cart belongs to is read as the cart is frozen: CartCheckedOut carries
// the customer id, and none of the orchestrator's other three operations asks
// Identity for anything. Opening a case does the same on the other side.
checkoutOrchestrator.consumes(getCustomer, {
	pattern: "conformist",
	by: [checkoutOperation],
});
caseApi.consumes(getCustomer, { pattern: "conformist", by: [openCase] });

// "Customer" is said in three contexts; only this one holds the record.
identityBC.addTerm("Customer", {
	definition:
		"The account record. Orders and Cases say customer too but carry only the customerId; nothing about a person lives outside Identity",
	aliases: ["Account"],
	embodiedBy: customerAgg,
});

/* =======================
   CONTEXT RELATIONSHIPS
   DISCOVERY section 6: each type chosen from the playbook's questions (who
   depends on whom, is the downstream consulted, do they release together, do
   they share code, have they decided never to integrate).
   ======================= */

offersBC.downstreamOf(catalogueBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description:
		"Offers keep their own SKU list translated from catalogue events",
});
searchBC.downstreamOf(catalogueBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
});
searchBC.downstreamOf(offersBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
	description: "The buy box price is indexed as published",
});
offersBC.downstreamOf(sellerBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
});
cartBC.downstreamOf(offersBC, {
	type: "customer-supplier",
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
	description:
		"Checkout is the offer API's main customer and gets a say in its contract",
});
cartBC.downstreamOf(paymentsBC, {
	type: "customer-supplier",
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
});
cartBC.downstreamOf(orderBC, {
	type: "customer-supplier",
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
});
cartBC.downstreamOf(identityBC, {
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["conformist"],
});
// Identity-only dependencies. Each pair below is joined by nothing but an
// identity attribute naming the other context's entity, which since decision
// 14 is how the model records a dependency on another context's model. Nothing
// is exchanged, so neither end plays an upstream or downstream role and both
// lists stay empty; the relationship says which way the dependency runs and
// that somebody looked at it, which is what `relationship-declared` asks for
// (card 70). This first one was written before the rule existed and was read
// then as an invention; it is now simply what the rule requires.
orderBC.downstreamOf(offersBC, {
	upstreamRoles: [],
	downstreamRoles: [],
	description:
		"Order lines carry the offer id they were bought from; Orders never reads Offers back, so the coupling is identity only and neither side plays a role in an exchange that does not happen",
});
cartBC.downstreamOf(catalogueBC, {
	upstreamRoles: [],
	downstreamRoles: [],
	description:
		"A wishlist item names the product it saves; the shopper's list holds ids, and prices and titles come from Offers",
});
orderBC.downstreamOf(catalogueBC, {
	upstreamRoles: [],
	downstreamRoles: [],
	description:
		"An order line names the variant it was bought as, by SKU; the order never reads the catalogue back",
});
orderBC.downstreamOf(identityBC, {
	upstreamRoles: [],
	downstreamRoles: [],
	description: "An order names the customer account it was placed by, by id",
});
// Payments was listed here too, for the cart id its PaymentAuthorised and
// AuthorisePayment payloads carry. The description said it plainly — "so
// checkout can match it back" — which is a payload carrying an id for its
// reader, not Payments depending on Cart & Checkout's model: Payments stores no
// cart and asks Checkout for nothing (decision 14, second amendment). The
// relationship that matters between the two runs the other way, and is
// declared below; this one was the rule's invention and is gone (card 90).
lastMileBC.downstreamOf(orderBC, {
	upstreamRoles: [],
	downstreamRoles: [],
	description:
		"A delivery event names the order it belongs to; Last Mile keeps the id, not the order",
});
orderBC.downstreamOf(paymentsBC, {
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "Refunds are requested through the payments API",
});
paymentsBC.downstreamOf(orderBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description:
		"The order id is attached to the payment on OrderPlaced so captures at dispatch can find it",
});
adsBC.downstreamOf(catalogueBC, {
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["conformist"],
	description: "Ad groups advertise catalogue products by id",
});
warehouseBC.downstreamOf(orderBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "The warehouse turns orders into its own fulfilment orders",
});
orderBC.downstreamOf(warehouseBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "Dispatches and returns flow back onto the order",
});
paymentsBC.downstreamOf(warehouseBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "Capture happens on dispatch",
});
fraudBC.downstreamOf(orderBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
});
orderBC.downstreamOf(fraudBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description:
		"Verdicts come back as events; orders never call fraud synchronously",
});
fraudBC.downstreamOf(sellerBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
});
sellerBC.downstreamOf(fraudBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
});
lastMileBC.downstreamOf(warehouseBC, {
	upstreamRoles: ["published-language"],
	description:
		"Last Mile takes the dispatch feed as the warehouse publishes it, and declares no downstream role: the two also share a kernel, so neither is upstream of the other and neither has a role to declare (card 47)",
});
orderBC.downstreamOf(lastMileBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
});
csBC.downstreamOf(lastMileBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
});
csBC.downstreamOf(orderBC, {
	type: "customer-supplier",
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
	description:
		"Agents need order reads and returns; Orders commits to that contract",
});
csBC.downstreamOf(identityBC, {
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["conformist"],
});
adsBC.downstreamOf(sellerBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
});
warehouseBC.downstreamOf(vendorBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description:
		"The nightly export is translated; nobody touches the legacy tables directly",
});

// Shared kernel: one tracking label library and scan vocabulary, co-owned by
// Fulfilment and Logistics, because a label printed in one is scanned in the other.
warehouseBC.sharesKernelWith(lastMileBC, {
	description: "TrackingLabel format and scan events are one shared library",
	disposition: "tolerated",
	comments: [
		{
			text: "TrackingLabel and the scan event codes live in @rivermart/tracking, imported by both.",
			link: {
				kind: "code",
				url: "https://github.com/example/rivermart/blob/main/packages/tracking/src/TrackingLabel.ts",
				label: "packages/tracking/src/TrackingLabel.ts",
			},
		},
		{
			text: "The label format is a carrier standard, so neither side can own it; the kernel is the cheapest place to keep it in step.",
			link: {
				kind: "contract",
				url: "https://github.com/example/rivermart/blob/main/docs/carrier-label-spec.md",
				label: "Carrier label spec",
			},
		},
	],
});

// Partnership: organic ranking and sponsored slots are tuned and released
// together. Every dependency runs one way — Search calls GetSponsoredResults
// and reports clicks through RecordAdClick, and Advertising consumes nothing
// of Search's — and that is fine: Evans's partnership is two teams whose
// success is mutual and whose releases are planned as one, which does not
// require traffic both ways (decision 20's second amendment). This used to
// raise partnership-backed; card 69 relaxed the rule and it is no longer a
// finding. See DISCOVERY.md section 7.
searchBC.partnerOf(adsBC, {
	description: "The results page is one product owned by two teams",
	comments: [
		{
			text: "Organic ranking and sponsored slots are blended in one service; neither team deploys the results page alone.",
			link: {
				kind: "code",
				url: "https://github.com/example/rivermart/blob/main/search/results/BlendedRanker.ts",
				label: "search/results/BlendedRanker.ts",
			},
		},
	],
});

// Separate ways: first-party vendors and third-party sellers are different
// businesses with different contracts; integrating them was tried and abandoned.
vendorBC.separateWaysFrom(sellerBC, {
	description:
		"Vendors and sellers are kept apart by policy; no shared identity, no shared data",
});
