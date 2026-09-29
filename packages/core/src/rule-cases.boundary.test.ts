import {
	aggregate,
	application,
	type Case,
	type Consumable,
	call,
	operation,
	runCases,
	subscription,
	world,
} from "./rule-cases.support";

/**
 * Slice 1 of issue #57: the smallest model that trips each boundary, caller
 * and answer-routing rule, and the nearest model that must stay clean.
 *
 * Every case is one builder taking `hostile`. The hostile model trips the
 * rules in `fires` and nothing else; the near-miss differs from it by the one
 * thing the rule is about and validates with no diagnostic at all. A change
 * that widens a rule trips a near-miss; a change that narrows one loses a
 * hostile. Where a rule's pair already exists as a test in
 * `validate.test.ts`, the coverage table in card 138 names it; the pairs here
 * are written to the same shape so that all of them read alike.
 */

// ---------------------------------------------------------------------------
// Boundary and borrowing
// ---------------------------------------------------------------------------

/** Down types an attribute by Up's value object; `route` is what allows it. */
function borrowed(
	route: "none" | "conformist" | "customer" | "kernel" | "partner",
) {
	const { ws, context } = world();
	const up = context("Up");
	const down = context("Down");
	const money = up.addValueObject("Money", { description: "" });
	money.addAttribute("Amount", { type: "int64" });
	const { root } = aggregate(down, "Order");
	root.addAttribute("Total", { type: "Money", valueobject: money });
	if (route === "conformist")
		up.upstreamOf(down, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
	if (route === "customer") up.upstreamOf(down, { type: "customer-supplier" });
	if (route === "kernel") up.sharesKernelWith(down);
	if (route === "partner") up.partnerOf(down);
	return { ws, up, down, money, root };
}

const boundaryCases: Case[] = [
	{
		rules: ["cross-context-relation"],
		name: "an entity references a root of another context, or holds its identity",
		fires: ["cross-context-relation"],
		build: (hostile) => {
			const { ws, context } = world();
			const pet = aggregate(context("Catalogue"), "Pet");
			const order = aggregate(context("Sales"), "Order");
			if (hostile) order.root.references(pet.root, "reserves");
			else
				order.root.addAttribute("PetId", {
					type: "uuid",
					identifies: pet.root,
				});
			return ws;
		},
	},
	{
		rules: ["cross-context-relation", "valueobject-context"],
		name: "a value object of another context is borrowed with no shared kernel, conformist or customer route",
		fires: [
			"cross-context-relation",
			"relationship-declared",
			"valueobject-context",
		],
		build: (hostile) => {
			const { ws, money, root } = borrowed(hostile ? "none" : "conformist");
			root.uses(money, "costs");
			return ws;
		},
	},
	{
		rules: ["valueobject-context"],
		name: "a partnership is not a shared kernel, so it lets nothing be borrowed",
		fires: ["partnership-backed", "valueobject-context"],
		build: (hostile) => borrowed(hostile ? "partner" : "kernel").ws,
	},
	{
		rules: ["valueobject-context"],
		name: "the customer of a customer-supplier pair may borrow; a stranger may not",
		fires: ["relationship-declared", "valueobject-context"],
		build: (hostile) => borrowed(hostile ? "none" : "customer").ws,
	},
	{
		rules: ["specialisation-in-boundary"],
		name: "a value object is a kind of one of another context, or of one it borrows",
		fires: ["specialisation-in-boundary"],
		build: (hostile) => {
			const { ws, context } = world();
			const up = context("Up");
			const down = context("Down");
			const money = up.addValueObject("Money", { description: "" });
			money.addAttribute("Amount", { type: "int64" });
			down.addValueObject("Fee", { description: "", specialises: money });
			if (!hostile) {
				// A kernel with nothing in it is reported by shared-kernel-backed,
				// so the near-miss puts Money in it: Down holds one.
				up.sharesKernelWith(down);
				aggregate(down, "Order").root.addAttribute("Total", {
					type: "Money",
					valueobject: money,
				});
			}
			return ws;
		},
	},
	{
		rules: ["specialisation-in-boundary"],
		name: "an entity is a kind of an entity of its own aggregate, not of another's",
		fires: ["specialisation-in-boundary"],
		build: (hostile) => {
			const { ws, context } = world();
			const bc = context("Sales");
			const order = aggregate(bc, "Order");
			const invoice = aggregate(bc, "Invoice");
			const line = order.agg.addEntity("Line", { description: "" });
			line.addAttribute("LineId", { type: "uuid", identity: true });
			order.root.includes(line, "holds");
			const rush = (hostile ? invoice : order).agg.addEntity("Rush line", {
				description: "",
				specialises: line,
			});
			if (!hostile) order.root.includes(rush, "holds");
			else invoice.root.includes(rush, "holds");
			return ws;
		},
	},
	{
		rules: ["schema-context"],
		name: "a consumable carries a shape of another context only by a route that lets it",
		fires: ["schema-context"],
		build: (hostile) => {
			const { ws, context } = world();
			const up = context("Up");
			const down = context("Down");
			const shape = up.addSchema("Quote");
			operation(application(down), "Price", {
				internal: true,
				schema: shape,
			});
			if (!hostile)
				up.upstreamOf(down, {
					upstreamRoles: ["published-language"],
					downstreamRoles: ["conformist"],
				});
			return ws;
		},
	},
	{
		rules: ["separate-ways"],
		name: "contexts that declare separate ways exchange nothing; declaring it alone is fine",
		fires: ["separate-ways"],
		build: (hostile) => {
			const { ws, context } = world();
			const up = context("Up");
			const down = context("Down");
			up.separateWaysFrom(down);
			const ping = operation(application(up), "Ping", {
				pattern: "open-host-service",
			});
			const downApp = application(down);
			const act = operation(downApp, "Act", { internal: true });
			if (hostile)
				downApp.consumes(ping, {
					pattern: "anti-corruption-layer",
					by: [act],
				});
			return ws;
		},
	},
	{
		rules: ["internal-consumable"],
		name: "an internal operation is not consumed from another context; the same operation offered outward is",
		fires: ["internal-consumable"],
		build: (hostile) => {
			const { ws, context } = world();
			const up = context("Up");
			const down = context("Down");
			// An internal operation backs no upstream role, so the hostile model
			// declares none rather than trip relationship-roles-backed as well.
			up.upstreamOf(down, {
				upstreamRoles: hostile ? [] : ["open-host-service"],
				downstreamRoles: ["anti-corruption-layer"],
			});
			const ping = operation(
				application(up),
				"Ping",
				hostile ? { internal: true } : { pattern: "open-host-service" },
			);
			const downApp = application(down);
			const act = operation(downApp, "Act", { internal: true });
			downApp.consumes(ping, { pattern: "anti-corruption-layer", by: [act] });
			return ws;
		},
	},
	{
		rules: ["aggregate-not-public"],
		name: "an aggregate's operation is consumed by another context only across a shared kernel",
		fires: ["aggregate-not-public", "role-coherence"],
		build: (hostile) => {
			const { ws, context } = world();
			const up = context("Up");
			const down = context("Down");
			if (hostile)
				up.upstreamOf(down, { downstreamRoles: ["anti-corruption-layer"] });
			else up.sharesKernelWith(down);
			const { agg } = aggregate(up, "Ledger");
			const post = operation(agg, "Post");
			const downApp = application(down);
			const act = operation(downApp, "Act", { internal: true });
			downApp.consumes(post, { pattern: "anti-corruption-layer", by: [act] });
			return ws;
		},
	},
	{
		rules: ["aggregate-consumes-inside"],
		name: "an aggregate consumes nothing of another context; the application service that fronts it does",
		fires: ["aggregate-consumes-inside"],
		build: (hostile) => {
			const { ws, down, ping, downApp } = call();
			downApp.consumptions.length = 0;
			const { agg } = aggregate(down, "Ledger");
			// One operation of its own, so the aggregate is its own answer and
			// consumption-by-required has nothing to ask.
			operation(agg, "Adjust", { internal: true });
			if (hostile) agg.consumes(ping, { pattern: "anti-corruption-layer" });
			else
				downApp.consumes(ping, {
					pattern: "anti-corruption-layer",
					by: [downApp.consumables.get("act") as Consumable],
				});
			return ws;
		},
	},
	{
		rules: ["aggregate-consumes-inside"],
		name: "an aggregate calls no other aggregate's operation; a service of the context orders both",
		fires: ["aggregate-consumes-inside"],
		build: (hostile) => {
			const { ws, context } = world();
			const bc = context("Sales");
			const order = aggregate(bc, "Order");
			const stock = aggregate(bc, "Stock");
			const reserve = operation(stock.agg, "Reserve");
			operation(order.agg, "Confirm", { internal: true });
			const front = application(bc);
			const place = operation(front, "Place", { internal: true });
			if (hostile) order.agg.consumes(reserve, {});
			else front.consumes(reserve, { by: [place] });
			return ws;
		},
	},
	{
		rules: ["domain-service-consumes-inside"],
		name: "a domain service consumes nothing of another context; the application service does",
		fires: ["domain-service-consumes-inside"],
		build: (hostile) => {
			const { ws, down, ping, downApp } = call();
			downApp.consumptions.length = 0;
			if (hostile) {
				const rules = down.addService("Rules", {
					description: "",
					type: "domain",
				});
				operation(rules, "Decide", { internal: true });
				rules.consumes(ping, { pattern: "anti-corruption-layer" });
			} else
				downApp.consumes(ping, {
					pattern: "anti-corruption-layer",
					by: [downApp.consumables.get("act") as Consumable],
				});
			return ws;
		},
	},
	{
		rules: ["domain-service-internal"],
		name: "a domain service's operation is not called from another context; an application service's is",
		// Once for the upstream role it declares, once for being called from outside.
		fires: ["domain-service-internal", "domain-service-internal"],
		build: (hostile) => {
			const { ws, context } = world();
			const up = context("Up");
			const down = context("Down");
			up.upstreamOf(down, {
				upstreamRoles: ["open-host-service"],
				downstreamRoles: ["anti-corruption-layer"],
			});
			const offer = up.addService("Offer", {
				description: "",
				type: hostile ? "domain" : "application",
			});
			const ping = operation(offer, "Ping", { pattern: "open-host-service" });
			const downApp = application(down);
			const act = operation(downApp, "Act", { internal: true });
			downApp.consumes(ping, { pattern: "anti-corruption-layer", by: [act] });
			return ws;
		},
	},
	{
		rules: ["external-is-boundary"],
		name: "an external context publishes a schema of a kind it offers; it declares no aggregate",
		fires: ["external-is-boundary"],
		build: (hostile) => {
			const { ws, context } = world();
			const scheme = context("Scheme", { external: true });
			const down = context("Down");
			scheme.upstreamOf(down, {
				upstreamRoles: ["open-host-service"],
				downstreamRoles: ["anti-corruption-layer"],
			});
			const schemeApp = application(scheme);
			const authorise = operation(schemeApp, "Authorise", {
				pattern: "open-host-service",
			});
			if (hostile) aggregate(scheme, "Card");
			else scheme.addSchema("Card");
			const downApp = application(down);
			const act = operation(downApp, "Act", { internal: true });
			downApp.consumes(authorise, {
				pattern: "anti-corruption-layer",
				by: [act],
			});
			return ws;
		},
	},
	{
		rules: ["external-is-boundary"],
		name: "a context is external or a big ball of mud, not both",
		fires: ["external-is-boundary"],
		build: (hostile) => {
			const { ws, context } = world();
			context("Scheme", { external: true, bigBallOfMud: hostile });
			return ws;
		},
	},
	{
		rules: ["boundary-only-is-boundary"],
		name: "a boundary-only context publishes a schema of a kind it offers; it declares no aggregate",
		fires: ["boundary-only-is-boundary"],
		build: (hostile) => {
			const { ws, context } = world();
			const crm = context("CRM", { boundaryOnly: true });
			if (hostile) aggregate(crm, "Customer");
			else crm.addSchema("Customer");
			return ws;
		},
	},
	{
		rules: ["boundary-only-is-boundary"],
		name: "a context is boundary-only, external or a big ball of mud, never two of them",
		fires: ["boundary-only-is-boundary"],
		build: (hostile) => {
			const { ws, context } = world();
			context("CRM", { boundaryOnly: true, bigBallOfMud: hostile });
			return ws;
		},
	},
	{
		rules: ["identifies-entity"],
		name: "an identity names the context of a system nobody models inside, not one whose insides are stated",
		fires: ["identifies-entity"],
		build: (hostile) => {
			const { ws, context } = world();
			const crm = context("CRM", { boundaryOnly: !hostile });
			const order = aggregate(context("Sales"), "Order");
			order.root.addAttribute("CustomerId", {
				type: "uuid",
				identifies: crm,
			});
			return ws;
		},
	},
	{
		rules: ["identifies-entity"],
		name: "an identity names a schema of a boundary-only context, not one of an ordinary context",
		fires: ["identifies-entity"],
		build: (hostile) => {
			const { ws, context } = world();
			const crm = context("CRM", { boundaryOnly: !hostile });
			const customer = crm.addSchema("Customer");
			const order = aggregate(context("Sales"), "Order");
			order.root.addAttribute("CustomerId", {
				type: "uuid",
				identifies: customer,
			});
			return ws;
		},
	},
];

// ---------------------------------------------------------------------------
// Callers and answer routing
// ---------------------------------------------------------------------------

const callerCases: Case[] = [
	{
		rules: ["consumption-once"],
		name: "two consumptions of one operation each name the callers that make them",
		fires: ["consumption-once"],
		build: (hostile) => {
			const { ws, downApp, ping, act } = call();
			const other = operation(downApp, "Other", { internal: true });
			downApp.consumptions.length = 0;
			downApp.consumes(ping, { pattern: "anti-corruption-layer", by: [act] });
			downApp.consumes(ping, {
				pattern: "anti-corruption-layer",
				by: [hostile ? act : other],
			});
			return ws;
		},
	},
	{
		rules: ["consumption-by-resolves"],
		name: "a consumption names the consumer's own operation, not one of the provider's",
		fires: ["consumption-by-resolves"],
		build: (hostile) => {
			const { ws, ping, downApp, act } = call();
			downApp.consumptions.length = 0;
			downApp.consumes(ping, {
				pattern: "anti-corruption-layer",
				by: [hostile ? ping : act],
			});
			return ws;
		},
	},
	{
		rules: ["consumption-by-operation"],
		name: "the call is made by an operation the policy issues, not by the policy",
		fires: ["consumption-by-operation"],
		build: (hostile) => {
			const { ws, context } = world();
			const up = context("Up");
			const down = context("Down");
			up.upstreamOf(down, {
				upstreamRoles: ["open-host-service"],
				downstreamRoles: ["anti-corruption-layer"],
			});
			const ping = operation(application(up), "Ping", {
				pattern: "open-host-service",
			});
			const downApp = application(down);
			const noted = downApp.provides("Noted", {
				description: "",
				type: "event",
			});
			const act = operation(downApp, "Act", { internal: true });
			operation(downApp, "Note", { internal: true }).raises(noted);
			const policy = down.addPolicy("On note", { description: "" });
			policy.on(noted).issues(act);
			downApp.consumes(ping, {
				pattern: "anti-corruption-layer",
				by: [hostile ? policy : act],
			});
			return ws;
		},
	},
	{
		rules: ["consumption-by-reactor"],
		name: "a fact is taken in by the policy that reacts, not by an operation",
		fires: ["consumption-by-reactor"],
		build: (hostile) => {
			const { ws, happened, downApp, record, react } = subscription();
			downApp.consumes(happened, {
				pattern: "conformist",
				by: [hostile ? record : react],
			});
			return ws;
		},
	},
	{
		rules: ["consumption-by-required"],
		name: "a consumer with two operations says which makes the call; the one with a single operation need not",
		fires: ["consumption-by-required"],
		build: (hostile) => {
			const { ws, ping, downApp, act } = call();
			downApp.consumptions.length = 0;
			operation(downApp, "Spare", { internal: true });
			downApp.consumes(ping, {
				pattern: "anti-corruption-layer",
				...(hostile ? {} : { by: [act] }),
			});
			return ws;
		},
	},
	{
		rules: ["consumption-by-required"],
		name: "a consumer that provides no operation cannot make the call, and is told so",
		fires: ["consumption-by-required"],
		build: (hostile) => {
			const { ws, context } = world();
			const up = context("Up");
			const down = context("Down");
			up.upstreamOf(down, {
				upstreamRoles: ["open-host-service"],
				downstreamRoles: ["anti-corruption-layer"],
			});
			const ping = operation(application(up), "Ping", {
				pattern: "open-host-service",
			});
			const downApp = application(down);
			if (!hostile) operation(downApp, "Act", { internal: true });
			downApp.consumes(ping, { pattern: "anti-corruption-layer" });
			return ws;
		},
	},
	{
		rules: ["subscription-consumed"],
		name: "a policy reacting to another context's event has a consumption of it",
		// With no consumption the relationship's roles are backed by nothing, and
		// each of those is a consequence of the same missing line.
		fires: [
			"conformist-backed",
			"relationship-roles-backed",
			"relationship-roles-backed",
			"subscription-consumed",
		],
		build: (hostile) => {
			const { ws, happened, downApp, react } = subscription();
			if (!hostile)
				downApp.consumes(happened, { pattern: "conformist", by: [react] });
			return ws;
		},
	},
	{
		rules: ["subscription-backed"],
		name: "a consumed event has a policy under it; a consumption with nothing reacting is reported",
		fires: ["subscription-backed"],
		build: (hostile) => {
			const { ws, down, happened, downApp, react } = subscription();
			// The hostile model has no reaction at all, not a half-written one.
			if (hostile) down.policies.clear();
			downApp.consumes(happened, {
				pattern: "conformist",
				...(hostile ? {} : { by: [react] }),
			});
			return ws;
		},
	},
	{
		rules: ["consumable-kind"],
		name: "a process hears the answer of the call its starting operation made, not of a call another operation made",
		// The process waits on a rejection and on the completion of the same
		// call, and neither is a call it made.
		fires: ["consumable-kind", "consumable-kind"],
		build: (hostile) => {
			const { ws, context } = world();
			const payments = context("Payments");
			const checkout = context("Checkout");
			payments.upstreamOf(checkout, {
				upstreamRoles: ["open-host-service"],
				downstreamRoles: ["anti-corruption-layer"],
			});
			const declined = payments.addSchema("Payment Declined");
			const pay = operation(application(payments), "Pay", {
				pattern: "open-host-service",
				rejects: [declined],
			});
			const app = application(checkout);
			const submit = operation(app, "Submit", { internal: true });
			const abandon = operation(app, "Abandon", { internal: true });
			app.consumes(pay, { pattern: "anti-corruption-layer", by: [submit] });
			checkout
				.addProcess("Checkout", { description: "" })
				.starts(hostile ? abandon : submit)
				.on(pay.rejected(declined))
				.ends(pay.completed());
			return ws;
		},
	},
	{
		rules: ["consumable-kind"],
		name: "a policy reacts to an event, not to an operation",
		fires: ["consumable-kind"],
		build: (hostile) => {
			const { ws, happened, downApp, react } = subscription();
			downApp.consumes(happened, { pattern: "conformist", by: [react] });
			if (hostile) react.on(operation(downApp, "Other", { internal: true }));
			return ws;
		},
	},
	{
		rules: ["role-coherence"],
		name: "a downstream role is asked of an ordinary consumer, not of one we do not model inside",
		fires: ["role-coherence"],
		build: (hostile) => {
			const { ws, context } = world();
			const up = context("Up");
			const down = context("Down", hostile ? {} : { boundaryOnly: true });
			up.upstreamOf(down, {
				upstreamRoles: ["published-language"],
				downstreamRoles: [],
			});
			const upApp = application(up);
			const happened = upApp.provides("Happened", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
			operation(upApp, "Make", { internal: true }).raises(happened);
			const downApp = application(down);
			const record = operation(downApp, "Record", { internal: true });
			downApp.consumes(happened, {});
			if (hostile)
				down
					.addPolicy("React", { description: "" })
					.on(happened)
					.issues(record);
			return ws;
		},
	},
	{
		rules: ["role-coherence"],
		name: "an operation consumed from another context declares an upstream role",
		fires: ["role-coherence"],
		build: (hostile) => {
			const { ws } = call({ declared: !hostile });
			return ws;
		},
	},
	{
		rules: ["reaction-cycle"],
		name: "a policy whose operation raises the event it reacts to loops; one that raises another does not",
		fires: ["reaction-cycle"],
		build: (hostile) => {
			const { ws, context } = world();
			const bc = context("Loop");
			const app = application(bc);
			const first = app.provides("First", { description: "", type: "event" });
			const second = app.provides("Second", { description: "", type: "event" });
			const act = operation(app, "Act", { internal: true });
			act.raises(hostile ? first : second);
			operation(app, "Start", { internal: true }).raises(first);
			bc.addPolicy("Again", { description: "" }).on(first).issues(act);
			app
				.provides("Sink", {
					description: "",
					type: "operation",
					internal: true,
				})
				.raises(second);
			return ws;
		},
	},
	{
		rules: ["reaction-cycle"],
		name: "a process that starts on and issues one operation spawns instances; one that also waits on it does not",
		fires: ["reaction-cycle"],
		build: (hostile) => {
			const { ws, context } = world();
			const bc = context("Claims");
			const app = application(bc);
			const settle = operation(app, "Settle", { internal: true });
			const settled = app.provides("Settled", {
				description: "",
				type: "event",
			});
			operation(app, "Record", { internal: true }).raises(settled);
			const process = bc
				.addProcess("Settlement", { description: "" })
				.starts(settle)
				.issues(settle)
				.ends(settled);
			if (!hostile) process.on(settle);
			return ws;
		},
	},
];
runCases(
	"rule cases: boundary, caller and answer routing",
	["boundary-and-borrowing", "callers-and-answer-routing"],
	[...boundaryCases, ...callerCases],
);
