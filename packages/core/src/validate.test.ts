import { describe, expect, it } from "vitest";
import { makeRichTestWs } from "./makeTestWs";
import { hearsAnswerOf, ReactionChain, routesTo } from "./reaction-walk";
import {
	type BoundedContext,
	type DirectedRelationshipOptions,
	Workspace,
} from "./workspace";

const rulesOf = (ws: Workspace) =>
	ws.validate().map((d) => `${d.severity}:${d.rule}`);

function emptyWorkspace() {
	return new Workspace("V", {
		description: "",
		version: "0",
	});
}

describe("Workspace.validate", () => {
	it("only warns about the deliberately unserved reporting context in the rich fixture", () => {
		const { ws, reportingBc } = makeRichTestWs();
		expect(ws.validate()).toEqual([
			expect.objectContaining({
				rule: "context-serves-subdomain",
				severity: "warning",
				ref: reportingBc.ref,
			}),
		]);
	});

	it("requires exactly one root entity per aggregate", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const none = bc.addAggregate("None", { description: "" });
		none.addEntity("E", { description: "" });
		const two = bc.addAggregate("Two", { description: "" });
		two.addRootEntity("A", { description: "" });
		two.addRootEntity("B", { description: "" });
		const diagnostics = ws
			.validate()
			.filter((d) => d.rule === "aggregate-root");
		expect(diagnostics.map((d) => [d.severity, d.ref])).toEqual([
			["warning", none.ref],
			["error", two.ref],
		]);
	});

	it("lets two aggregates of one context use the same value object", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		// Money belongs to the context, so holding one crosses no boundary and
		// neither aggregate has to declare its own (decision 16).
		const money = bc.addValueObject("Money", { description: "" });
		money.addAttribute("Amount", { type: "int64" });
		for (const name of ["Order", "Invoice"]) {
			const agg = bc.addAggregate(name, { description: "" });
			const root = agg.addRootEntity(name, { description: "" });
			root.addAttribute("Id", { type: "uuid", identity: true });
			root.addAttribute("Total", { type: "Money", valueobject: money });
			root.uses(money, "totalled in", "1");
		}
		// context-serves-subdomain is the fixture's own gap, not this one's.
		expect(
			ws.validate().filter((d) => d.rule !== "context-serves-subdomain"),
		).toEqual([]);
	});

	it("only allows references to another aggregate's root", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const a = bc.addAggregate("A", { description: "" });
		const aRoot = a.addRootEntity("A", { description: "" });
		const b = bc.addAggregate("B", { description: "" });
		const bRoot = b.addRootEntity("B", { description: "" });
		const bLine = b.addEntity("Line", { description: "" });
		aRoot.references(bRoot, "ok");
		aRoot.references(bLine, "not root");
		aRoot.includes(bRoot, "not allowed");
		const messages = ws
			.validate()
			.filter((d) => d.rule === "cross-aggregate-reference")
			.map((d) => d.message);
		expect(messages).toHaveLength(2);
		expect(messages[0]).toContain("neither the root");
		expect(messages[1]).toContain('only "references" is allowed');
	});

	it("lets a relation cross an aggregate but not a bounded context", () => {
		const ws = emptyWorkspace();
		const sales = ws.addBoundedContext("Sales", { description: "" });
		const catalog = ws.addBoundedContext("Catalog", { description: "" });
		const orderAgg = sales.addAggregate("Order", { description: "" });
		const order = orderAgg.addRootEntity("Order", { description: "" });
		// Same context, other aggregate: allowed, and it must stay allowed.
		const basketAgg = sales.addAggregate("Basket", { description: "" });
		order.references(
			basketAgg.addRootEntity("Basket", { description: "" }),
			"from-basket",
		);
		// Another context: an error, whatever the relation says.
		const petAgg = catalog.addAggregate("Pet", { description: "" });
		const pet = petAgg.addRootEntity("Pet", { description: "" });
		order.references(pet, "for-pet");
		const diagnostics = ws
			.validate()
			.filter((d) => d.rule === "cross-context-relation");
		expect(diagnostics).toEqual([
			{
				severity: "error",
				rule: "cross-context-relation",
				message:
					'"Order" in "Sales" references "Pet" in "Catalog"; a relation never crosses a bounded context, so hold "Pet"\'s identity in an attribute of "Order" with `identifies`; where what you need is a value rather than an entity, borrow it through a shared kernel or as a conformist',
				ref: order.ref,
			},
		]);
	});

	it("flags a cross-context relation from a value object too", () => {
		const ws = emptyWorkspace();
		const one = ws.addBoundedContext("One", { description: "" });
		const two = ws.addBoundedContext("Two", { description: "" });
		one
			.addAggregate("Here", { description: "" })
			.addRootEntity("Here", { description: "" });
		const vo = one.addValueObject("Vo", { description: "" });
		vo.uses(two.addValueObject("Their Vo", { description: "" }), "borrows");
		const messages = ws
			.validate()
			.filter((d) => d.rule === "cross-context-relation")
			.map((d) => d.message);
		// Nothing says the two contexts share anything, so the borrowing the
		// relation assumes has not been declared and the fix names the routes.
		expect(messages).toEqual([
			'"Vo" in "One" uses "Their Vo" in "Two"; a relation reaches another context\'s value object only where the borrowing does, so declare a shared kernel with "Two" or a conformist relationship toward it and type an attribute by "Their Vo"',
		]);
	});

	it("lets an identity attribute name a root in another context", () => {
		const ws = emptyWorkspace();
		const sales = ws.addBoundedContext("Sales", { description: "" });
		const catalog = ws.addBoundedContext("Catalog", { description: "" });
		const order = sales
			.addAggregate("Order", { description: "" })
			.addRootEntity("Order", { description: "" });
		order.addAttribute("id", { type: "int64", identity: true });
		const petAgg = catalog.addAggregate("Pet", { description: "" });
		const pet = petAgg.addRootEntity("Pet", { description: "" });
		pet.addAttribute("id", { type: "int64", identity: true });
		order.addAttribute("petId", { type: "int64", identifies: pet });
		const diagnostics = ws
			.validate()
			.filter((d) =>
				[
					"identifies-entity",
					"cross-context-relation",
					"schema-context",
				].includes(d.rule),
			);
		expect(diagnostics).toEqual([]);
	});

	it("lets an identity attribute name a child entity of another aggregate", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Sales", { description: "" });
		const orderAgg = bc.addAggregate("Order", { description: "" });
		const order = orderAgg.addRootEntity("Order", { description: "" });
		order.addAttribute("id", { type: "int64", identity: true });
		const line = orderAgg.addEntity("Order Line", { description: "" });
		line.addAttribute("id", { type: "int64", identity: true });
		order.includes(line, "has-line", "*");
		const shipping = ws.addBoundedContext("Shipping", { description: "" });
		const parcel = shipping
			.addAggregate("Parcel", { description: "" })
			.addRootEntity("Parcel", { description: "" });
		parcel.addAttribute("id", { type: "int64", identity: true });
		parcel.addAttribute("lineId", { type: "int64", identifies: line });
		const diagnostics = ws
			.validate()
			.filter((d) => d.rule === "identifies-entity");
		expect(diagnostics).toEqual([]);
	});

	it("lets a schema's attribute name a child entity too", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Sales", { description: "" });
		const orderAgg = bc.addAggregate("Order", { description: "" });
		const order = orderAgg.addRootEntity("Order", { description: "" });
		order.addAttribute("id", { type: "int64", identity: true });
		const line = orderAgg.addEntity("Order Line", { description: "" });
		line.addAttribute("id", { type: "int64", identity: true });
		order.includes(line, "has-line", "*");
		const payload = bc.addSchema("Order Summary");
		payload.addAttribute("lineId", { type: "int64", identifies: line });
		const messages = ws
			.validate()
			.filter((d) => d.rule === "identifies-entity")
			.map((d) => d.message);
		expect(messages).toEqual([]);
	});

	it("lets an entity hold another aggregate's child id inside one context", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Sales", { description: "" });
		const orderAgg = bc.addAggregate("Order", { description: "" });
		const order = orderAgg.addRootEntity("Order", { description: "" });
		order.addAttribute("id", { type: "int64", identity: true });
		const line = orderAgg.addEntity("Order Line", { description: "" });
		line.addAttribute("id", { type: "int64", identity: true });
		order.includes(line, "has-line", "*");
		const shipment = bc
			.addAggregate("Shipment", { description: "" })
			.addRootEntity("Shipment", { description: "" });
		shipment.addAttribute("id", { type: "int64", identity: true });
		// The root's id and the child's beside it: how DDD points at a child
		// without the relation cross-aggregate-reference refuses.
		shipment.addAttribute("orderId", { type: "int64", identifies: order });
		shipment.addAttribute("lineId", { type: "int64", identifies: line });
		expect(ws.validate().filter((d) => d.rule === "identifies-entity")).toEqual(
			[],
		);
	});

	it("lets an entity hold the id of a child of its own aggregate, and of another context's", () => {
		const ws = emptyWorkspace();
		const sales = ws.addBoundedContext("Sales", { description: "" });
		const catalog = ws.addBoundedContext("Catalog", { description: "" });
		catalog.upstreamOf(sales, {});
		const orderAgg = sales.addAggregate("Order", { description: "" });
		const order = orderAgg.addRootEntity("Order", { description: "" });
		order.addAttribute("id", { type: "int64", identity: true });
		const line = orderAgg.addEntity("Order Line", { description: "" });
		line.addAttribute("id", { type: "int64", identity: true });
		order.includes(line, "has-line", "*");
		// A sibling inside the same boundary, which no relation has to carry.
		line.addAttribute("nextLineId", { type: "int64", identifies: line });
		const petAgg = catalog.addAggregate("Pet", { description: "" });
		const pet = petAgg.addRootEntity("Pet", { description: "" });
		pet.addAttribute("id", { type: "int64", identity: true });
		const tag = petAgg.addEntity("Tag", { description: "" });
		tag.addAttribute("id", { type: "int64", identity: true });
		pet.includes(tag, "has-tag", "*");
		// Across a boundary a child id is all there is, which decision 14 allows.
		order.addAttribute("tagId", { type: "int64", identifies: tag });
		expect(ws.validate().filter((d) => d.rule === "identifies-entity")).toEqual(
			[],
		);
	});

	it("flags an identity naming an entity this workspace does not have", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Sales", { description: "" });
		const order = bc
			.addAggregate("Order", { description: "" })
			.addRootEntity("Order", { description: "" });
		order.addAttribute("id", { type: "int64", identity: true });
		const elsewhere = emptyWorkspace();
		const stranger = elsewhere
			.addBoundedContext("Catalog", { description: "" })
			.addAggregate("Pet", { description: "" })
			.addRootEntity("Pet", { description: "" });
		const petId = order.addAttribute("petId", {
			type: "int64",
			identifies: stranger,
		});
		const diagnostics = ws
			.validate()
			.filter((d) => d.rule === "identifies-entity");
		expect(diagnostics).toEqual([
			{
				severity: "error",
				rule: "identifies-entity",
				message:
					'"Order" holds attribute "petId" as the identity of "Pet", which is not an entity of this workspace; an identity names an entity here, root or child, and a child is reached through its root, or an external context when the id belongs to a system whose entities are not ours to state',
				ref: petId.ref,
			},
		]);
	});

	it("lets an identity name an external context, whose entities are not ours", () => {
		const ws = emptyWorkspace();
		const payments = ws.addBoundedContext("Payments", { description: "" });
		const provider = ws.addBoundedContext("Payment Provider", {
			description: "",
			external: true,
		});
		const authorisation = payments
			.addAggregate("Payment", { description: "" })
			.addRootEntity("Payment", { description: "" });
		authorisation.addAttribute("id", { type: "string", identity: true });
		authorisation.addAttribute("providerRef", {
			type: "string",
			identifies: provider,
		});
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "identifies-entity")
				.map((d) => d.message),
		).toEqual([]);
	});

	// A legacy account key is the same fact as a scheme's reference: nobody can
	// read the system well enough to say which entity the id is of, and
	// demanding one invites an invented aggregate (card 98).
	it("lets an identity name a big ball of mud, whose insides nobody can trace", () => {
		const ws = emptyWorkspace();
		const accounts = ws.addBoundedContext("Accounts", { description: "" });
		const legacy = ws.addBoundedContext("Core Banking", {
			description: "",
			bigBallOfMud: true,
		});
		const account = accounts
			.addAggregate("Account", { description: "" })
			.addRootEntity("Account", { description: "" });
		account.addAttribute("id", { type: "string", identity: true });
		account.addAttribute("legacyNo", { type: "string", identifies: legacy });
		expect(ws.validate().filter((d) => d.rule === "identifies-entity")).toEqual(
			[],
		);
	});

	// A processor documents Customer, Payment, Refund and Dispute as distinct
	// kinds with distinct ids, and those kinds are its published schemas, so
	// the identity may say which of them it holds rather than only which
	// system (decision 28, third amendment; card 113).
	it("lets an identity name a schema an external context publishes", () => {
		const ws = emptyWorkspace();
		const payments = ws.addBoundedContext("Payments", { description: "" });
		const provider = ws.addBoundedContext("Payment Provider", {
			description: "",
			external: true,
		});
		const payment = provider.addSchema("Payment");
		const settlement = payments
			.addAggregate("Settlement", { description: "" })
			.addRootEntity("Settlement", { description: "" });
		settlement.addAttribute("id", { type: "string", identity: true });
		settlement.addAttribute("providerPaymentId", {
			type: "string",
			identifies: payment,
		});
		expect(ws.validate().filter((d) => d.rule === "identifies-entity")).toEqual(
			[],
		);
	});

	it("refuses an identity naming a schema of a context whose insides the model states", () => {
		const ws = emptyWorkspace();
		const sales = ws.addBoundedContext("Sales", { description: "" });
		const catalog = ws.addBoundedContext("Catalog", { description: "" });
		catalog
			.addAggregate("Pet", { description: "" })
			.addRootEntity("Pet", { description: "" })
			.addAttribute("id", { type: "string", identity: true });
		const petSummary = catalog.addSchema("Pet Summary");
		const order = sales
			.addAggregate("Order", { description: "" })
			.addRootEntity("Order", { description: "" });
		order.addAttribute("id", { type: "string", identity: true });
		const petId = order.addAttribute("petId", {
			type: "string",
			identifies: petSummary,
		});
		expect(ws.validate().filter((d) => d.rule === "identifies-entity")).toEqual(
			[
				{
					severity: "error",
					rule: "identifies-entity",
					message:
						'"Order" holds attribute "petId" as the identity of schema "Pet Summary" of bounded context "Catalog", which is not external; a published schema is a kind a system outside the model documents, so name the entity the id is of, or that system\'s context where its entities are not ours to state',
					ref: petId.ref,
				},
			],
		);
	});

	it("refuses an identity naming a context whose insides the model states", () => {
		const ws = emptyWorkspace();
		const sales = ws.addBoundedContext("Sales", { description: "" });
		const catalog = ws.addBoundedContext("Catalog", { description: "" });
		catalog
			.addAggregate("Pet", { description: "" })
			.addRootEntity("Pet", { description: "" })
			.addAttribute("id", { type: "string", identity: true });
		const order = sales
			.addAggregate("Order", { description: "" })
			.addRootEntity("Order", { description: "" });
		order.addAttribute("id", { type: "string", identity: true });
		const petId = order.addAttribute("petId", {
			type: "string",
			identifies: catalog,
		});
		expect(ws.validate().filter((d) => d.rule === "identifies-entity")).toEqual(
			[
				{
					severity: "error",
					rule: "identifies-entity",
					message:
						'"Order" holds attribute "petId" as the identity of bounded context "Catalog", which is neither external nor a big ball of mud; a context whose insides the model states has the entity the id is of, so name that entity instead',
					ref: petId.ref,
				},
			],
		);
	});

	it("warns when cross-context consumptions lack roles", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const svc = up.addService("S", { description: "", type: "application" });
		const op = svc.provides("Op", { description: "", type: "operation" });
		const consumption = down
			.addService("T", { description: "", type: "application" })
			.consumes(op, {});
		const rules = ws.validate().filter((d) => d.rule === "role-coherence");
		expect(rules).toHaveLength(2);
		// The missing upstream role is the consumable's; the missing downstream
		// role is the consumption's, and each reports where the edit belongs.
		expect(rules.map((d) => d.ref)).toEqual([op.ref, consumption.ref]);
	});

	it("flags consumptions between contexts that declared separate ways", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		up.separateWaysFrom(down);
		const op = up
			.addService("S", { description: "", type: "application" })
			.provides("Op", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			});
		down
			.addService("T", { description: "", type: "application" })
			.consumes(op, { pattern: "conformist" });
		expect(rulesOf(ws)).toContain("error:separate-ways");
	});

	it("flags internal consumables consumed or joined from another context", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const evt = up
			.addService("S", { description: "", type: "application" })
			.provides("Happened", { description: "", type: "event", internal: true });
		down
			.addService("T", { description: "", type: "application" })
			.consumes(evt, { pattern: "conformist" });
		down.addPolicy("React", { description: "" }).on(evt);
		const rules = ws.validate().filter((d) => d.rule === "internal-consumable");
		expect(rules).toHaveLength(2);
		// Internal consumables are exempt from the upstream-role warning.
		expect(rulesOf(ws)).not.toContain("warning:role-coherence");
	});

	it("accepts a consumption made by the consumer's own operation or its context's policy", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const evt = up
			.addService("S", { description: "", type: "application" })
			.provides("Happened", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
		const consumer = down.addService("T", {
			description: "",
			type: "application",
		});
		const renew = consumer.provides("Renew", {
			description: "",
			type: "operation",
			internal: true,
		});
		const react = down.addPolicy("React", { description: "" });
		consumer.consumes(evt, { pattern: "conformist", by: [renew, react] });
		expect(rulesOf(ws)).not.toContain("error:consumption-by-resolves");
	});

	it("flags a consumption made by another node's operation or another context's policy", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const provider = up.addService("S", {
			description: "",
			type: "application",
		});
		const op = provider.provides("Op", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		const poll = provider.provides("Poll", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		const elsewhere = up.addPolicy("Elsewhere", { description: "" });
		const consumption = down
			.addService("T", { description: "", type: "application" })
			.consumes(op, { pattern: "conformist", by: [poll, elsewhere] });
		const diagnostics = ws
			.validate()
			.filter((d) => d.rule === "consumption-by-resolves");
		expect(diagnostics).toHaveLength(2);
		expect(diagnostics[0].message).toContain('provided by "S"');
		expect(diagnostics[1].message).toContain('belongs to "Up"');
		expect(diagnostics.map((d) => d.ref)).toEqual([
			consumption.ref,
			consumption.ref,
		]);
	});

	it("flags a consumption said to be made by one of the consumer's events", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const op = up
			.addService("S", { description: "", type: "application" })
			.provides("Op", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			});
		const consumer = down.addService("T", {
			description: "",
			type: "application",
		});
		const raised = consumer.provides("Raised", {
			description: "",
			type: "event",
			internal: true,
		});
		const consumption = consumer.consumes(op, {
			pattern: "conformist",
			by: [raised],
		});
		const diagnostics = ws
			.validate()
			.filter((d) => d.rule === "consumption-by-resolves");
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].message).toContain('the event "Raised"');
		expect(diagnostics[0].ref).toBe(consumption.ref);
	});

	it("keeps payload schemas inside the publishing context", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const shape = a.addSchema("Shape");
		b.addService("S", { description: "", type: "application" }).provides("Op", {
			description: "",
			type: "operation",
			internal: true,
			pattern: "open-host-service",
			schema: shape,
		});
		expect(rulesOf(ws)).toContain("error:schema-context");
		expect(rulesOf(ws)).toContain("warning:internal-consumable");
	});

	it("keeps returned schemas inside the publishing context too", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const foreign = a.addSchema("Foreign");
		const own = b.addSchema("Own");
		const svc = b.addService("S", { description: "", type: "application" });
		svc.provides("Borrows", {
			description: "",
			type: "operation",
			schema: own,
			returns: foreign,
		});
		// The sent payload is fine on its own, so only returns may trip the rule.
		svc.provides("Fine", {
			description: "",
			type: "operation",
			schema: own,
			returns: own,
		});
		const rules = ws.validate().filter((d) => d.rule === "schema-context");
		expect(rules.map((d) => d.message)).toEqual([
			expect.stringContaining('"Borrows" returns schema "Foreign" from "A"'),
		]);
	});

	it("lets a shared kernel carry a payload across, and nothing else", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const c = ws.addBoundedContext("C", { description: "" });
		a.sharesKernelWith(b);
		const shape = a.addSchema("Shape");
		b.addService("S", { description: "", type: "application" }).provides("Op", {
			description: "",
			type: "operation",
			schema: shape,
			returns: shape,
		});
		// C shares no kernel with A, so the same borrowing is still an error.
		c.addService("T", { description: "", type: "application" }).provides("Op", {
			description: "",
			type: "operation",
			schema: shape,
		});
		const rules = ws.validate().filter((d) => d.rule === "schema-context");
		expect(rules.map((d) => d.message)).toEqual([
			expect.stringContaining('"Op" carries schema "Shape" from "A"'),
		]);
	});

	it("keeps a nested schema in its own context, unless a kernel is shared", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const c = ws.addBoundedContext("C", { description: "" });
		a.sharesKernelWith(b);
		const line = a.addSchema("Order Line");
		// B shares a kernel with A, so it may nest A's shape; C may not.
		b.addSchema("Order Request").addAttribute("Lines", {
			type: "OrderLine[]",
			schema: line,
		});
		const borrower = c.addSchema("Copy Request");
		const borrowed = borrower.addAttribute("Lines", {
			type: "OrderLine[]",
			schema: line,
		});
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "schema-context")
				.map((d) => [d.message, d.ref]),
		).toEqual([
			[
				'"Copy Request" types attribute "Lines" by schema "Order Line" from "A"; a payload belongs to the context that publishes it, and holding it wants a shared kernel with "A", a conformist relationship toward it, or a customer-supplier relationship under which "C" is the customer',
				borrowed.ref,
			],
		]);
	});

	it("lets a conformist carry its upstream's schema, downstream only", () => {
		const ws = emptyWorkspace();
		const scheme = ws.addBoundedContext("Scheme", {
			description: "",
			external: true,
		});
		const cards = ws.addBoundedContext("Cards", { description: "" });
		scheme.upstreamOf(cards, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		const layout = scheme.addSchema("Auth Record");
		// Cards conforms, so it may carry the scheme's record layout as it is.
		cards
			.addService("Cards App", { description: "", type: "application" })
			.provides("Answer", {
				description: "",
				type: "operation",
				schema: layout,
			});
		// Nothing runs the other way: the upstream is never shaped by its
		// conformists, so the scheme carrying Cards' shape is still an error.
		const ours = cards.addSchema("Ours");
		scheme
			.addService("Scheme API", { description: "", type: "application" })
			.provides("Ask", {
				description: "",
				type: "operation",
				schema: ours,
			});
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "schema-context")
				.map((d) => d.message),
		).toEqual([
			'"Ask" carries schema "Ours" from "Cards"; a payload belongs to the context that publishes it, and holding it wants a shared kernel with "Cards", a conformist relationship toward it, or a customer-supplier relationship under which "Scheme" is the customer',
		]);
	});

	/**
	 * The architect's round-14 probe: a customer that answers with its
	 * supplier's summary shape. The pair negotiated the interface, so the
	 * supplier's published shapes are the language the customer had a say in
	 * settling, and it writes no downstream role (decisions 03 and 16,
	 * amendments of 2026-09-10; card 130).
	 */
	it("lets the customer of a customer-supplier pair carry the supplier's schema", () => {
		const ws = emptyWorkspace();
		const catalog = ws.addBoundedContext("Catalog", { description: "" });
		const sales = ws.addBoundedContext("Sales", { description: "" });
		catalog.upstreamOf(sales, {
			type: "customer-supplier",
			upstreamRoles: ["open-host-service", "published-language"],
		});
		const summary = catalog.addSchema("Pet Summary");
		summary.addAttribute("Pet Id", { type: "PetId", identity: true });
		const getPet = catalog
			.addService("Pet App", { description: "", type: "application" })
			.provides("Get Pet", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
				returns: summary,
			});
		const orderApp = sales.addService("Order App", {
			description: "",
			type: "application",
		});
		const show = orderApp.provides("Show Order Pet", {
			description: "",
			type: "operation",
			returns: summary,
		});
		orderApp.consumes(getPet, { by: [show] });
		expect(ws.validate().filter((d) => d.rule === "schema-context")).toEqual(
			[],
		);
		// And no role is asked for either: a customer writes no downstream role,
		// which is what role-coherence stopped asking for (card 128).
		expect(ws.validate().filter((d) => d.rule === "role-coherence")).toEqual(
			[],
		);
	});

	// Upstream is who dictates the model. A processor that calls us in its own
	// format is upstream of the context it calls, which carries that shape on
	// the operation the caller reaches and translates behind it (card 98).
	it("lets an anti-corruption layer carry the caller's shape on a consumable", () => {
		const ws = emptyWorkspace();
		const processor = ws.addBoundedContext("Card Processor", {
			description: "",
			external: true,
		});
		const cards = ws.addBoundedContext("Cards", { description: "" });
		processor.upstreamOf(cards, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		const message = processor.addSchema("Authorisation Message");
		const cardsApp = cards.addService("Cards App", {
			description: "",
			type: "application",
		});
		const authorise = cardsApp.provides("Authorise Card", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
			schema: message,
		});
		// The caller has to be there: the layer excuses the shape on the one
		// operation the caller reaches, not on everything Cards offers.
		processor
			.addService("Feed", { description: "", type: "application" })
			.consumes(authorise, { pattern: "conformist" });
		expect(ws.validate().filter((d) => d.rule === "schema-context")).toEqual(
			[],
		);
	});

	it("refuses the same shape on a fact the downstream publishes to everyone", () => {
		const ws = emptyWorkspace();
		const catalogue = ws.addBoundedContext("Catalogue", { description: "" });
		const playback = ws.addBoundedContext("Playback", { description: "" });
		catalogue.upstreamOf(playback, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		const titleRef = catalogue.addSchema("Title Ref");
		playback
			.addService("Playback API", { description: "", type: "application" })
			.provides("Playback Started", {
				description: "",
				type: "event",
				pattern: "published-language",
				schema: titleRef,
			});
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "schema-context")
				.map((d) => d.message),
		).toEqual([
			'"Playback Started" carries schema "Title Ref" from "Catalogue"; a payload belongs to the context that publishes it, and holding it wants a shared kernel with "Catalogue", a conformist relationship toward it, or a customer-supplier relationship under which "Playback" is the customer',
		]);
	});

	// The layer is at the boundary, and an attribute is past it: what is held
	// inside the model is the model's own, translated (decision 18).
	it("still refuses the caller's shape nested inside the model behind the layer", () => {
		const ws = emptyWorkspace();
		const processor = ws.addBoundedContext("Card Processor", {
			description: "",
			external: true,
		});
		const cards = ws.addBoundedContext("Cards", { description: "" });
		processor.upstreamOf(cards, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		const message = processor.addSchema("Authorisation Message");
		const held = cards.addSchema("Authorisation");
		held.addAttribute("original", { type: "Message", schema: message });
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "schema-context")
				.map((d) => d.message),
		).toEqual([
			'"Authorisation" types attribute "original" by schema "Authorisation Message" from "Card Processor"; a payload belongs to the context that publishes it, and holding it wants a shared kernel with "Card Processor", a conformist relationship toward it, or a customer-supplier relationship under which "Cards" is the customer',
		]);
	});

	it("lets a conformist's value object be a kind of its upstream's", () => {
		const ws = emptyWorkspace();
		const regulator = ws.addBoundedContext("Regulator", {
			description: "",
			external: true,
		});
		const reporting = ws.addBoundedContext("Reporting", { description: "" });
		regulator.upstreamOf(reporting, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		const filing = regulator.addValueObject("Filing", { description: "" });
		reporting.addValueObject("Quarterly Filing", {
			description: "",
			specialises: filing,
		});
		expect(
			ws.validate().filter((d) => d.rule === "specialisation-in-boundary"),
		).toEqual([]);
	});

	it("asks a declared conformist to borrow or call something", () => {
		const ws = emptyWorkspace();
		const scheme = ws.addBoundedContext("Scheme", {
			description: "",
			external: true,
		});
		const cards = ws.addBoundedContext("Cards", { description: "" });
		const relationship = scheme.upstreamOf(cards, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "conformist-backed")
				.map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"warning",
				'"Cards" declares itself a conformist of "Scheme", but it names none of "Scheme"\'s schemas or value objects and consumes nothing "Scheme" provides, so there is nothing here to conform to',
				relationship.ref,
			],
		]);
	});

	it("takes a subscription to what the upstream publishes as backing the role", () => {
		// The ordinary event-driven conformist: it subscribes to the upstream's
		// fact and reads the shape as published. Whether it translates on the way
		// in is not in the model, so the rule asks no more than this.
		const ws = emptyWorkspace();
		const sales = ws.addBoundedContext("Sales", { description: "" });
		const inventory = ws.addBoundedContext("Inventory", { description: "" });
		sales.upstreamOf(inventory, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		const placed = sales
			.addAggregate("Order", { description: "" })
			.provides("Order Placed", {
				description: "",
				type: "event",
				pattern: "published-language",
				schema: sales.addSchema("Order Summary"),
			});
		inventory
			.addService("Projection", { description: "", type: "application" })
			.consumes(placed, { pattern: "conformist" });
		expect(ws.validate().filter((d) => d.rule === "conformist-backed")).toEqual(
			[],
		);
	});

	it("takes a call on the upstream's operation as backing the conformist role", () => {
		const ws = emptyWorkspace();
		const scheme = ws.addBoundedContext("Scheme", {
			description: "",
			external: true,
		});
		const cards = ws.addBoundedContext("Cards", { description: "" });
		scheme.upstreamOf(cards, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["conformist"],
		});
		const authorise = scheme
			.addService("Scheme API", { description: "", type: "application" })
			.provides("Authorise", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			});
		cards
			.addService("Cards App", { description: "", type: "application" })
			.consumes(authorise, { pattern: "conformist" });
		expect(ws.validate().filter((d) => d.rule === "conformist-backed")).toEqual(
			[],
		);
	});

	it("takes a bare notification as backing the role, payload or not", () => {
		// The gap card 95 closed: the rule counted a consumed event only when it
		// carried the upstream's schema, so a conformist of a context that
		// publishes a name and nothing else was told there was nothing to
		// conform to.
		const ws = emptyWorkspace();
		const core = ws.addBoundedContext("Core Banking", { description: "" });
		const reporting = ws.addBoundedContext("Reporting", { description: "" });
		core.upstreamOf(reporting, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		const done = core
			.addService("Batch", { description: "", type: "application" })
			.provides("Nightly Batch Completed", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
		reporting
			.addService("Returns", { description: "", type: "application" })
			.consumes(done, { pattern: "conformist" });
		expect(ws.validate().filter((d) => d.rule === "conformist-backed")).toEqual(
			[],
		);
	});

	it("rejects returns on an event, and allows it on an operation", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const answer = bc.addSchema("Answer");
		const svc = bc.addService("S", { description: "", type: "application" });
		svc.provides("Asked", {
			description: "",
			type: "event",
			returns: answer,
		});
		svc.provides("Ask", {
			description: "",
			type: "operation",
			returns: answer,
		});
		const rules = ws
			.validate()
			.filter((d) => d.rule === "returns-on-operation");
		expect(rules).toHaveLength(1);
		expect(rules[0].severity).toBe("error");
		expect(rules[0].message).toContain(
			'"Asked" is an event but declares returns "Answer"',
		);
	});

	it("keeps the shapes an operation refuses with inside the publishing context", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const foreign = a.addSchema("Foreign");
		const own = b.addSchema("Own");
		const svc = b.addService("S", { description: "", type: "application" });
		// One rejection is borrowed and one is not, so only the borrowed one trips.
		svc.provides("Borrows", {
			description: "",
			type: "operation",
			rejects: [own, foreign],
		});
		const rules = ws.validate().filter((d) => d.rule === "schema-context");
		expect(rules.map((d) => d.message)).toEqual([
			expect.stringContaining(
				'"Borrows" rejects with schema "Foreign" from "A"',
			),
		]);
	});

	it("rejects a rejection on an event, and allows one on an operation", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const refusal = bc.addSchema("Refusal");
		const overLimit = bc.addSchema("Over Limit");
		const svc = bc.addService("S", { description: "", type: "application" });
		svc.provides("Happened", {
			description: "",
			type: "event",
			rejects: [refusal, overLimit],
		});
		svc.provides("Ask", {
			description: "",
			type: "operation",
			rejects: [refusal],
		});
		const rules = ws
			.validate()
			.filter((d) => d.rule === "rejects-on-operation");
		expect(rules).toHaveLength(1);
		expect(rules[0].severity).toBe("error");
		// Every rejection the event names is listed, so the fix is one edit.
		expect(rules[0].message).toContain(
			'"Happened" is an event but rejects with "Refusal", "Over Limit"',
		);
	});

	it("checks consumable kinds on policies and raises", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const svc = bc.addService("S", { description: "", type: "application" });
		const evt = svc.provides("Evt", { description: "", type: "event" });
		const op = svc.provides("Op", { description: "", type: "operation" });
		bc.addPolicy("Backwards", { description: "" }).on(op).issues(evt);
		evt.raises(op);
		const rules = ws.validate().filter((d) => d.rule === "consumable-kind");
		expect(rules.map((d) => d.message)).toEqual([
			expect.stringContaining("is an operation, not an event"),
			expect.stringContaining("is an event, not an operation"),
			expect.stringContaining("declares raises"),
			expect.stringContaining('raises "Op", which is an operation'),
		]);
	});

	it("warns about incomplete policies", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		bc.addPolicy("Idle", { description: "" });
		expect(rulesOf(ws)).toContain("warning:policy-complete");
	});
});

/**
 * A process that waits on the completion of an operation that returns a
 * shape gets the same `consumable-kind` diagnostic whether it was built with
 * the DSL or loaded back from the JSON the DSL wrote (card 108).
 *
 * The loader used to resolve `.../completed` to `undefined` for a returning
 * operation, so the JSON path reported `unresolved-ref` and said the
 * operation did not exist, when it does; the DSL path always built the
 * `Answer` object and let `consumable-kind` say what was wrong with it.
 */
describe("consumable-kind on the completion of a returning operation", () => {
	function withProcessWaitingOnCompletion() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const schema = bc.addSchema("Receipt");
		const svc = bc.addService("S", { description: "", type: "application" });
		const op = svc.provides("Charge", {
			description: "",
			type: "operation",
			returns: schema,
		});
		const started = svc.provides("Start", { description: "", type: "event" });
		bc.addProcess("Billing", { description: "" })
			.starts(started)
			.issues(op)
			.on(op.completed())
			.ends(op.completed());
		return ws;
	}

	it("reports consumable-kind from the DSL", () => {
		const ws = withProcessWaitingOnCompletion();
		const rules = ws.validate().filter((d) => d.rule === "consumable-kind");
		expect(rules).not.toEqual([]);
		expect(rules.map((d) => d.message)).toEqual([
			expect.stringContaining('returns "Receipt"'),
		]);
		expect(ws.validate().filter((d) => d.rule === "unresolved-ref")).toEqual(
			[],
		);
	});

	it("reports the same diagnostic after a JSON round trip", () => {
		const ws = withProcessWaitingOnCompletion();
		const dsl = ws
			.validate()
			.filter((d) => d.rule === "consumable-kind")
			.map((d) => d.message);
		const schema = ws.toSchema();
		const rebuilt = Workspace.fromSchema(JSON.parse(JSON.stringify(schema)));
		const viaJson = rebuilt
			.validate()
			.filter((d) => d.rule === "consumable-kind")
			.map((d) => d.message);
		expect(viaJson).toEqual(dsl);
		expect(
			rebuilt.validate().filter((d) => d.rule === "unresolved-ref"),
		).toEqual([]);
	});
});

describe("root-identity", () => {
	it("wants an identity attribute on the root, and only on the root", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const named = bc.addAggregate("Named", { description: "" });
		named
			.addRootEntity("Named", { description: "" })
			.addAttribute("Id", { type: "uuid", identity: true });
		// A non-root entity without an identity is nobody's business here.
		named.addEntity("Line", { description: "" });
		const nameless = bc.addAggregate("Nameless", { description: "" });
		const root = nameless.addRootEntity("Nameless", { description: "" });
		root.addAttribute("Label", { type: "string" });
		const rules = ws.validate().filter((d) => d.rule === "root-identity");
		expect(rules).toEqual([
			{
				severity: "error",
				rule: "root-identity",
				message:
					'Root entity "Nameless" of aggregate "Nameless" declares no identity attribute, so nothing says which "Nameless" a reference means',
				ref: root.ref,
			},
		]);
	});
});

describe("value-object-shape", () => {
	/** A context with a root, a well-formed value and a misshapen one. */
	function shapes() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("A", { description: "" });
		const root = agg.addRootEntity("A", { description: "" });
		root.addAttribute("Id", { type: "uuid", identity: true });
		const money = bc.addValueObject("Money", { description: "" });
		money.addAttribute("Amount", { type: "int64" });
		const bad = bc.addValueObject("Bad", { description: "" });
		return { ws, bc, agg, root, money, bad };
	}

	const shape = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "value-object-shape")
			.map((d) => [d.severity, d.message, d.ref]);

	it("refuses an identity attribute and a relation reaching an entity", () => {
		const { ws, root, money, bad } = shapes();
		bad.addAttribute("Key", { type: "string", identity: true });
		bad.includes(root, "owns");
		expect(shape(ws)).toEqual([
			[
				"error",
				'Value object "Bad" marks attribute "Key" as an identity; two value objects with the same values are the same value, so it has no identity of its own',
				bad.ref,
			],
			[
				"error",
				'Value object "Bad" includes entity "A"; a value is a value of something and nothing is reached through it, so a value object relates only to other values — hold "A"\'s id as an attribute with identifies instead',
				bad.ref,
			],
		]);
		// The well-formed value object next door stays quiet.
		expect(shape(ws).every(([, , ref]) => ref !== money.ref)).toBe(true);
	});

	it("refuses a value object including or referencing another value", () => {
		const { ws, money, bad } = shapes();
		bad.includes(money, "owns");
		bad.references(money, "points-at");
		expect(shape(ws).map(([, message]) => message)).toEqual([
			'Value object "Bad" includes "Money"; only an entity owns the lifecycle of what it includes, so "Bad" uses "Money" instead',
			'Value object "Bad" references "Money"; a reference holds another aggregate\'s identity and a value has none, so "Bad" uses "Money" instead',
		]);
	});

	it("closes cross-aggregate-reference's gap: a value reaching a child of another aggregate", () => {
		// The review's probe. `cross-aggregate-reference` reads the aggregate at
		// each end and a value object is in none, so nothing saw this until the
		// shape of a value object was what refused it (card 92).
		const { ws, bc, agg, root, bad } = shapes();
		const child = agg.addEntity("Mandate", { description: "" });
		child.addAttribute("Id", { type: "uuid", identity: true });
		root.includes(child, "under", "*");
		bad.references(child, "authorised-by", "1");
		const other = bc.addAggregate("Instruction", { description: "" });
		const instruction = other.addRootEntity("Instruction", { description: "" });
		instruction.addAttribute("Id", { type: "uuid", identity: true });
		instruction.addAttribute("Payee", { type: "Bad", valueobject: bad });
		instruction.uses(bad, "to", "1");
		expect(shape(ws).map(([, message]) => message)).toEqual([
			'Value object "Bad" references entity "Mandate"; a value is a value of something and nothing is reached through it, so a value object relates only to other values — hold "Mandate"\'s id as an attribute with identifies instead',
		]);
	});

	it("says nothing about a value object using another value", () => {
		const { ws, money, bad } = shapes();
		bad.addAttribute("Amount", { type: "Money", valueobject: money });
		bad.uses(money, "of", "1");
		expect(shape(ws)).toEqual([]);
	});
});

describe("aggregate-tree", () => {
	/** A root, one child, one value object, and a clean includes/uses pair. */
	function tidyAggregate() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		const root = agg.addRootEntity("Order", { description: "" });
		root.addAttribute("Id", { type: "uuid", identity: true });
		const line = agg.addEntity("Line", { description: "" });
		const money = bc.addValueObject("Money", { description: "" });
		root.includes(line, "has", "1..*");
		line.uses(money, "priced in", "1");
		line.addAttribute("Price", { type: "Money", valueobject: money });
		return { ws, agg, root, line, money };
	}

	const treeRules = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "aggregate-tree");

	it("is quiet on a root that includes entities and uses value objects", () => {
		expect(treeRules(tidyAggregate().ws)).toEqual([]);
	});

	it("refuses includes onto a value object and uses onto an entity", () => {
		const { ws, root, line, money } = tidyAggregate();
		root.includes(money, "wrong way round");
		root.uses(line, "also wrong");
		expect(treeRules(ws).map((d) => [d.severity, d.message])).toEqual([
			[
				"error",
				'"Order" includes "Money", which is a value object; "includes" points at an entity the aggregate owns. A value object is used',
			],
			[
				"error",
				'"Order" uses "Line", which is an entity; "uses" points at a value object, and an entity the aggregate owns is included',
			],
		]);
	});

	// The mirror of uses onto an entity: a value has no identity to point at,
	// so a reference to one can only mean that the holder uses it (card 100).
	it("refuses references onto a value object too", () => {
		const { ws, root, money } = tidyAggregate();
		root.references(money, "points at a value");
		expect(treeRules(ws).map((d) => [d.severity, d.message])).toEqual([
			[
				"error",
				'"Order" references "Money", which is a value object; "references" points at an entity in another aggregate, and a value has no identity to point at. A value object is used',
			],
		]);
	});

	it("allows an entity type included by two parent types, because an instance still has one parent", () => {
		const { ws, agg, root, line } = tidyAggregate();
		const shared = agg.addEntity("Shared", { description: "" });
		root.includes(shared, "owns");
		line.includes(shared, "owns too");
		expect(treeRules(ws)).toEqual([]);
	});

	it("allows an entity that includes its own type, which is a tree per instance", () => {
		const { ws, line } = tidyAggregate();
		line.includes(line, "nests");
		expect(treeRules(ws)).toEqual([]);
	});

	// A questionnaire's groups contain questions that contain groups, and every
	// questionnaire is still a finite tree. The model declares types, so the
	// rule judges no ring among them at all (decision 15, card 82).
	it("allows two entity types that include each other, because the instances still form a tree", () => {
		const { ws, root, line } = tidyAggregate();
		line.includes(root, "back up");
		expect(treeRules(ws)).toEqual([]);
	});

	it("warns about an entity the root cannot be walked to", () => {
		const { ws, agg } = tidyAggregate();
		const stray = agg.addEntity("Stray", { description: "" });
		expect(treeRules(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"warning",
				'"Stray" is in aggregate "Order" but no chain of "includes" or "references" reaches it from "Order", so nothing inside the boundary can get to it',
				stray.ref,
			],
		]);
	});

	it("counts a references as reaching an entity, and stays out of other aggregates", () => {
		const { ws, agg, root } = tidyAggregate();
		const referenced = agg.addEntity("Referenced", { description: "" });
		root.references(referenced, "points at");
		expect(treeRules(ws)).toEqual([]);
	});
});

describe("invariant-in-aggregate", () => {
	it("keeps every target of an invariant inside its own aggregate", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const order = bc.addAggregate("Order", { description: "" });
		const root = order.addRootEntity("Order", { description: "" });
		const total = root.addAttribute("Total", { type: "int64", identity: true });
		const other = bc.addAggregate("Customer", { description: "" });
		const customer = other.addRootEntity("Customer", { description: "" });
		customer.addAttribute("Id", { type: "uuid", identity: true });
		// Local targets, entity and attribute alike, are fine.
		order.addInvariant("Positive", { description: "" }).constrains(root, total);
		const stretched = order
			.addInvariant("Stretched", { description: "" })
			.constrains(customer);
		const rules = ws
			.validate()
			.filter((d) => d.rule === "invariant-in-aggregate");
		expect(rules).toEqual([
			{
				severity: "error",
				rule: "invariant-in-aggregate",
				message:
					'Invariant "Stretched" of aggregate "Order" constrains "Customer", which is in aggregate "Customer"; an aggregate\'s invariant holds inside the boundary on every save. Outside it, a rule may name an operation of a service of its own context that guards it, and — where it is a precondition or a postcondition — the attributes of the shapes that operation carries, a precondition also reading what the guard or the front that calls it fetched, and the payload of the event the reactor issuing it heard',
				ref: stretched.ref,
			},
		]);
	});

	/**
	 * One aggregate with an internal operation, its context's application
	 * service and domain service, and a second context's application service:
	 * the four places an invariant might point an operation at.
	 */
	function guards() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const order = bc.addAggregate("Order", { description: "" });
		order.addRootEntity("Order", { description: "" });
		const approve = order.provides("Approve", {
			description: "",
			type: "operation",
			internal: true,
		});
		const app = bc.addService("App", { description: "", type: "application" });
		const submit = app.provides("Submit", {
			description: "",
			type: "operation",
		});
		const pricing = bc.addService("Pricing", {
			description: "",
			type: "domain",
		});
		const price = pricing.provides("Price", {
			description: "",
			type: "operation",
			internal: true,
		});
		const next = ws.addBoundedContext("Next", { description: "" });
		const theirs = next
			.addService("TheirApp", { description: "", type: "application" })
			.provides("Check", { description: "", type: "operation" });
		return { ws, order, approve, submit, price, theirs };
	}

	const inAggregate = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "invariant-in-aggregate")
			.map((d) => [d.message, d.ref]);

	it("lets an invariant name an operation of its own aggregate", () => {
		const { ws, order, approve } = guards();
		// The transition rule names the operation that makes the transition.
		order
			.addInvariant("Once Approved", { description: "" })
			.constrains(approve);
		expect(inAggregate(ws)).toEqual([]);
	});

	it("lets a precondition name the application service operation that guards it", () => {
		const { ws, order, submit } = guards();
		// Decision 17 puts the public operation on the application service, so
		// that is where a precondition is checked (decision 19, amended).
		order
			.addInvariant("Funds Available", { description: "" })
			.constrains(submit);
		expect(inAggregate(ws)).toEqual([]);
	});

	it("lets a domain service's operation of its own context guard", () => {
		const { ws, order, price } = guards();
		// A rule that reads two aggregates before it can say yes lives in a
		// domain service (decision 19, second amendment).
		order.addInvariant("Priced Right", { description: "" }).constrains(price);
		expect(inAggregate(ws)).toEqual([]);
	});

	it("refuses a neighbouring context's service operation", () => {
		const { ws, order, theirs } = guards();
		const abroad = order
			.addInvariant("Reaches Out", { description: "" })
			.constrains(theirs);
		expect(inAggregate(ws)).toEqual([
			[
				'Invariant "Reaches Out" of aggregate "Order" constrains "Check", which is an application service\'s, on "TheirApp" in bounded context "Next"; an aggregate\'s invariant holds inside the boundary on every save. Outside it, a rule may name an operation of a service of its own context that guards it, and — where it is a precondition or a postcondition — the attributes of the shapes that operation carries, a precondition also reading what the guard or the front that calls it fetched, and the payload of the event the reactor issuing it heard',
				abroad.ref,
			],
		]);
	});

	/**
	 * A shared kernel holding Money and a Rate nobody borrows, and a context
	 * whose Invoice holds a Money. The review's case: the invariant is about
	 * the amount of the value the invoice holds, and the value happens to be
	 * defined next door (card 89).
	 */
	function borrowed() {
		const ws = emptyWorkspace();
		const kernel = ws.addBoundedContext("Kernel", { description: "" });
		const billing = ws.addBoundedContext("Billing", { description: "" });
		billing.sharesKernelWith(kernel);
		const money = kernel.addValueObject("Money", { description: "" });
		const amount = money.addAttribute("amount", { type: "decimal" });
		const rate = kernel.addValueObject("Rate", { description: "" });
		const invoice = billing.addAggregate("Invoice", { description: "" });
		const root = invoice.addRootEntity("Invoice", { description: "" });
		root.addAttribute("Id", { type: "uuid", identity: true });
		root.addAttribute("Total", { type: "Money", valueobject: money });
		return { ws, billing, money, amount, rate, invoice };
	}

	it("lets an invariant constrain a value object of a shared kernel that its own entity holds", () => {
		const { ws, money, amount, invoice } = borrowed();
		invoice
			.addInvariant("Total Is Positive", { description: "" })
			.constrains(money, amount);
		expect(
			ws.validate().filter((d) => d.rule === "invariant-in-aggregate"),
		).toEqual([]);
	});

	it("still refuses a value object nobody inside the aggregate holds", () => {
		const { ws, rate, invoice } = borrowed();
		const reaching = invoice
			.addInvariant("Reaches Out", { description: "" })
			.constrains(rate);
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "invariant-in-aggregate")
				.map((d) => [d.message, d.ref]),
		).toEqual([
			[
				'Invariant "Reaches Out" of aggregate "Invoice" constrains "Rate", which is a value object of bounded context "Kernel" that nothing in "Invoice" holds; an aggregate\'s invariant holds inside the boundary on every save. Outside it, a rule may name an operation of a service of its own context that guards it, and — where it is a precondition or a postcondition — the attributes of the shapes that operation carries, a precondition also reading what the guard or the front that calls it fetched, and the payload of the event the reactor issuing it heard',
				reaching.ref,
			],
		]);
	});

	it("refuses a value object of the aggregate's own context that nothing holds", () => {
		// The gap card 95 closed: a value belongs to the whole context, so
		// reading the scope answered "inside the boundary" before anyone asked
		// whether the aggregate held one.
		const { ws, billing, invoice } = borrowed();
		const local = billing.addValueObject("Discount", { description: "" });
		local.addAttribute("percent", { type: "int" });
		const reaching = invoice
			.addInvariant("Reaches Sideways", { description: "" })
			.constrains(local);
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "invariant-in-aggregate")
				.map((d) => [d.message, d.ref]),
		).toEqual([
			[
				'Invariant "Reaches Sideways" of aggregate "Invoice" constrains "Discount", which is a value object of bounded context "Billing" that nothing in "Invoice" holds; an aggregate\'s invariant holds inside the boundary on every save. Outside it, a rule may name an operation of a service of its own context that guards it, and — where it is a precondition or a postcondition — the attributes of the shapes that operation carries, a precondition also reading what the guard or the front that calls it fetched, and the payload of the event the reactor issuing it heard',
				reaching.ref,
			],
		]);
	});

	it("follows the values a held value holds", () => {
		const { ws, money, invoice } = borrowed();
		const currency = money.boundedcontext.addValueObject("Currency", {
			description: "",
		});
		money.addAttribute("currency", { type: "Currency", valueobject: currency });
		invoice
			.addInvariant("One Currency", { description: "" })
			.constrains(currency);
		expect(
			ws.validate().filter((d) => d.rule === "invariant-in-aggregate"),
		).toEqual([]);
	});

	/**
	 * The review's freight quotation: pickup before delivery and a positive
	 * weight are checked on the request, before anything is saved, and no
	 * aggregate holds either field (decision 19, amended).
	 */
	function quotation() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Freight", { description: "" });
		const shipment = bc.addAggregate("Shipment", { description: "" });
		shipment.addRootEntity("Shipment", { description: "" });
		const request = bc.addSchema("Quote Request", { description: "" });
		const pickup = request.addAttribute("pickupDate", { type: "date" });
		const delivery = request.addAttribute("deliveryDate", { type: "date" });
		const weight = request.addAttribute("weightKg", { type: "decimal" });
		// The request composes its lines, and a rule about a line's amount is a
		// rule about the request that carries them (decision 18; card 99).
		const line = bc.addSchema("Quote Line", { description: "" });
		const amount = line.addAttribute("amount", { type: "decimal" });
		request.addAttribute("lines", { type: "Quote Line[]", schema: line });
		const quote = bc.addSchema("Quote", { description: "" });
		const price = quote.addAttribute("price", { type: "decimal" });
		const leg = bc.addSchema("Quoted Leg", { description: "" });
		const arrival = leg.addAttribute("arrivesAt", { type: "date" });
		quote.addAttribute("legs", { type: "Quoted Leg[]", schema: leg });
		const elsewhere = bc.addSchema("Booking", { description: "" });
		const reference = elsewhere.addAttribute("reference", { type: "string" });
		const quoting = bc.addService("Quoting", {
			description: "",
			type: "application",
		});
		const requestQuote = quoting.provides("Request Quote", {
			description: "",
			type: "operation",
			schema: request,
			returns: quote,
		});
		return {
			ws,
			bc,
			shipment,
			pickup,
			delivery,
			weight,
			amount,
			price,
			arrival,
			reference,
			requestQuote,
		};
	}

	it("lets a precondition constrain the fields of the request its guard receives", () => {
		const { ws, shipment, pickup, delivery, weight, requestQuote } =
			quotation();
		shipment
			.addInvariant("Pickup Before Delivery", {
				description: "",
				precondition: true,
			})
			.constrains(requestQuote, pickup, delivery, weight);
		expect(inAggregate(ws)).toEqual([]);
	});

	// A precondition is checked before the call runs, so the answer has not been
	// computed: a rule about it is a postcondition (card 104).
	it("refuses a precondition that constrains what its guard answers with", () => {
		const { ws, shipment, price, requestQuote } = quotation();
		const early = shipment
			.addInvariant("Quoted Price Is Positive", {
				description: "",
				precondition: true,
			})
			.constrains(requestQuote, price);
		expect(inAggregate(ws)).toEqual([
			[
				'Invariant "Quoted Price Is Positive" of aggregate "Shipment" constrains "Quote.price", which is an attribute of schema "Quote", which is neither in the request of an operation this precondition guards, nor in what a call that guard makes answers with, nor in the payload of an event the reactor issuing that guard heard, directly or through a shape one of those composes; a precondition reads what it has by the time it runs — the request, what the guard or the front that calls it already fetched, and what the fact it is reacting to arrived carrying — and not what this call comes back with; an aggregate\'s invariant holds inside the boundary on every save. Outside it, a rule may name an operation of a service of its own context that guards it, and — where it is a precondition or a postcondition — the attributes of the shapes that operation carries, a precondition also reading what the guard or the front that calls it fetched, and the payload of the event the reactor issuing it heard',
				early.ref,
			],
		]);
	});

	it("refuses a schema no operation the precondition guards handles", () => {
		const { ws, shipment, reference, requestQuote } = quotation();
		const stray = shipment
			.addInvariant("Reads Someone Else's Request", {
				description: "",
				precondition: true,
			})
			.constrains(requestQuote, reference);
		expect(inAggregate(ws)).toEqual([
			[
				'Invariant "Reads Someone Else\'s Request" of aggregate "Shipment" constrains "Booking.reference", which is an attribute of schema "Booking", which is neither in the request of an operation this precondition guards, nor in what a call that guard makes answers with, nor in the payload of an event the reactor issuing that guard heard, directly or through a shape one of those composes; a precondition reads what it has by the time it runs — the request, what the guard or the front that calls it already fetched, and what the fact it is reacting to arrived carrying — and not what this call comes back with; an aggregate\'s invariant holds inside the boundary on every save. Outside it, a rule may name an operation of a service of its own context that guards it, and — where it is a precondition or a postcondition — the attributes of the shapes that operation carries, a precondition also reading what the guard or the front that calls it fetched, and the payload of the event the reactor issuing it heard',
				stray.ref,
			],
		]);
	});

	it("follows composition into a shape the request carries", () => {
		const { ws, shipment, amount, requestQuote } = quotation();
		shipment
			.addInvariant("Every Line Is Priced", {
				description: "",
				precondition: true,
			})
			.constrains(requestQuote, amount);
		expect(inAggregate(ws)).toEqual([]);
	});

	it("lets a postcondition constrain the answer its guard comes back with", () => {
		const { ws, shipment, price, requestQuote } = quotation();
		shipment
			.addInvariant("Quoted Price Is Positive", {
				description: "",
				postcondition: true,
			})
			.constrains(requestQuote, price);
		expect(inAggregate(ws)).toEqual([]);
	});

	it("follows composition into a shape the answer carries", () => {
		const { ws, shipment, arrival, requestQuote } = quotation();
		shipment
			.addInvariant("Every Leg Meets The Deadline", {
				description: "",
				postcondition: true,
			})
			.constrains(requestQuote, arrival);
		expect(inAggregate(ws)).toEqual([]);
	});

	// A guarantee about an answer is usually a guarantee about the answer to
	// what was asked: every returned itinerary arrives by the requested time
	// names one attribute of each, and reading the answer alone refused the
	// example the flag was introduced for (card 103).
	it("lets a postcondition relate the answer to the request that produced it", () => {
		const { ws, shipment, pickup, arrival, requestQuote } = quotation();
		shipment
			.addInvariant("Arrives By The Requested Time", {
				description: "",
				postcondition: true,
			})
			.constrains(requestQuote, arrival, pickup);
		expect(inAggregate(ws)).toEqual([]);
	});

	it("still refuses a postcondition a shape its guard never carries", () => {
		const { ws, shipment, reference, requestQuote } = quotation();
		const wrongShape = shipment
			.addInvariant("Booked Under A Reference", {
				description: "",
				postcondition: true,
			})
			.constrains(requestQuote, reference);
		expect(inAggregate(ws)).toEqual([
			[
				'Invariant "Booked Under A Reference" of aggregate "Shipment" constrains "Booking.reference", which is an attribute of schema "Booking", which no operation this postcondition guards takes, returns or rejects with, directly or through a shape one of those composes; an aggregate\'s invariant holds inside the boundary on every save. Outside it, a rule may name an operation of a service of its own context that guards it, and — where it is a precondition or a postcondition — the attributes of the shapes that operation carries, a precondition also reading what the guard or the front that calls it fetched, and the payload of the event the reactor issuing it heard',
				wrongShape.ref,
			],
		]);
	});

	it("refuses a request field to an invariant that is no precondition", () => {
		const { ws, shipment, pickup, requestQuote } = quotation();
		// The rule is stated as one kept true on every save, and a save keeps
		// nothing about a transport shape.
		const persistent = shipment
			.addInvariant("Pickup Before Delivery", { description: "" })
			.constrains(requestQuote, pickup);
		expect(inAggregate(ws)).toEqual([
			[
				'Invariant "Pickup Before Delivery" of aggregate "Shipment" constrains "Quote Request.pickupDate", which is an attribute of schema "Quote Request", and only a precondition or a postcondition may constrain one — a rule kept true on every save is a rule about the model, not about a transport shape; an aggregate\'s invariant holds inside the boundary on every save. Outside it, a rule may name an operation of a service of its own context that guards it, and — where it is a precondition or a postcondition — the attributes of the shapes that operation carries, a precondition also reading what the guard or the front that calls it fetched, and the payload of the event the reactor issuing it heard',
				persistent.ref,
			],
		]);
	});

	/**
	 * "Approve an order only if the customer is in good standing." The standing
	 * is another context's, and what Sales holds is the answer its front
	 * fetched over the anti-corruption layer before deciding — so the rule can
	 * name that answer's shape and still not the other context's entity
	 * (decision 19, amendment of 2026-09-10, second; card 116).
	 */
	function goodStanding({ front = false } = {}) {
		const ws = emptyWorkspace();
		const customers = ws.addBoundedContext("Customers", { description: "" });
		const sales = ws.addBoundedContext("Sales", { description: "" });
		sales.downstreamOf(customers, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		const customer = customers
			.addAggregate("Customer", { description: "" })
			.addRootEntity("Customer", { description: "" });
		customer.addAttribute("id", { type: "int64", identity: true });
		const theirStanding = customer.addAttribute("standing", {
			type: "string",
		});
		const answer = customers.addSchema("Standing", { description: "" });
		const standing = answer.addAttribute("standing", { type: "string" });
		const getStanding = customers
			.addService("Customer App", { description: "", type: "application" })
			.provides("Get Standing", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
				returns: answer,
			});
		const orders = sales.addAggregate("Order", { description: "" });
		const order = orders.addRootEntity("Order", { description: "" });
		order.addAttribute("id", { type: "int64", identity: true });
		const approve = orders.provides("Approve", {
			description: "",
			type: "operation",
			internal: true,
		});
		const salesApp = sales.addService("Sales App", {
			description: "",
			type: "application",
		});
		const check = salesApp.provides("Check Standing", {
			description: "",
			type: "operation",
			internal: true,
		});
		salesApp.consumes(getStanding, {
			pattern: "anti-corruption-layer",
			by: [check],
		});
		// The front reaches the aggregate's transition, so the guard is
		// `Approve` alone and the call belongs to what calls it.
		if (front) salesApp.consumes(approve, { by: [check] });
		return { ws, orders, approve, check, standing, theirStanding };
	}

	it("lets a precondition read what its own guard fetched", () => {
		const { ws, orders, approve, check, standing } = goodStanding();
		orders
			.addInvariant("Approve Only In Good Standing", {
				description: "",
				precondition: true,
			})
			.constrains(approve, check, standing);
		expect(inAggregate(ws)).toEqual([]);
	});

	it("lets it read what the front calling the guard fetched", () => {
		const { ws, orders, approve, standing } = goodStanding({ front: true });
		orders
			.addInvariant("Approve Only In Good Standing", {
				description: "",
				precondition: true,
			})
			.constrains(approve, standing);
		expect(inAggregate(ws)).toEqual([]);
	});

	it("still refuses the other context's own attribute", () => {
		const { ws, orders, approve, check, theirStanding } = goodStanding();
		const reaching = orders
			.addInvariant("Approve Only In Good Standing", {
				description: "",
				precondition: true,
			})
			.constrains(approve, check, theirStanding);
		expect(inAggregate(ws).map(([, ref]) => ref)).toEqual([reaching.ref]);
		expect(inAggregate(ws)[0][0]).toContain(
			'constrains "Customer.standing", which is in aggregate "Customer"',
		);
	});

	/**
	 * The fulfilment gate. "Ship only when the captured amount covers the order
	 * total" reads `PaymentCaptured.amount`, which is not in `Ship`'s request
	 * and which nobody here called for: it arrived on the event this context's
	 * own reactor is subscribed to, and is why `Ship` is being issued at all.
	 * Refusing it left the model copying the amount into the request so a rule
	 * had something local to point at (decision 19, amendment of 2026-09-10,
	 * third; card 124).
	 */
	function fulfilmentGate({
		front = false,
		reactor = "process",
	}: {
		front?: boolean;
		reactor?: "process" | "policy";
	} = {}) {
		const ws = emptyWorkspace();
		const payments = ws.addBoundedContext("Payments", { description: "" });
		const fulfilment = ws.addBoundedContext("Fulfilment", { description: "" });
		payments.upstreamOf(fulfilment, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		const payload = payments.addSchema("Payment Captured", {
			description: "",
		});
		const amount = payload.addAttribute("amount", { type: "decimal" });
		const captured = payments
			.addService("Payments API", { description: "", type: "application" })
			.provides("Payment Captured", {
				description: "",
				type: "event",
				pattern: "published-language",
				schema: payload,
			});
		const shipments = fulfilment.addAggregate("Shipment", { description: "" });
		const shipment = shipments.addRootEntity("Shipment", { description: "" });
		shipment.addAttribute("id", { type: "int64", identity: true });
		const total = shipment.addAttribute("orderTotal", { type: "decimal" });
		const ship = shipments.provides("Ship", {
			description: "",
			type: "operation",
			internal: true,
		});
		const app = fulfilment.addService("Fulfilment App", {
			description: "",
			type: "application",
		});
		// With a front, decision 17's usual shape: the reactor issues the
		// service's operation and that is what calls the aggregate's transition.
		const doShip = front
			? app.provides("Do Ship", {
					description: "",
					type: "operation",
					internal: true,
				})
			: ship;
		if (front) app.consumes(ship, { by: [doShip] });
		const heard =
			reactor === "process"
				? fulfilment
						.addProcess("Fulfil the order", { description: "" })
						.starts(captured)
						.issues(doShip)
				: fulfilment
						.addPolicy("Ship on capture", { description: "" })
						.on(captured)
						.issues(doShip);
		app.consumes(captured, { pattern: "conformist", by: [heard] });
		return { ws, shipments, ship, total, amount, fulfilment, app };
	}

	it("lets a precondition read the payload of the event its reactor heard", () => {
		const { ws, shipments, ship, total, amount } = fulfilmentGate();
		shipments
			.addInvariant("Ship Only When Fully Paid", {
				description: "",
				precondition: true,
			})
			.constrains(ship, total, amount);
		expect(inAggregate(ws)).toEqual([]);
	});

	it("reads it through the front the reactor actually issues", () => {
		const { ws, shipments, ship, total, amount } = fulfilmentGate({
			front: true,
		});
		shipments
			.addInvariant("Ship Only When Fully Paid", {
				description: "",
				precondition: true,
			})
			.constrains(ship, total, amount);
		expect(inAggregate(ws)).toEqual([]);
	});

	it("reads it when a stateless policy is what reacts", () => {
		const { ws, shipments, ship, total, amount } = fulfilmentGate({
			reactor: "policy",
		});
		shipments
			.addInvariant("Ship Only When Fully Paid", {
				description: "",
				precondition: true,
			})
			.constrains(ship, total, amount);
		expect(inAggregate(ws)).toEqual([]);
	});

	// A fact this context takes in, heard by a reactor that issues something
	// else: nothing handed it to this guard, so it is out of reach exactly as
	// an answer no call of ours fetched is.
	it("refuses a payload no reactor of the guard's chain heard", () => {
		const { ws, shipments, ship, total, fulfilment, app } = fulfilmentGate();
		const elsewhere = ws.addBoundedContext("Warehouse", { description: "" });
		elsewhere.upstreamOf(fulfilment, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		const stockPayload = elsewhere.addSchema("Stock Counted", {
			description: "",
		});
		const counted = stockPayload.addAttribute("counted", { type: "int64" });
		const stockCounted = elsewhere
			.addService("Warehouse API", { description: "", type: "application" })
			.provides("Stock Counted", {
				description: "",
				type: "event",
				pattern: "published-language",
				schema: stockPayload,
			});
		const recount = app.provides("Record Count", {
			description: "",
			type: "operation",
			internal: true,
		});
		const other = fulfilment
			.addPolicy("Record the count", { description: "" })
			.on(stockCounted)
			.issues(recount);
		app.consumes(stockCounted, { pattern: "conformist", by: [other] });
		const reaching = shipments
			.addInvariant("Ship Only When Counted", {
				description: "",
				precondition: true,
			})
			.constrains(ship, total, counted);
		expect(inAggregate(ws).map(([, ref]) => ref)).toEqual([reaching.ref]);
		expect(inAggregate(ws)[0][0]).toContain(
			"nor in the payload of an event the reactor issuing that guard heard",
		);
	});

	// Nobody here made that call, so the answer is not ours to read: the
	// consumption belongs to the other context's own service.
	it("does not reach an answer no call of this context fetched", () => {
		const { ws, orders, approve, check, standing } = goodStanding();
		const sales = ws.getBoundedContextByRefOrThrow("#/boundedcontexts/sales");
		const salesApp = sales.services.get("sales_app");
		if (!salesApp) throw new Error("no service");
		salesApp.consumptions.length = 0;
		const reaching = orders
			.addInvariant("Approve Only In Good Standing", {
				description: "",
				precondition: true,
			})
			.constrains(approve, check, standing);
		expect(inAggregate(ws).map(([, ref]) => ref)).toEqual([reaching.ref]);
	});
});

describe("invariant-in-context", () => {
	it("lets a context's invariant reach across its own aggregates, and no further", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const order = bc.addAggregate("Order", { description: "" });
		const root = order.addRootEntity("Order", { description: "" });
		const customerId = root.addAttribute("Customer Id", { type: "uuid" });
		const basket = bc.addAggregate("Basket", { description: "" });
		basket.addRootEntity("Basket", { description: "" });
		const place = order.provides("Place", {
			description: "",
			type: "operation",
		});
		const elsewhere = ws.addBoundedContext("Elsewhere", { description: "" });
		const foreign = elsewhere.addAggregate("Ledger", { description: "" });
		const entry = foreign.addRootEntity("Entry", { description: "" });
		// One open order per customer: a rule about the aggregate's instances,
		// so it counts an attribute of one aggregate and is guarded by that
		// aggregate's operation. Both belong to this context, so nothing is
		// reported.
		bc.addInvariant("One Open Order Per Customer", {
			description: "",
		}).constrains(customerId, place);
		const foreignRule = bc
			.addInvariant("Reaches Out", { description: "" })
			.constrains(entry, place);
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "invariant-in-context")
				.map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"error",
				'Invariant "Reaches Out" of bounded context "BC" constrains "Entry", which is in bounded context "Elsewhere"; a context\'s invariant holds across its own aggregates and no further — where the two contexts really must agree, the rule is a policy or a process of "BC" that reacts to the other context\'s event instead',
				foreignRule.ref,
			],
		]);
	});

	it("refuses a schema's attribute to an invariant that is no precondition", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		agg.addRootEntity("Order", { description: "" });
		const place = agg.provides("Place", { description: "", type: "operation" });
		const payload = bc.addSchema("Place Order");
		const field = payload.addAttribute("Customer Id", { type: "uuid" });
		const rule = bc
			.addInvariant("Counts A Payload", { description: "" })
			.constrains(field, place);
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "invariant-in-context")
				.map((d) => [d.message, d.ref]),
		).toEqual([
			[
				'Invariant "Counts A Payload" of bounded context "BC" constrains "Place Order.Customer Id", which is an attribute of schema "Place Order", and only a precondition or a postcondition may constrain one — a rule kept true on every save is a rule about the model, not about a transport shape; a context\'s invariant holds across its own aggregates and no further — where the two contexts really must agree, the rule is a policy or a process of "BC" that reacts to the other context\'s event instead',
				rule.ref,
			],
		]);
	});

	it("lets a context's precondition constrain the fields of the request its guard receives", () => {
		// The review's freight quotation, as a rule the context keeps: the
		// check reads the request and nothing is saved yet (decision 19,
		// amended).
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Freight", { description: "" });
		const shipment = bc.addAggregate("Shipment", { description: "" });
		shipment.addRootEntity("Shipment", { description: "" });
		const request = bc.addSchema("Quote Request", { description: "" });
		const pickup = request.addAttribute("pickupDate", { type: "date" });
		const delivery = request.addAttribute("deliveryDate", { type: "date" });
		const requestQuote = bc
			.addService("Quoting", { description: "", type: "application" })
			.provides("Request Quote", {
				description: "",
				type: "operation",
				schema: request,
			});
		bc.addInvariant("Pickup Before Delivery", {
			description: "",
			precondition: true,
		}).constrains(requestQuote, pickup, delivery);
		expect(inContext(ws)).toEqual([]);
	});

	/**
	 * A shared kernel holding Money and a Rate nobody borrows, and a Billing
	 * context whose Invoice holds a Money: the same borrowing an aggregate's
	 * invariant is asked about (card 89).
	 */
	function contextBorrowing() {
		const ws = emptyWorkspace();
		const kernel = ws.addBoundedContext("Kernel", { description: "" });
		const billing = ws.addBoundedContext("Billing", { description: "" });
		billing.sharesKernelWith(kernel);
		const money = kernel.addValueObject("Money", { description: "" });
		const amount = money.addAttribute("amount", { type: "decimal" });
		const rate = kernel.addValueObject("Rate", { description: "" });
		const invoice = billing.addAggregate("Invoice", { description: "" });
		const root = invoice.addRootEntity("Invoice", { description: "" });
		root.addAttribute("Id", { type: "uuid", identity: true });
		root.addAttribute("Total", { type: "Money", valueobject: money });
		const issue = invoice.provides("Issue", {
			description: "",
			type: "operation",
		});
		return { ws, billing, money, amount, rate, root, issue };
	}

	const inContext = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "invariant-in-context")
			.map((d) => [d.message, d.ref]);

	/**
	 * A value a context's own aggregate holds is inside the context wherever
	 * it is defined, and one nothing holds is not (card 89).
	 */
	it("lets a context's invariant constrain a borrowed value its aggregates hold, and no other", () => {
		const { ws, billing, amount, rate, issue } = contextBorrowing();
		billing
			.addInvariant("Total Owed Under The Limit", { description: "" })
			.constrains(amount, issue);
		const reaching = billing
			.addInvariant("Reaches Out", { description: "" })
			.constrains(rate, issue);
		expect(inContext(ws)).toEqual([
			[
				'Invariant "Reaches Out" of bounded context "Billing" constrains "Rate", which is a value object of bounded context "Kernel" that nothing in "Billing" holds; a context\'s invariant holds across its own aggregates and no further — where the two contexts really must agree, the rule is a policy or a process of "Billing" that reacts to the other context\'s event instead',
				reaching.ref,
			],
		]);
	});

	it("lets a context's invariant constrain one of its own value objects that an aggregate holds", () => {
		const { ws, billing, root, issue } = contextBorrowing();
		const discount = billing.addValueObject("Discount", { description: "" });
		const percent = discount.addAttribute("percent", { type: "int" });
		root.addAttribute("Discount", { type: "Discount", valueobject: discount });
		billing
			.addInvariant("One Discount Per Customer", { description: "" })
			.constrains(percent, issue);
		expect(inContext(ws)).toEqual([]);
	});

	it("refuses a value object of the context's own that nothing in the context holds", () => {
		// The gap card 96 closed, the twin of card 95's: a value is declared by
		// the context, so reading the declaring context answered "inside the
		// boundary" before anyone asked whether anything held one.
		const { ws, billing, issue } = contextBorrowing();
		const discount = billing.addValueObject("Discount", { description: "" });
		discount.addAttribute("percent", { type: "int" });
		const reaching = billing
			.addInvariant("Reaches Sideways", { description: "" })
			.constrains(discount, issue);
		expect(inContext(ws)).toEqual([
			[
				'Invariant "Reaches Sideways" of bounded context "Billing" constrains "Discount", which is a value object of bounded context "Billing" that nothing in "Billing" holds; a context\'s invariant holds across its own aggregates and no further — where the two contexts really must agree, the rule is a policy or a process of "Billing" that reacts to the other context\'s event instead',
				reaching.ref,
			],
		]);
	});

	/**
	 * A context with no aggregate at all — a quotation service that stores
	 * nothing (decision 27, third amendment) — whose invariant reaches for a
	 * value object nothing there holds. The rule catalogue's fix text used to
	 * tell any reader here to "give an entity ... an attribute typed by it",
	 * which this context cannot do: it has no entity to give one to. The
	 * honest fix is a precondition or a postcondition naming the operation's
	 * own schema instead (card 108).
	 */
	it("still refuses a value object nothing holds in a context with no entities", () => {
		const ws = emptyWorkspace();
		const quoting = ws.addBoundedContext("Quoting", { description: "" });
		const rate = quoting.addValueObject("Rate", { description: "" });
		rate.addAttribute("amount", { type: "decimal" });
		const requestQuote = quoting
			.addService("Quoting App", { description: "", type: "application" })
			.provides("Request Quote", { description: "", type: "operation" });
		const reaching = quoting
			.addInvariant("Rate Under The Cap", { description: "" })
			.constrains(rate, requestQuote);
		expect(inContext(ws)).toEqual([
			[
				'Invariant "Rate Under The Cap" of bounded context "Quoting" constrains "Rate", which is a value object of bounded context "Quoting" that nothing in "Quoting" holds; a context\'s invariant holds across its own aggregates and no further — where the two contexts really must agree, the rule is a policy or a process of "Quoting" that reacts to the other context\'s event instead',
				reaching.ref,
			],
		]);
	});
});

describe("invariant-in-value-object", () => {
	const rules = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "invariant-in-value-object");

	/** A context with an IBAN and an account that holds one. */
	function bank() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Accounts", { description: "" });
		const iban = bc.addValueObject("IBAN", { description: "" });
		const value = iban.addAttribute("value", { type: "string" });
		const agg = bc.addAggregate("Account", { description: "" });
		const account = agg.addRootEntity("Account", { description: "" });
		account.addAttribute("id", { type: "uuid", identity: true });
		account.addAttribute("iban", { type: "IBAN", valueobject: iban });
		account.uses(iban, "iban", "1");
		return { ws, bc, iban, value, agg, account };
	}

	it("lets a value's rule name its own attributes, and needs no guard", () => {
		const { ws, iban, value } = bank();
		iban.addInvariant("Checksum Valid", { description: "" }).constrains(value);
		expect(rules(ws)).toEqual([]);
		expect(
			ws.validate().filter((d) => d.rule === "context-invariant-is-checked"),
		).toEqual([]);
	});

	it("refuses a value's rule that reaches for the entity holding it", () => {
		const { ws, iban, account } = bank();
		const rule = iban
			.addInvariant("Reaches Out", { description: "" })
			.constrains(account);
		expect(rules(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"error",
				'Invariant "Reaches Out" of value object "IBAN" constrains "Account", which is neither an attribute of "IBAN" nor one of a value "IBAN" is made of; a value\'s rule holds by construction of that value and reaches only along what it composes',
				rule.ref,
			],
		]);
	});

	it("refuses a value's rule that names an operation, since nothing guards a value", () => {
		const { ws, iban, agg } = bank();
		const open = agg.provides("Open", { description: "", type: "operation" });
		iban.addInvariant("Guarded", { description: "" }).constrains(open);
		expect(rules(ws).map((d) => d.message)).toEqual([
			'Invariant "Guarded" of value object "IBAN" constrains "Open", which is neither an attribute of "IBAN" nor one of a value "IBAN" is made of; a value\'s rule holds by construction of that value and reaches only along what it composes',
		]);
	});

	it("counts an attribute the value has from what it is a kind of as its own", () => {
		const { ws, bc, iban, value } = bank();
		const domestic = bc.addValueObject("Domestic IBAN", {
			description: "",
			specialises: iban,
		});
		domestic
			.addInvariant("Home Country", { description: "" })
			.constrains(value);
		expect(rules(ws)).toEqual([]);
	});

	/**
	 * An itinerary is constructed from its legs, and each leg from a time and
	 * a place, so a rule about the legs' order holds by construction of the
	 * itinerary. Reading only the owner's own attributes made a model flatten
	 * its legs to state it (decision 27, amended 2026-09-10; card 113).
	 */
	function travel() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Travel", { description: "" });
		const stamp = bc.addValueObject("Timestamp", { description: "" });
		const instant = stamp.addAttribute("instant", { type: "datetime" });
		const leg = bc.addValueObject("Leg", { description: "" });
		const arrival = leg.addAttribute("arrival", {
			type: "Timestamp",
			valueobject: stamp,
		});
		const departure = leg.addAttribute("departure", {
			type: "Timestamp",
			valueobject: stamp,
		});
		const itinerary = bc.addValueObject("Itinerary", { description: "" });
		itinerary.addAttribute("legs", { type: "Leg[]", valueobject: leg });
		return { ws, bc, itinerary, leg, arrival, departure, instant };
	}

	it("lets a value's rule reach the attributes of a value it is made of", () => {
		const { ws, itinerary, arrival, departure } = travel();
		itinerary
			.addInvariant("Legs In Time Order", { description: "" })
			.constrains(arrival, departure);
		expect(rules(ws)).toEqual([]);
	});

	it("follows composition as far as it runs", () => {
		const { ws, itinerary, leg, instant } = travel();
		// Itinerary holds Legs, a Leg holds Timestamps, so the instant inside
		// one is on the path — as is the Leg itself.
		itinerary
			.addInvariant("Legs Are Instants Apart", { description: "" })
			.constrains(leg, instant);
		expect(rules(ws)).toEqual([]);
	});

	it("still refuses a value nothing on the composition path holds", () => {
		const { ws, bc, itinerary } = travel();
		const seat = bc.addValueObject("Seat", { description: "" });
		const row = seat.addAttribute("row", { type: "int32" });
		const rule = itinerary
			.addInvariant("Seat In Order", { description: "" })
			.constrains(row);
		expect(rules(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"error",
				'Invariant "Seat In Order" of value object "Itinerary" constrains "Seat.row", which is neither an attribute of "Itinerary" nor one of a value "Itinerary" is made of; a value\'s rule holds by construction of that value and reaches only along what it composes',
				rule.ref,
			],
		]);
	});
});

describe("context-invariant-is-checked", () => {
	it("requires an operation of the context to check the rule", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		const root = agg.addRootEntity("Order", { description: "" });
		const customerId = root.addAttribute("Customer Id", { type: "uuid" });
		const place = agg.provides("Place", { description: "", type: "operation" });
		const placed = agg.provides("Placed", { description: "", type: "event" });
		bc.addInvariant("Guarded", { description: "" }).constrains(
			customerId,
			place,
		);
		// An event is not a guard: nothing can be refused after the fact.
		const byEvent = bc
			.addInvariant("Guarded By An Event", { description: "" })
			.constrains(customerId, placed);
		const unguarded = bc
			.addInvariant("Unguarded", { description: "" })
			.constrains(customerId);
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "context-invariant-is-checked")
				.map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"error",
				'Invariant "Guarded By An Event" of bounded context "BC" names no operation that checks it; a rule across the instances of a context is kept true only by an operation that checks it, before it acts or of what it answers with',
				byEvent.ref,
			],
			[
				"error",
				'Invariant "Unguarded" of bounded context "BC" names no operation that checks it; a rule across the instances of a context is kept true only by an operation that checks it, before it acts or of what it answers with',
				unguarded.ref,
			],
		]);
	});

	it("accepts an application service's operation as the guard", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		const root = agg.addRootEntity("Order", { description: "" });
		const customerId = root.addAttribute("Customer Id", { type: "uuid" });
		const app = bc.addService("Checkout", {
			description: "",
			type: "application",
		});
		const submit = app.provides("Submit", {
			description: "",
			type: "operation",
		});
		bc.addInvariant("One Open Order", { description: "" }).constrains(
			customerId,
			submit,
		);
		expect(
			ws.validate().filter((d) => d.rule === "context-invariant-is-checked"),
		).toEqual([]);
	});

	/** A context rule with a guard, so only the flag is ever in question. */
	function counted(
		flags: { precondition?: boolean; postcondition?: boolean } = {},
	) {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Payment", { description: "" });
		const root = agg.addRootEntity("Payment", { description: "" });
		const amount = root.addAttribute("Amount", { type: "Money" });
		const app = bc.addService("Payments", {
			description: "",
			type: "application",
		});
		const initiate = app.provides("Initiate Payment", {
			description: "",
			type: "operation",
		});
		const limit = bc
			.addInvariant("Daily Limit", { description: "", ...flags })
			.constrains(amount, initiate);
		return { ws, limit };
	}

	const fired = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "context-invariant-is-checked")
			.map((d) => [d.severity, d.message, d.ref]);

	it("accepts a context rule that claims neither flag", () => {
		expect(fired(counted().ws)).toEqual([]);
	});

	// Both flags say which side of the call the check falls on, and a context
	// with no aggregate — a quotation service that stores nothing — has nowhere
	// else to state the contract of its own operation (card 103).
	it("accepts a precondition on one", () => {
		expect(fired(counted({ precondition: true }).ws)).toEqual([]);
	});

	it("accepts a postcondition on one", () => {
		expect(fired(counted({ postcondition: true }).ws)).toEqual([]);
	});

	// The flagged rule with no guard is reported once, by the rule that asks
	// for the flag's own operation, and not twice.
	it("leaves a flagged rule with no guard to precondition-names-operation", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Payment", { description: "" });
		const root = agg.addRootEntity("Payment", { description: "" });
		const amount = root.addAttribute("Amount", { type: "Money" });
		bc.addInvariant("Daily Limit", {
			description: "",
			precondition: true,
		}).constrains(amount);
		expect(fired(ws)).toEqual([]);
		expect(
			ws.validate().filter((d) => d.rule === "precondition-names-operation"),
		).toHaveLength(1);
	});

	it("says nothing about an aggregate's rule", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Account", { description: "" });
		agg.addRootEntity("Account", { description: "" });
		const withdraw = agg.provides("Withdraw", {
			description: "",
			type: "operation",
		});
		agg
			.addInvariant("Within Balance", { description: "", precondition: true })
			.constrains(withdraw);
		agg.addInvariant("Unguarded", { description: "" });
		expect(fired(ws)).toEqual([]);
	});
});

describe("a context with no aggregate states the contract of its operation", () => {
	/**
	 * The review's freight quotation service: it stores nothing, so it has no
	 * aggregate to hold either half of its operation's contract, and the two
	 * rules live on the context. "Weight must be positive" is checked before
	 * Request Quote runs; "the quote respects the tariff" is checked of what it
	 * comes back with (decisions 19 and 27, card 103).
	 */
	function quotationService() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Freight Quotation", { description: "" });
		const request = bc.addSchema("Quote Request", { description: "" });
		const weight = request.addAttribute("weightKg", { type: "decimal" });
		const quote = bc.addSchema("Quote", { description: "" });
		const price = quote.addAttribute("price", { type: "decimal" });
		const quoting = bc.addService("Quoting", {
			description: "",
			type: "application",
		});
		const requestQuote = quoting.provides("Request Quote", {
			description: "",
			type: "operation",
			schema: request,
			returns: quote,
		});
		return { ws, bc, weight, price, requestQuote };
	}

	/** Only the errors: the context serves no subdomain, which is a warning. */
	const errorsOf = (ws: Workspace) =>
		ws.validate().filter((d) => d.severity === "error");

	it("takes a precondition and a postcondition on the context's own rules", () => {
		const { ws, bc, weight, price, requestQuote } = quotationService();
		bc.addInvariant("Weight Is Positive", {
			description: "",
			precondition: true,
		}).constrains(requestQuote, weight);
		bc.addInvariant("Quote Respects The Tariff", {
			description: "",
			postcondition: true,
		}).constrains(requestQuote, price);
		expect(errorsOf(ws)).toEqual([]);
	});

	// The postcondition relates the answer to the request, which is the
	// example decision 19's own amendment gives.
	it("lets the postcondition name the request beside the answer", () => {
		const { ws, bc, weight, price, requestQuote } = quotationService();
		bc.addInvariant("Priced By Weight", {
			description: "",
			postcondition: true,
		}).constrains(requestQuote, price, weight);
		expect(errorsOf(ws)).toEqual([]);
	});
});

describe("precondition-names-operation", () => {
	/** An aggregate with one operation, for a rule to guard or fail to. */
	function guardable() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Ledger", { description: "" });
		const root = agg.addRootEntity("Entry", { description: "" });
		const post = agg.provides("Post Entry", {
			description: "",
			type: "operation",
		});
		return { ws, agg, root, post };
	}

	const fired = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "precondition-names-operation")
			.map((d) => [d.severity, d.message, d.ref]);

	it("refuses a precondition that names no operation", () => {
		const { ws, agg, root } = guardable();
		const loose = agg
			.addInvariant("Funds Available", {
				description: "",
				precondition: true,
			})
			.constrains(root);
		expect(fired(ws)).toEqual([
			[
				"error",
				'Invariant "Funds Available" is marked a precondition but names no operation; a precondition is checked before something runs, so say what',
				loose.ref,
			],
		]);
	});

	it("accepts one that names the operation it guards", () => {
		const { ws, agg, root, post } = guardable();
		agg
			.addInvariant("Funds Available", { description: "", precondition: true })
			.constrains(root, post);
		expect(fired(ws)).toEqual([]);
	});

	it("says nothing about a rule that names an operation and keeps holding", () => {
		// PostEntry must produce balanced postings and the postings stay
		// balanced: the operation is named for responsibility, not to weaken the
		// rule (decision 27, second amendment).
		const { ws, agg, root, post } = guardable();
		agg
			.addInvariant("Balanced Postings", { description: "" })
			.constrains(root, post);
		expect(fired(ws)).toEqual([]);
	});

	it("round-trips the flag", () => {
		const { ws, agg, root, post } = guardable();
		const precondition = agg
			.addInvariant("Funds Available", { description: "", precondition: true })
			.constrains(root, post);
		const plain = agg
			.addInvariant("Balanced Postings", { description: "" })
			.constrains(root, post);
		const rebuilt = Workspace.fromSchema(
			JSON.parse(JSON.stringify(ws.toSchema())),
		);
		expect(
			rebuilt.getInvariantByRefOrThrow(precondition.ref).precondition,
		).toBe(true);
		expect(rebuilt.getInvariantByRefOrThrow(plain.ref).precondition).toBe(
			false,
		);
		expect(rebuilt.toSchema()).toEqual(ws.toSchema());
	});
});

describe("attribute-one-shape", () => {
	it("refuses an attribute typed by a value object and a schema at once", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const money = bc.addValueObject("Money", { description: "" });
		const line = bc.addSchema("Order Line");
		const request = bc.addSchema("Order Request");
		// One shape each is fine, whichever of the two it is.
		request.addAttribute("Lines", { type: "OrderLine[]", schema: line });
		request.addAttribute("Total", { type: "Money", valueobject: money });
		const both = request.addAttribute("Both", {
			type: "Money",
			valueobject: money,
			schema: line,
		});
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "attribute-one-shape")
				.map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"error",
				'"Order Request" types attribute "Both" by both value object "Money" and schema "Order Line"; an attribute has one shape',
				both.ref,
			],
		]);
	});

	it("keeps a payload shape out of the model: only a schema's attribute names a schema", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const line = bc.addSchema("Order Line");
		const request = bc.addSchema("Order Request");
		// A schema nesting a schema is the whole point of decision 18.
		request.addAttribute("Lines", { type: "OrderLine[]", schema: line });
		const order = bc.addAggregate("Order", { description: "" });
		const root = order.addRootEntity("Order", { description: "" });
		root.addAttribute("Id", { type: "uuid", identity: true });
		const onEntity = root.addAttribute("Lines", {
			type: "OrderLine[]",
			schema: line,
		});
		const address = bc.addValueObject("Address", { description: "" });
		const onValueObject = address.addAttribute("Lines", {
			type: "OrderLine[]",
			schema: line,
		});
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "attribute-one-shape")
				.map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"error",
				'"Address" types attribute "Lines" by schema "Order Line", which is a payload shape at the context\'s boundary; an entity or value object names a value object instead',
				onValueObject.ref,
			],
			[
				"error",
				'"Order" types attribute "Lines" by schema "Order Line", which is a payload shape at the context\'s boundary; an entity or value object names a value object instead',
				onEntity.ref,
			],
		]);
	});
});

describe("attribute-relation-coherence", () => {
	/** An entity, a value object, and whatever the test decides to declare. */
	function pair() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		const root = agg.addRootEntity("Order", { description: "" });
		root.addAttribute("Id", { type: "uuid", identity: true });
		const money = bc.addValueObject("Money", { description: "" });
		return { ws, bc, agg, root, money };
	}

	const coherenceRules = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "attribute-relation-coherence");

	it("is quiet when the attribute and the relation say the same thing", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Total", { type: "Money", valueobject: money });
		root.uses(money, "totalled in", "1");
		expect(coherenceRules(ws)).toEqual([]);
	});

	it("accepts a list attribute against a many-valued relation", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Instalments", { type: "Money[]", valueobject: money });
		root.uses(money, "paid in", "1..*");
		expect(coherenceRules(ws)).toEqual([]);
	});

	// The attribute alone is the whole statement: the map derives the line from
	// it, so nothing is missing and nothing is said (decision 16, note of
	// 2026-09-10; card 104).
	it("says nothing about an attribute no relation draws", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Total", { type: "Money", valueobject: money });
		expect(coherenceRules(ws)).toEqual([]);
	});

	it("warns about a relation with no attribute", () => {
		const { ws, bc, root, money } = pair();
		const size = bc.addValueObject("Size", { description: "" });
		root.addAttribute("Total", { type: "Money", valueobject: money });
		root.uses(size, "sized", "1");
		expect(coherenceRules(ws).map((d) => [d.severity, d.message])).toEqual([
			[
				"warning",
				'"Order" uses "Size" but no attribute of "Order" is typed by "Size", so the page says the relation exists and never shows where',
			],
		]);
	});

	it("warns when a list attribute has a single-valued relation", () => {
		const { ws, root, money } = pair();
		// Optional, so the only thing the two halves disagree about is number.
		root.addAttribute("Instalments", {
			type: "Money[]",
			valueobject: money,
			optional: true,
		});
		root.uses(money, "paid in", "0..1");
		expect(coherenceRules(ws).map((d) => d.message)).toEqual([
			'"Order" types attribute "Instalments" as a list ("Money[]") but its "uses" relation to "Money" has cardinality "0..1"; presence says whether the list is there and cardinality says how many it may hold, so a list pairs with "*" or "1..*"',
		]);
	});

	it("warns when an optional attribute that is not a list has anything but 0..1", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Total", {
			type: "Money",
			valueobject: money,
			optional: true,
		});
		root.uses(money, "totalled in", "1");
		expect(coherenceRules(ws).map((d) => d.message)).toEqual([
			'"Order" types attribute "Total" as optional but its "uses" relation to "Money" has cardinality "1"; an attribute that is optional and not a list pairs with "0..1"',
		]);
	});

	it("warns when a required attribute that is not a list has anything but 1", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Total", { type: "Money", valueobject: money });
		root.uses(money, "totalled in", "0..1");
		expect(coherenceRules(ws).map((d) => d.message)).toEqual([
			'"Order" types attribute "Total" as required but its "uses" relation to "Money" has cardinality "0..1"; an attribute that is required and not a list pairs with "1"',
		]);
	});

	// The four coherent pairings, in one workspace: presence says whether the
	// attribute is there and cardinality says how many it holds, so a list is
	// * or 1..* whether or not it is optional (card 89).
	it("accepts a required 1, an optional 0..1, and a list against * or 1..*", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Total", { type: "Money", valueobject: money });
		root.uses(money, "totalled in", "1", { for: "Total" });
		root.addAttribute("Deposit", {
			type: "Money",
			valueobject: money,
			optional: true,
		});
		root.uses(money, "paid down by", "0..1", { for: "Deposit" });
		root.addAttribute("Instalments", { type: "Money[]", valueobject: money });
		root.uses(money, "paid in", "*", { for: "Instalments" });
		root.addAttribute("Fees", {
			type: "Money[]",
			valueobject: money,
			optional: true,
		});
		root.uses(money, "charged", "1..*", { for: "Fees" });
		expect(coherenceRules(ws)).toEqual([]);
	});

	// Swagger's photoUrls: required, with no minimum. Presence is not size, so
	// a required list against * is coherent and the author is not pushed into
	// promising at least one.
	it("accepts a required list against *", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Instalments", { type: "Money[]", valueobject: money });
		root.uses(money, "paid in", "*");
		expect(coherenceRules(ws)).toEqual([]);
	});

	it("accepts an optional list against 1..*, which says the list is sometimes absent and never empty", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Instalments", {
			type: "Money[]",
			valueobject: money,
			optional: true,
		});
		root.uses(money, "paid in", "1..*");
		expect(coherenceRules(ws)).toEqual([]);
	});

	// Codex's case: a customer's current address and its address history are
	// both Addresses, and the two halves are paired by "for" while each label
	// stays the phrase the relation map draws.
	it("matches an attribute to its relation by for when one value object is used twice", () => {
		const { ws, root, money } = pair();
		root.addAttribute("currentAddress", { type: "Money", valueobject: money });
		root.addAttribute("addressHistory", {
			type: "Money[]",
			valueobject: money,
			optional: true,
		});
		root.uses(money, "lives at", "1", { for: "currentAddress" });
		root.uses(money, "has lived at", "*", { for: "addressHistory" });
		expect(coherenceRules(ws)).toEqual([]);
	});

	it("reads the cardinality of the relation for names, not the first one it finds", () => {
		const { ws, root, money } = pair();
		root.addAttribute("currentAddress", { type: "Money", valueobject: money });
		root.addAttribute("addressHistory", {
			type: "Money[]",
			valueobject: money,
			optional: true,
		});
		root.uses(money, "lives at", "1", { for: "currentAddress" });
		root.uses(money, "has lived at", "0..1", { for: "addressHistory" });
		expect(coherenceRules(ws).map((d) => d.message)).toEqual([
			'"Order" types attribute "addressHistory" as a list ("Money[]") but its "uses" relation to "Money" has cardinality "0..1"; presence says whether the list is there and cardinality says how many it may hold, so a list pairs with "*" or "1..*"',
		]);
	});

	it("does not pair by label: a phrase that happens to spell an attribute is still ambiguous", () => {
		const { ws, root, money } = pair();
		root.addAttribute("currentAddress", { type: "Money", valueobject: money });
		root.addAttribute("addressHistory", {
			type: "Money[]",
			valueobject: money,
			optional: true,
		});
		root.uses(money, "currentAddress", "1");
		root.uses(money, "addressHistory", "*");
		expect(coherenceRules(ws).map((d) => d.message)).toEqual([
			'"Order" types attribute "currentAddress" by value object "Money", and 2 "uses" relations point at "Money" with none of them declaring `for: "currentAddress"`; where one value object is used twice each relation names the attribute it draws',
			'"Order" types attribute "addressHistory" by value object "Money", and 2 "uses" relations point at "Money" with none of them declaring `for: "addressHistory"`; where one value object is used twice each relation names the attribute it draws',
			'"Order" uses "Money" 2 times and this relation draws no named attribute, which is no attribute of "Order" typed by "Money"; where one value object is used twice each relation names the attribute it draws with `for`',
			'"Order" uses "Money" 2 times and this relation draws no named attribute, which is no attribute of "Order" typed by "Money"; where one value object is used twice each relation names the attribute it draws with `for`',
		]);
	});

	it("reports an attribute that no for picks out among several relations, and the relation with it", () => {
		const { ws, root, money } = pair();
		root.addAttribute("currentAddress", { type: "Money", valueobject: money });
		root.addAttribute("addressHistory", {
			type: "Money[]",
			valueobject: money,
			optional: true,
		});
		root.uses(money, "lives at", "1", { for: "currentAddress" });
		root.uses(money, "lived at", "*");
		expect(coherenceRules(ws).map((d) => d.message)).toEqual([
			'"Order" types attribute "addressHistory" by value object "Money", and 2 "uses" relations point at "Money" with none of them declaring `for: "addressHistory"`; where one value object is used twice each relation names the attribute it draws',
			'"Order" uses "Money" 2 times and this relation draws no named attribute, which is no attribute of "Order" typed by "Money"; where one value object is used twice each relation names the attribute it draws with `for`',
		]);
	});

	it("reports a for that names an attribute typed by something else", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Total", { type: "Money", valueobject: money });
		root.addAttribute("Reference", { type: "string" });
		root.uses(money, "totalled in", "1", { for: "Reference" });
		// The only relation to Money still pairs with the only attribute typed
		// by it, so the attribute half is quiet; the relation half says the
		// name it was given is not one of them.
		expect(coherenceRules(ws).map((d) => d.message)).toEqual([
			'"Order" uses "Money" 1 time and this relation draws `for: "Reference"`, which is no attribute of "Order" typed by "Money"; where one value object is used twice each relation names the attribute it draws with `for`',
		]);
	});

	// Decision 15: a type is free text, so the validator never asks it to spell
	// the value object's name. The trailing [] the cardinality check reads is
	// the one convention that survives.
	it("says nothing about a type that does not name the value object", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Total", { type: "decimal", valueobject: money });
		root.uses(money, "totalled in", "1");
		expect(coherenceRules(ws)).toEqual([]);
	});

	it("still reads a trailing [] on a free-text type as many", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Instalments", { type: "decimal[]", valueobject: money });
		root.uses(money, "paid in", "1");
		expect(coherenceRules(ws).map((d) => d.message)).toEqual([
			'"Order" types attribute "Instalments" as a list ("decimal[]") but its "uses" relation to "Money" has cardinality "1"; presence says whether the list is there and cardinality says how many it may hold, so a list pairs with "*" or "1..*"',
		]);
	});
});

describe("specialisation", () => {
	/** An aggregate whose root has one kind, and a value object to hang off. */
	function accounts() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Account", { description: "" });
		const account = agg.addRootEntity("Account", { description: "" });
		account.addAttribute("Id", { type: "uuid", identity: true });
		const money = bc.addValueObject("Money", { description: "" });
		money.addAttribute("Amount", { type: "int64" });
		const loan = agg.addEntity("Loan Account", {
			description: "",
			specialises: account,
		});
		return { ws, bc, agg, account, loan, money };
	}

	const specialisationRules = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule.startsWith("specialisation-"));

	it("is quiet on a kind of the root: it is identified by, and reached through, what it is a kind of", () => {
		const { ws, loan } = accounts();
		loan.addAttribute("Term", { type: "months" });
		// No entity-identity warning (the identity is inherited) and no
		// aggregate-tree orphan warning (a kind is reached where its parent is).
		expect(
			ws.validate().filter((d) => d.rule !== "context-serves-subdomain"),
		).toEqual([]);
	});

	it("refuses an entity that is a kind of one in another aggregate", () => {
		const { ws, bc, account } = accounts();
		const other = bc.addAggregate("Card", { description: "" });
		const card = other.addRootEntity("Card", { description: "" });
		card.addAttribute("Id", { type: "uuid", identity: true });
		const stretched = other.addEntity("Stretched", {
			description: "",
			specialises: account,
		});
		card.includes(stretched, "holds");
		expect(
			specialisationRules(ws).map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"error",
				'"Stretched" in aggregate "Card" is a kind of "Account", which is not an entity of that aggregate; an entity is a kind of an entity of its own aggregate, since both are saved through the same root',
				stretched.ref,
			],
		]);
	});

	it("lets a value object be a kind of one borrowed through a shared kernel, and refuses one without", () => {
		const { ws, bc, money } = accounts();
		const kernel = ws.addBoundedContext("Kernel", { description: "" });
		const shared = kernel.addValueObject("Amount", { description: "" });
		const borrowed = bc.addValueObject("Fee", {
			description: "",
			specialises: shared,
		});
		expect(specialisationRules(ws).map((d) => d.ref)).toEqual([borrowed.ref]);
		bc.sharesKernelWith(kernel);
		expect(specialisationRules(ws)).toEqual([]);
		// A kind of one its own context declares needs no relationship at all.
		bc.addValueObject("Discount", { description: "", specialises: money });
		expect(specialisationRules(ws)).toEqual([]);
	});

	it("refuses a chain of kinds that returns to where it started", () => {
		const { ws, agg, account } = accounts();
		const ring = agg.addEntity("Ring", {
			description: "",
			specialises: account,
		});
		account.specialises = ring;
		// The root being a kind of anything is `specialisation-not-root`'s to
		// report as well; this test is about the ring.
		expect(
			specialisationRules(ws)
				.filter((d) => d.rule === "specialisation-cycle")
				.map((d) => [d.message, d.ref]),
		).toEqual([
			[
				'"Account" is a kind of "Ring" is a kind of "Account"; a chain of kinds ends at the thing every one of them is, so nothing is a kind of itself',
				account.ref,
			],
		]);
	});

	it("refuses a kind that is also marked the aggregate's root", () => {
		const { ws, loan } = accounts();
		loan.root = true;
		expect(
			specialisationRules(ws).map((d) => [d.rule, d.message, d.ref]),
		).toEqual([
			[
				"specialisation-not-root",
				'"Loan Account" is a kind of "Account" and is also marked the root of aggregate "Account"; an aggregate has one root, and a kind of it is reached through that root',
				loan.ref,
			],
		]);
	});

	it("refuses a kind that redeclares an attribute it already has, naming where it came from", () => {
		const { ws, loan } = accounts();
		const repeated = loan.addAttribute("Id", { type: "uuid" });
		expect(
			specialisationRules(ws).map((d) => [d.rule, d.message, d.ref]),
		).toEqual([
			[
				"specialisation-redeclares",
				'"Loan Account" declares attribute "Id", which it already has from "Account"; a kind adds to what it is a kind of and never restates it, or a reader cannot tell which of the two applies',
				repeated.ref,
			],
		]);
	});

	it("lets another aggregate reference a kind of a root, but not a plain child", () => {
		const { ws, bc, loan, agg } = accounts();
		const child = agg.addEntity("Statement", { description: "" });
		child.addAttribute("Id", { type: "uuid", identity: true });
		const caller = bc.addAggregate("Arrears", { description: "" });
		const arrears = caller.addRootEntity("Arrears", { description: "" });
		arrears.addAttribute("Id", { type: "uuid", identity: true });
		arrears.references(loan, "against");
		expect(
			ws.validate().filter((d) => d.rule === "cross-aggregate-reference"),
		).toEqual([]);
		arrears.references(child, "and this");
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "cross-aggregate-reference")
				.map((d) => d.message),
		).toEqual([
			'"Arrears" references "Statement", which is neither the root of aggregate "Account" nor a kind of that root; reference "Account" by its root\'s identity, holding "Statement"\'s id beside it when the child is what you mean',
		]);
	});

	it("reads an inherited relation and an inherited attribute as the kind's own", () => {
		const { ws, account, loan, money } = accounts();
		account.addAttribute("Balance", { type: "Money", valueobject: money });
		account.uses(money, "balanced at", "1", { for: "Balance" });
		// The kind adds an attribute typed by a value object its parent already
		// uses, and a relation to one its parent's attribute already names. The
		// kind holds two of each in all, so each relation names the attribute
		// it draws.
		loan.addAttribute("Arrears", { type: "Money", valueobject: money });
		loan.uses(money, "in arrears of", "1", { for: "Arrears" });
		expect(
			ws.validate().filter((d) => d.rule === "attribute-relation-coherence"),
		).toEqual([]);
	});
});

describe("consumption-agreement", () => {
	/**
	 * One warehouse upstream of one shop under two agreements — a negotiated
	 * API and a tolerated legacy feed — with one exchange under each. The
	 * shop's two fronts are the callers, so nothing else is warned about.
	 */
	function twoAgreements() {
		const ws = emptyWorkspace();
		const selling = ws
			.addDomain("Retail", { description: "" })
			.addSubdomain("Selling", { description: "", type: "core" });
		const up = ws.addBoundedContext("Warehouse", {
			description: "",
			subdomains: [selling],
		});
		const down = ws.addBoundedContext("Shop", {
			description: "",
			subdomains: [selling],
		});
		const negotiated = up.upstreamOf(down, {
			name: "Fulfilment API",
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["conformist"],
		});
		const tolerated = up.upstreamOf(down, {
			name: "Legacy Feed",
			upstreamRoles: ["published-language"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		const warehouse = up.addService("Warehouse API", {
			description: "",
			type: "application",
		});
		const reserve = warehouse.provides("Reserve Stock", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		const feed = warehouse.provides("Stock Level Posted", {
			description: "",
			type: "operation",
			pattern: "published-language",
			schema: up.addSchema("Stock Level"),
		});
		const shop = down.addService("Shop App", {
			description: "",
			type: "application",
		});
		const order = shop.provides("Place Order", {
			description: "",
			type: "operation",
		});
		const refresh = shop.provides("Refresh Stock", {
			description: "",
			type: "operation",
		});
		return { ws, negotiated, tolerated, shop, reserve, feed, order, refresh };
	}

	const agreement = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "consumption-agreement")
			.map((d) => [d.severity, d.message, d.ref]);

	const backed = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "relationship-roles-backed");

	it("validates clean when each exchange names the agreement it runs under", () => {
		const { ws, negotiated, tolerated, shop, reserve, feed, order, refresh } =
			twoAgreements();
		shop.consumes(reserve, {
			pattern: "conformist",
			by: [order],
			relationship: negotiated,
		});
		shop.consumes(feed, {
			pattern: "anti-corruption-layer",
			by: [refresh],
			relationship: tolerated,
		});
		expect(ws.validate()).toEqual([]);
	});

	it("warns once about an exchange that names neither, and nothing else does", () => {
		const { ws, tolerated, shop, reserve, feed, order, refresh } =
			twoAgreements();
		const unnamed = shop.consumes(reserve, {
			pattern: "conformist",
			by: [order],
		});
		shop.consumes(feed, {
			pattern: "anti-corruption-layer",
			by: [refresh],
			relationship: tolerated,
		});
		expect(agreement(ws)).toEqual([
			[
				"warning",
				'"Shop App" consumes "Reserve Stock" from "Warehouse" without saying which agreement it belongs to; the pair has 2 in that direction — "Fulfilment API", "Legacy Feed" — and their roles, comments and dispositions are different things',
				unnamed.ref,
			],
		]);
		// The crossing belongs to no agreement, so neither agreement is
		// criticised for it: the legacy feed is not told about a conformist
		// that is not its traffic, and the conformist is not reported as a
		// role no relationship declares. What the negotiated API is told is
		// that its own two roles now have nothing behind them, which is true
		// until the crossing says it belongs to them.
		expect(backed(ws).map((d) => d.message)).toEqual([
			'"Warehouse" is declared open-host-service to "Shop", but nothing "Shop" consumes from "Warehouse" carries that upstream role',
			'"Shop" is declared conformist to "Warehouse", but no consumption of "Shop" from "Warehouse" declares that downstream role, and nothing in it carries one of "Warehouse"\'s schemas or value objects',
		]);
	});

	it("warns about an exchange naming an agreement that joins other contexts", () => {
		const { ws, shop, reserve, order } = twoAgreements();
		const other = ws.addBoundedContext("Payments", { description: "" });
		const wrong = other.upstreamOf(
			ws.getBoundedContextByRefOrThrow("#/boundedcontexts/shop"),
			{ name: "Settlement" },
		);
		const named = shop.consumes(reserve, {
			pattern: "conformist",
			by: [order],
			relationship: wrong,
		});
		expect(agreement(ws)).toEqual([
			[
				"warning",
				'"Shop App" says its consumption of "Reserve Stock" belongs to the agreement "Settlement" between "Payments" and "Shop", which does not join "Warehouse" and "Shop"; an exchange belongs to an agreement between the two contexts it crosses',
				named.ref,
			],
		]);
	});

	/**
	 * The inbound integration decision 03's 2026-09-09 amendment is about: the
	 * caller dictates the format and the provider translates it, so the caller
	 * is the upstream and the one agreement the exchange runs under points
	 * against the traffic. Naming it is right, not a mistake.
	 */
	it("accepts an agreement pointing the other way, where the caller is upstream", () => {
		const ws = emptyWorkspace();
		const banking = ws
			.addDomain("Banking", { description: "" })
			.addSubdomain("Payments", { description: "", type: "core" });
		const processor = ws.addBoundedContext("Card Processor", {
			description: "",
			subdomains: [banking],
		});
		const bank = ws.addBoundedContext("Bank", {
			description: "",
			subdomains: [banking],
		});
		// The processor's own message format, on the operation it reaches.
		const message = processor.addSchema("Scheme Message");
		message.addAttribute("messageType", { type: "string" });
		const settle = bank
			.addService("Bank API", { description: "", type: "application" })
			.provides("Settle", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
				schema: message,
			});
		const dictated = processor.upstreamOf(bank, {
			name: "Scheme Rules",
			upstreamRoles: ["published-language"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		const processorApp = processor.addService("Processor", {
			description: "",
			type: "application",
		});
		// Something in the processor makes the call: a consumer that provides no
		// operation has nothing that could, which `consumption-by-required`
		// reports. One operation is its own `by`, so none is written here.
		processorApp.provides("Present Settlement", {
			description: "",
			type: "operation",
			internal: true,
		});
		processorApp.consumes(settle, {
			pattern: "anti-corruption-layer",
			relationship: dictated,
		});
		expect(agreement(ws)).toEqual([]);
		expect(ws.validate()).toEqual([]);
	});

	it("asks nothing of a pair with one agreement, named or not", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Warehouse", { description: "" });
		const down = ws.addBoundedContext("Shop", { description: "" });
		up.upstreamOf(down, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["conformist"],
		});
		const reserve = up
			.addService("Warehouse API", { description: "", type: "application" })
			.provides("Reserve Stock", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			});
		down
			.addService("Shop App", { description: "", type: "application" })
			.consumes(reserve, { pattern: "conformist" });
		expect(agreement(ws)).toEqual([]);
	});

	it("says nothing about a consumption inside one context", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Shop", { description: "" });
		const app = bc.addService("Shop App", {
			description: "",
			type: "application",
		});
		const inner = app.provides("Inner", {
			description: "",
			type: "operation",
			internal: true,
		});
		app.consumes(inner, {});
		expect(agreement(ws)).toEqual([]);
	});
});

describe("relationship-roles-backed", () => {
	/** Upstream and downstream contexts, one consumable, one consumption. */
	function crossing(
		consumablePattern: "open-host-service" | "published-language" | undefined,
		consumptionPattern: "conformist" | "anti-corruption-layer" | undefined,
	) {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const op = up
			.addService("S", { description: "", type: "application" })
			.provides("Op", {
				description: "",
				type: "operation",
				pattern: consumablePattern,
			});
		const consumer = down.addService("T", {
			description: "",
			type: "application",
		});
		consumer.consumes(op, { pattern: consumptionPattern });
		return { ws, up, down, consumer };
	}

	const backedRules = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "relationship-roles-backed");

	it("is quiet when the traffic carries the roles the relationship claims", () => {
		const { ws, up, down } = crossing(
			"open-host-service",
			"anti-corruption-layer",
		);
		up.upstreamOf(down, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		expect(backedRules(ws)).toEqual([]);
	});

	it("warns about an upstream role nothing crossing carries", () => {
		const { ws, up, down } = crossing(undefined, "anti-corruption-layer");
		const relationship = up.upstreamOf(down, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		expect(backedRules(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"warning",
				'"Up" is declared published-language to "Down", but nothing "Down" consumes from "Up" carries that upstream role, and nothing in "Down" carries one of its schemas or value objects',
				relationship.ref,
			],
		]);
	});

	it("warns about a downstream role no consumption declares", () => {
		const { ws, up, down } = crossing("open-host-service", undefined);
		const relationship = up.upstreamOf(down, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		expect(backedRules(ws).map((d) => [d.message, d.ref])).toEqual([
			[
				'"Down" is declared anti-corruption-layer to "Up", but no consumption of "Down" from "Up" declares that downstream role, and nothing it offers "Up" is in "Up"\'s own shapes',
				relationship.ref,
			],
		]);
	});

	it("warns about a consumption whose role the relationship never declares", () => {
		const { ws, up, down, consumer } = crossing(
			"open-host-service",
			"conformist",
		);
		up.upstreamOf(down, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: [],
		});
		expect(backedRules(ws).map((d) => [d.message, d.ref])).toEqual([
			[
				'"T" consumes "Op" from "Up" as conformist, a downstream role the upstream-downstream relationship between "Up" and "Down" does not declare',
				consumer.ref,
			],
		]);
	});

	it("leaves symmetric relationships alone; they have no roles to back", () => {
		const { ws, up, down } = crossing(undefined, undefined);
		up.partnerOf(down);
		expect(backedRules(ws)).toEqual([]);
	});

	/**
	 * The standards-body shape: an external context publishing a message format
	 * and a context that carries it. Nothing is consumed — the exchange happens
	 * over a pipe the model does not draw — so the only evidence of conforming
	 * is the borrowed schema, and it is evidence enough for both this rule and
	 * `conformist-backed` (card 90).
	 */
	function conformsToStandard() {
		const ws = emptyWorkspace();
		const fhir = ws.addBoundedContext("FHIR", {
			description: "",
			external: true,
		});
		const care = ws
			.addDomain("Care", { description: "" })
			.addSubdomain("Records", { description: "", type: "core" });
		const clinical = ws.addBoundedContext("Clinical", {
			description: "",
			subdomains: [care],
		});
		const patient = fhir.addSchema("Patient");
		patient.addAttribute("identifier", { type: "string" });
		const relationship = fhir.upstreamOf(clinical, {
			downstreamRoles: ["conformist"],
		});
		return { ws, fhir, clinical, patient, relationship };
	}

	it("counts a conformist borrowing the upstream's schema, with nothing consumed", () => {
		const { ws, clinical, patient } = conformsToStandard();
		clinical
			.addService("Records", { description: "", type: "application" })
			.provides("Publish Encounter", {
				description: "",
				type: "operation",
				schema: patient,
			});
		expect(ws.validate()).toEqual([]);
	});

	it("counts a value object of the upstream typed onto the downstream's model", () => {
		const { ws, fhir, clinical } = conformsToStandard();
		const coding = fhir.addValueObject("Coding", { description: "" });
		coding.addAttribute("code", { type: "string" });
		const chart = clinical.addAggregate("Chart", { description: "" });
		const root = chart.addRootEntity("Chart", { description: "" });
		root.addAttribute("Id", { type: "uuid", identity: true });
		root.addAttribute("Diagnosis", { type: "Coding", valueobject: coding });
		expect(ws.validate()).toEqual([]);
	});

	it("counts the same borrowing as backing the upstream's published language", () => {
		// A standards body provides nothing to consume: the shapes a conformist
		// borrows are the whole of what it publishes (decision 28's amendment).
		const { ws, fhir, clinical, patient, relationship } = conformsToStandard();
		relationship.upstreamRoles = ["published-language"];
		clinical
			.addService("Records", { description: "", type: "application" })
			.provides("Publish Encounter", {
				description: "",
				type: "operation",
				schema: patient,
			});
		expect(fhir.external).toBe(true);
		expect(ws.validate()).toEqual([]);
	});

	it("still warns when the conformist borrows nothing and consumes nothing", () => {
		const { ws, relationship } = conformsToStandard();
		expect(backedRules(ws).map((d) => [d.message, d.ref])).toEqual([
			[
				'"Clinical" is declared conformist to "FHIR", but no consumption of "Clinical" from "FHIR" declares that downstream role, and nothing in it carries one of "FHIR"\'s schemas or value objects',
				relationship.ref,
			],
		]);
	});
});

describe("mud-needs-acl", () => {
	/** A legacy provider and one consumer, with the consumption's role to taste. */
	function fromLegacy(
		pattern: "conformist" | "anti-corruption-layer" | undefined,
		bigBallOfMud = true,
	) {
		const ws = emptyWorkspace();
		const legacy = ws.addBoundedContext("Legacy", {
			description: "",
			bigBallOfMud,
		});
		const modern = ws.addBoundedContext("Modern", { description: "" });
		const op = legacy
			.addService("S", { description: "", type: "application" })
			.provides("Get Customer", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			});
		const consumer = modern.addService("T", {
			description: "",
			type: "application",
		});
		const consumption = consumer.consumes(op, { pattern });
		return { ws, consumption };
	}

	const mudRules = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "mud-needs-acl");

	it("accepts an anti-corruption layer over the mud", () => {
		expect(mudRules(fromLegacy("anti-corruption-layer").ws)).toEqual([]);
	});

	it("says nothing about a context that is not a big ball of mud", () => {
		expect(mudRules(fromLegacy("conformist", false).ws)).toEqual([]);
	});

	it("warns about a conformist consumption of the mud", () => {
		const { ws, consumption } = fromLegacy("conformist");
		expect(mudRules(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"warning",
				'"Modern" consumes "Get Customer" from "Legacy" as a conformist, and "Legacy" is a big ball of mud; translate it behind an anti-corruption layer so its model stays out of "Modern"',
				consumption.ref,
			],
		]);
	});

	it("warns about a consumption of the mud with no role at all", () => {
		const { ws } = fromLegacy(undefined);
		expect(mudRules(ws).map((d) => d.message)).toEqual([
			'"Modern" consumes "Get Customer" from "Legacy" without declaring a downstream role, and "Legacy" is a big ball of mud; translate it behind an anti-corruption layer so its model stays out of "Modern"',
		]);
	});

	/**
	 * A legacy context, a modern one, and an entity here holding the legacy
	 * system's key, with no consumption of the mud at all. A held key is not
	 * traffic (decision 28, amended; card 108).
	 */
	function holdsLegacyKey(bigBallOfMud = true) {
		const ws = emptyWorkspace();
		const legacy = ws.addBoundedContext("Legacy", {
			description: "",
			bigBallOfMud,
		});
		const modern = ws.addBoundedContext("Modern", { description: "" });
		const customer = legacy
			.addAggregate("Customer", { description: "" })
			.addRootEntity("Customer", { description: "" });
		customer.addAttribute("Id", { type: "string", identity: true });
		const account = modern
			.addAggregate("Account", { description: "" })
			.addRootEntity("Account", { description: "" });
		account.addAttribute("Id", { type: "uuid", identity: true });
		const key = account.addAttribute("Legacy Customer Key", {
			type: "string",
			identifies: customer,
		});
		return { ws, legacy, modern, key };
	}

	it("says nothing about a held identity into a mud context with no traffic", () => {
		const { ws } = holdsLegacyKey();
		expect(mudRules(ws)).toEqual([]);
	});

	it("says nothing about the same identity into a context that is not mud", () => {
		expect(mudRules(holdsLegacyKey(false).ws)).toEqual([]);
	});

	it("still warns about an untranslated consumption even where a third context merely holds the mud's key", () => {
		const { ws, legacy, modern } = holdsLegacyKey();
		const op = legacy
			.addService("S", { description: "", type: "application" })
			.provides("Get Customer", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			});
		const consumption = modern
			.addService("T", { description: "", type: "application" })
			.consumes(op, { pattern: "conformist" });
		expect(mudRules(ws).map((d) => [d.severity, d.rule, d.ref])).toEqual([
			["warning", "mud-needs-acl", consumption.ref],
		]);
	});
});

describe("role-coherence and symmetric relationships", () => {
	/** Two contexts exchanging one consumable with no roles on either end. */
	function bareExchange() {
		const ws = emptyWorkspace();
		const one = ws.addBoundedContext("One", { description: "" });
		const two = ws.addBoundedContext("Two", { description: "" });
		const op = one
			.addService("S", { description: "", type: "application" })
			.provides("Op", { description: "", type: "operation" });
		two
			.addService("T", { description: "", type: "application" })
			.consumes(op, {});
		return { ws, one, two };
	}

	it("still warns when the two contexts are not partners", () => {
		const { ws } = bareExchange();
		expect(
			ws.validate().filter((d) => d.rule === "role-coherence"),
		).toHaveLength(2);
	});

	it("goes quiet between partners", () => {
		const { ws, one, two } = bareExchange();
		one.partnerOf(two);
		expect(ws.validate().filter((d) => d.rule === "role-coherence")).toEqual(
			[],
		);
	});

	it("goes quiet between contexts sharing a kernel", () => {
		const { ws, one, two } = bareExchange();
		one.sharesKernelWith(two);
		expect(ws.validate().filter((d) => d.rule === "role-coherence")).toEqual(
			[],
		);
	});

	it("keeps warning when the two contexts went separate ways", () => {
		const { ws, one, two } = bareExchange();
		one.separateWaysFrom(two);
		expect(
			ws.validate().filter((d) => d.rule === "role-coherence"),
		).toHaveLength(2);
	});

	it("asks the provider for the upstream role when the provider is upstream", () => {
		const { ws, one, two } = bareExchange();
		one.upstreamOf(two, {});
		expect(
			ws.validate().filter((d) => d.rule === "role-coherence"),
		).toHaveLength(2);
	});

	// The caller dictates the format and the provider translates behind its own
	// boundary: a consumable carries only an upstream role and a consumption
	// only a downstream one, so neither field is where either role belongs, and
	// the relationship is what carries them (decision 03, 2026-09-09; card 99).
	it("asks neither end when the consumer is the declared upstream", () => {
		const { ws, one, two } = bareExchange();
		two.upstreamOf(one, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		expect(ws.validate().filter((d) => d.rule === "role-coherence")).toEqual(
			[],
		);
	});

	/** The customer-supplier pair, with the supplier providing the operation. */
	function negotiated(options: DirectedRelationshipOptions = {}) {
		const { ws, one, two } = bareExchange();
		const relationship = one.upstreamOf(two, {
			type: "customer-supplier",
			...options,
		});
		const consumption = two.services.get("t")?.consumptions[0];
		if (!consumption) throw new Error("no consumption");
		return { ws, one, two, relationship, consumption };
	}

	// A customer negotiates the interface it uses, so neither downstream word
	// is true of it: a conformist is the downstream with no say, which is the
	// opposite, and an anti-corruption layer is a translation the negotiation
	// saves it from. The type is the answer (decision 03, amendment of
	// 2026-09-10; card 128).
	it("asks a customer-supplier downstream for no role", () => {
		const { ws } = negotiated();
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "role-coherence")
				.map((d) => d.message),
		).toEqual([
			'"Op" is consumed from another context but declares no upstream role (open-host-service or published-language)',
		]);
	});

	// The upstream end is untouched: the supplier still says how it offers
	// what it offers, and only that warning is left once the consumption
	// carries a role of its own.
	it("still asks the supplier for its upstream role", () => {
		const { ws, consumption } = negotiated();
		consumption.pattern = "anti-corruption-layer";
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "role-coherence")
				.map((d) => d.message),
		).toEqual([
			'"Op" is consumed from another context but declares no upstream role (open-host-service or published-language)',
		]);
	});

	// A role written on such a consumption is not ignored: the rule asks for
	// none, and every rule that reads a downstream role reads this one. The
	// pair declares an anti-corruption layer, and it is the consumption that
	// backs it or leaves it unbacked.
	it("still reads a downstream role written there", () => {
		const backed = negotiated({ downstreamRoles: ["anti-corruption-layer"] });
		backed.consumption.pattern = "anti-corruption-layer";
		expect(
			backed.ws
				.validate()
				.filter((d) => d.rule === "relationship-roles-backed"),
		).toEqual([]);
		const unbacked = negotiated({ downstreamRoles: ["anti-corruption-layer"] });
		expect(
			unbacked.ws
				.validate()
				.filter((d) => d.rule === "relationship-roles-backed")
				.map((d) => d.message),
		).toEqual([expect.stringContaining("anti-corruption-layer")]);
	});

	// An ordinary upstream-downstream pair is still asked, which is what tells
	// the two types apart here.
	it("still asks a plain upstream-downstream downstream", () => {
		const { ws, one, two } = bareExchange();
		one.upstreamOf(two, {});
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "role-coherence")
				.map((d) => d.message),
		).toEqual([
			'"Op" is consumed from another context but declares no upstream role (open-host-service or published-language)',
			'"T" consumes "Op" from another context without a downstream role (conformist or anti-corruption-layer)',
		]);
	});
});

describe("postcondition-names-operation", () => {
	/** One operation, one answer shape, and an aggregate to hang rules on. */
	function answering() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Travel", { description: "" });
		const agg = bc.addAggregate("Itinerary", { description: "" });
		agg.addRootEntity("Itinerary", { description: "" });
		const answer = bc.addSchema("Itinerary", { description: "" });
		const arrives = answer.addAttribute("arrivesAt", { type: "date" });
		const plan = bc
			.addService("Planning", { description: "", type: "application" })
			.provides("Plan Trip", {
				description: "",
				type: "operation",
				returns: answer,
			});
		return { ws, agg, plan, arrives };
	}

	const postconditions = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "postcondition-names-operation")
			.map((d) => [d.message, d.ref]);

	it("takes a postcondition that names the call it is a guarantee about", () => {
		const { ws, agg, plan, arrives } = answering();
		agg
			.addInvariant("Meets The Requested Deadline", {
				description: "",
				postcondition: true,
			})
			.constrains(plan, arrives);
		expect(postconditions(ws)).toEqual([]);
	});

	it("refuses a postcondition that names no operation", () => {
		const { ws, agg } = answering();
		const nowhere = agg.addInvariant("Guaranteed Of Nothing", {
			description: "",
			postcondition: true,
		});
		expect(postconditions(ws)).toEqual([
			[
				'Invariant "Guaranteed Of Nothing" is marked a postcondition but names no operation; a postcondition is a guarantee about what a call answers with, so say which call',
				nowhere.ref,
			],
		]);
	});

	it("refuses a rule marked both a precondition and a postcondition", () => {
		const { ws, agg, plan } = answering();
		const both = agg
			.addInvariant("Two Moments At Once", {
				description: "",
				precondition: true,
				postcondition: true,
			})
			.constrains(plan);
		expect(postconditions(ws)).toEqual([
			[
				'Invariant "Two Moments At Once" is marked both a precondition and a postcondition; a rule is checked before a call or guaranteed of what comes back, and one that is both says two things about when it holds',
				both.ref,
			],
		]);
	});
});

describe("term-in-context", () => {
	it("keeps a term's embodiment inside the term's own context", () => {
		const ws = emptyWorkspace();
		const sales = ws.addBoundedContext("Sales", { description: "" });
		const catalog = ws.addBoundedContext("Catalog", { description: "" });
		const orderAgg = sales.addAggregate("Order", { description: "" });
		orderAgg
			.addRootEntity("Order", { description: "" })
			.addAttribute("Id", { type: "uuid", identity: true });
		const petAgg = catalog.addAggregate("Pet", { description: "" });
		const pet = petAgg.addRootEntity("Pet", { description: "" });
		pet.addAttribute("Id", { type: "uuid", identity: true });
		// Local embodiments, and a term with none at all, are fine.
		sales.addTerm("Order", { definition: "", embodiedBy: orderAgg });
		sales.addTerm("Basket", { definition: "" });
		const foreign = sales.addTerm("Pet", { definition: "", embodiedBy: pet });
		const rules = ws.validate().filter((d) => d.rule === "term-in-context");
		expect(rules).toEqual([
			{
				severity: "error",
				rule: "term-in-context",
				message:
					'Glossary term "Pet" of "Sales" is embodied by "Pet", which is not part of "Sales"; a term belongs to the language of one context, and the same word means something else next door',
				ref: foreign.ref,
			},
		]);
	});
});

describe("separate-ways and policies", () => {
	/** Two contexts, one event, and a policy in the other reacting to it. */
	function subscription() {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const evt = up
			.addService("S", { description: "", type: "application" })
			.provides("Happened", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
		const op = down
			.addService("T", { description: "", type: "application" })
			.provides("React", { description: "", type: "operation" });
		const policy = down.addPolicy("On Happened", { description: "" });
		policy.on(evt).issues(op);
		return { ws, up, down, policy };
	}

	it("says nothing while the contexts have not declared separate ways", () => {
		const { ws } = subscription();
		expect(ws.validate().filter((d) => d.rule === "separate-ways")).toEqual([]);
	});

	it("flags a policy subscribed to a context it went separate ways from", () => {
		const { ws, up, down, policy } = subscription();
		up.separateWaysFrom(down);
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "separate-ways")
				.map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"error",
				'Policy "On Happened" in "Down" reacts to "Happened" from "Up" although the contexts declare separate ways',
				policy.ref,
			],
		]);
	});
});

// Separate ways rules out every crossing the model records, not only the
// consumption: an identity is a dependency on the other context's identity
// scheme, and a borrowed value object is its language in this context. Both
// used to be reported as a missing relationship, which was false — there is
// one, and it says these two do not integrate (card 100).
describe("separate-ways and what a context holds of another's", () => {
	const apart = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "separate-ways")
			.map((d) => [d.severity, d.message, d.ref]);

	/** Two contexts, each with one aggregate, and nothing between them yet. */
	function pair() {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const thing = up
			.addAggregate("Thing", { description: "" })
			.addRootEntity("Thing", { description: "" });
		thing.addAttribute("Id", { type: "uuid", identity: true });
		const holder = down
			.addAggregate("Holder", { description: "" })
			.addRootEntity("Holder", { description: "" });
		holder.addAttribute("Id", { type: "uuid", identity: true });
		return { ws, up, down, thing, holder };
	}

	it("flags an identity naming a context it went separate ways from", () => {
		const { ws, up, down, thing, holder } = pair();
		const thingId = holder.addAttribute("Thing Id", {
			type: "uuid",
			identifies: thing,
		});
		up.separateWaysFrom(down);
		expect(apart(ws)).toEqual([
			[
				"error",
				'"Down" holds "Thing Id", the identity of "Thing" in "Up", although the contexts declare separate ways',
				thingId.ref,
			],
		]);
	});

	it("says nothing about the same identity where they have not", () => {
		const { ws, thing, holder } = pair();
		holder.addAttribute("Thing Id", { type: "uuid", identifies: thing });
		expect(apart(ws)).toEqual([]);
	});

	it("flags a value object borrowed from a context it went separate ways from", () => {
		const { ws, up, down, holder } = pair();
		const money = up.addValueObject("Money", { description: "" });
		const total = holder.addAttribute("Total", {
			type: "Money",
			valueobject: money,
		});
		up.separateWaysFrom(down);
		expect(apart(ws)).toEqual([
			[
				"error",
				'"Down" types "Holder"\'s "Total" by "Money" from "Up" although the contexts declare separate ways',
				total.ref,
			],
		]);
	});
});

describe("comments-required", () => {
	/** Two contexts, one commented relationship and one bare one. */
	function twoRelationships(options?: Workspace["options"]) {
		const ws = new Workspace("V", {
			description: "",
			version: "0",
			options,
		});
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const c = ws.addBoundedContext("C", { description: "" });
		a.upstreamOf(b, { comments: [{ text: "B reads A through an ACL." }] });
		const bare = a.partnerOf(c);
		return { ws, bare };
	}

	const commentsRequiredIn = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "comments-required");

	it("is off unless the workspace opts in", () => {
		expect(commentsRequiredIn(twoRelationships().ws)).toEqual([]);
		expect(commentsRequiredIn(twoRelationships({}).ws)).toEqual([]);
		expect(commentsRequiredIn(twoRelationships({ rules: {} }).ws)).toEqual([]);
		expect(
			commentsRequiredIn(
				twoRelationships({ rules: { commentsRequired: false } }).ws,
			),
		).toEqual([]);
	});

	it("warns once per uncommented relationship, at that relationship's ref", () => {
		const { ws, bare } = twoRelationships({
			rules: { commentsRequired: true },
		});
		expect(commentsRequiredIn(ws)).toEqual([
			{
				severity: "warning",
				rule: "comments-required",
				message: expect.stringContaining("nothing is written down"),
				ref: bare.ref,
			},
		]);
	});

	it("names both contexts and the type, so the Problems row reads on its own", () => {
		const { ws } = twoRelationships({ rules: { commentsRequired: true } });
		const [warning] = commentsRequiredIn(ws);
		expect(warning.message).toContain('"A"');
		expect(warning.message).toContain('"C"');
		expect(warning.message).toContain("partnership");
	});

	it("goes quiet once the relationship carries a comment", () => {
		const { ws, bare } = twoRelationships({
			rules: { commentsRequired: true },
		});
		bare.comments.push({ text: "A and C release together, see ADR-014." });
		expect(commentsRequiredIn(ws)).toEqual([]);
	});

	it("ignores uncommented consumables and consumptions, which are not relationships", () => {
		const { ws, bare } = twoRelationships({
			rules: { commentsRequired: true },
		});
		bare.comments.push({ text: "Documented." });
		const a = ws.getBoundedContextByRefOrThrow("#/boundedcontexts/a");
		const b = ws.getBoundedContextByRefOrThrow("#/boundedcontexts/b");
		const svc = a.addService("S", { description: "", type: "application" });
		const op = svc.provides("Op", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		b.addService("T", { description: "", type: "application" }).consumes(op, {
			pattern: "conformist",
		});

		expect(op.comments).toEqual([]);
		expect(commentsRequiredIn(ws)).toEqual([]);
	});

	it("survives the round trip, so the option is a property of the file", () => {
		const { ws } = twoRelationships({ rules: { commentsRequired: true } });
		const rebuilt = Workspace.fromSchema(
			JSON.parse(JSON.stringify(ws.toSchema())),
		);
		expect(rebuilt.options).toEqual({ rules: { commentsRequired: true } });
		expect(commentsRequiredIn(rebuilt)).toHaveLength(1);
	});

	it("writes no options key when the workspace sets none", () => {
		const schema = JSON.parse(JSON.stringify(twoRelationships().ws.toSchema()));
		expect(schema).not.toHaveProperty("options");
	});
});

describe("policy-in-context", () => {
	/** Two contexts, an event crossing, and a policy that acts on the other. */
	function reachingPolicy() {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const upApp = up.addService("Up App", {
			description: "",
			type: "application",
		});
		const happened = upApp.provides("Happened", {
			description: "",
			type: "event",
			pattern: "published-language",
		});
		const react = upApp.provides("React", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		const downApp = down.addService("Down App", {
			description: "",
			type: "application",
		});
		const policy = down.addPolicy("On Happened", { description: "" });
		policy.on(happened);
		return { ws, down, downApp, react, policy };
	}

	const inContext = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "policy-in-context")
			.map((d) => [d.severity, d.message, d.ref]);

	it("flags a policy whose then names another context's operation", () => {
		const { ws, react, policy } = reachingPolicy();
		policy.issues(react);
		expect(inContext(ws)).toEqual([
			[
				"error",
				'Policy "On Happened" in "Down" issues "React", which belongs to "Up"',
				policy.ref,
			],
		]);
	});

	it("says nothing when the policy names its own context's operation", () => {
		const { ws, downApp, react, policy } = reachingPolicy();
		const local = downApp.provides("React Locally", {
			description: "",
			type: "operation",
		});
		downApp.consumes(react, { pattern: "anti-corruption-layer" });
		policy.issues(local);
		expect(inContext(ws)).toEqual([]);
	});

	it("leaves a policy reacting to another context's event alone", () => {
		const { ws, policy } = reachingPolicy();
		// `on` is a consumption and may cross; only `then` may not (decision 17).
		expect(policy.events).toHaveLength(1);
		expect(inContext(ws)).toEqual([]);
	});
});

describe("process rules", () => {
	/**
	 * Two contexts: an upstream that publishes a fact and offers an operation,
	 * and a downstream whose process listens for the fact.
	 */
	function reachingProcess() {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const upApp = up.addService("Up App", {
			description: "",
			type: "application",
		});
		const happened = upApp.provides("Happened", {
			description: "",
			type: "event",
			pattern: "published-language",
		});
		const react = upApp.provides("React", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		const downApp = down.addService("Down App", {
			description: "",
			type: "application",
		});
		const act = downApp.provides("Act", { description: "", type: "operation" });
		const done = downApp.provides("Done", { description: "", type: "event" });
		const process = down
			.addProcess("Long Running", { description: "" })
			.starts(happened)
			.issues(act)
			.ends(done);
		return { ws, down, downApp, upApp, happened, react, act, done, process };
	}

	const ruleOf = (ws: Workspace, rule: string) =>
		ws
			.validate()
			.filter((d) => d.rule === rule)
			.map((d) => [d.severity, d.message, d.ref]);

	describe("process-in-context", () => {
		it("flags a process whose then names another context's operation", () => {
			const { ws, react, process } = reachingProcess();
			process.issues(react);
			expect(ruleOf(ws, "process-in-context")).toEqual([
				[
					"error",
					'Process "Long Running" in "Down" issues "React", which belongs to "Up"',
					process.ref,
				],
			]);
		});

		it("leaves the events it starts, waits and ends on free to cross", () => {
			const { ws, upApp, process } = reachingProcess();
			const settled = upApp.provides("Settled", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
			const cancelled = upApp.provides("Cancelled", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
			process.on(settled).ends(cancelled);
			expect(ruleOf(ws, "process-in-context")).toEqual([]);
		});
	});

	describe("process-starts", () => {
		it("wants an event or a command that begins an instance", () => {
			const { ws, down, downApp } = reachingProcess();
			const nothing = down
				.addProcess("Never Begins", { description: "" })
				.issues(
					downApp.provides("Something", {
						description: "",
						type: "operation",
					}),
				);
			expect(ruleOf(ws, "process-starts")).toEqual([
				[
					"error",
					'Process "Never Begins" names no event or command that begins an instance, so nothing in the model says when one exists',
					nothing.ref,
				],
			]);
		});

		it("says nothing about a process that names one", () => {
			const { ws } = reachingProcess();
			expect(ruleOf(ws, "process-starts")).toEqual([]);
		});

		// A command starts a saga as often as an event does (decision 23, third
		// amendment): the whole point of card 99 is that the model no longer
		// makes an author invent a fact for the call they already have.
		it("takes an operation of the process's own context as a start", () => {
			const { ws, down, downApp } = reachingProcess();
			const open = downApp.provides("Open Claim", {
				description: "",
				type: "operation",
			});
			const raised = downApp.provides("Claim Closed", {
				description: "",
				type: "event",
			});
			down
				.addProcess("Claim Handling", { description: "" })
				.starts(open)
				.ends(raised);
			expect(ruleOf(ws, "process-starts")).toEqual([]);
			expect(ruleOf(ws, "consumable-kind")).toEqual([]);
			expect(ruleOf(ws, "process-in-context")).toEqual([]);
		});

		it("refuses a command of another context as a start", () => {
			const { ws, down, upApp } = reachingProcess();
			const foreign = upApp.provides("Open Elsewhere", {
				description: "",
				type: "operation",
			});
			const process = down
				.addProcess("Claim Handling", { description: "" })
				.starts(foreign)
				.ends(
					down
						.addService("Claims", { description: "", type: "application" })
						.provides("Claim Closed", { description: "", type: "event" }),
				);
			expect(ruleOf(ws, "process-in-context")).toContainEqual([
				"error",
				'Process "Claim Handling" in "Down" starts on "Open Elsewhere", an operation of "Up"; the command that creates an instance is this context\'s own, though an event that starts one may cross',
				process.ref,
			]);
		});
	});

	describe("process-has-ends", () => {
		it("warns about a process that never says how it finishes", () => {
			const { ws, process } = reachingProcess();
			process.endEvents.length = 0;
			expect(ruleOf(ws, "process-has-ends")).toEqual([
				[
					"warning",
					'Process "Long Running" names no event that completes an instance, so the model never says how it finishes',
					process.ref,
				],
			]);
		});

		it("says nothing when the process names an ending event", () => {
			const { ws } = reachingProcess();
			expect(ruleOf(ws, "process-has-ends")).toEqual([]);
		});
	});

	describe("deadlines", () => {
		it("is a trigger with no crossing, no provider and no relationship to ask for", () => {
			// The whole point of decision 23's fourth amendment: a per-instance
			// timer used to cost an external Clock context, a service, an event, a
			// consumption and a relationship, and every one of those was a claim
			// about the outside world that was not true.
			const { ws, process } = reachingProcess();
			const before = ws.validate();
			const expiry = process.addDeadline("Unpaid", {
				description: "",
				after: "30 minutes",
			});
			process.on(expiry);
			expect(expiry.ref).toBe(
				"#/boundedcontexts/down/processes/long_running/deadlines/unpaid",
			);
			expect(ws.getByRef(expiry.ref)).toBe(expiry);
			expect(ws.validate()).toEqual(before);
		});

		it("ends an instance as an event does, and is no cycle", () => {
			const { ws, process } = reachingProcess();
			process.endEvents.length = 0;
			process.ends(
				process.addDeadline("Nobody came back", {
					description: "",
					after: "30 minutes",
				}),
			);
			expect(ruleOf(ws, "process-has-ends")).toEqual([]);
			expect(ruleOf(ws, "reaction-cycle")).toEqual([]);
		});

		it("is refused where it is written when another process names it", () => {
			// A deadline counts from the moment one instance began waiting, so no
			// other reactor knows the instance exists, let alone when its clock
			// started.
			const { down, process } = reachingProcess();
			const expiry = process.addDeadline("Unpaid", {
				description: "",
				after: "30 minutes",
			});
			const other = down.addProcess("Other", { description: "" });
			expect(() => other.on(expiry)).toThrow(
				"Deadline Unpaid belongs to process Long Running",
			);
		});

		// A clock starts on a moment the instance can tell has arrived, and the
		// only moments it knows are the ones it listens for (card 98).
		it("counts from one of the process's own triggers", () => {
			const { process, happened } = reachingProcess();
			const expiry = process.addDeadline("Unpaid", {
				description: "",
				after: "30 minutes",
				from: happened,
			});
			expect(expiry.from).toBe(happened);
		});

		it("refuses an anchor the process does not wait for", () => {
			const { process, done } = reachingProcess();
			expect(() =>
				process.addDeadline("Unpaid", {
					description: "",
					after: "30 minutes",
					from: done,
				}),
			).toThrow("which process Long Running does not wait for");
		});

		it("refuses an anchor that is the deadline itself", () => {
			const { process } = reachingProcess();
			const expiry = process.addDeadline("Unpaid", {
				description: "",
				after: "30 minutes",
			});
			process.on(expiry);
			expect(() => expiry.countsFrom(expiry)).toThrow(
				"cannot count from itself",
			);
		});

		it("survives toSchema and back, on and ends alike", () => {
			const { ws, process } = reachingProcess();
			const waited = process.addDeadline("Chased", {
				description: "A reminder goes out",
				after: "two working days",
			});
			const over = process.addDeadline("Abandoned", {
				description: "Nobody came back",
				after: "30 minutes",
			});
			process.on(waited).ends(over);
			const schema = ws.toSchema();
			const rebuilt = Workspace.fromSchema(JSON.parse(JSON.stringify(schema)));
			expect(rebuilt.toSchema()).toEqual(schema);
			const back = rebuilt.getProcessByRefOrThrow(process.ref);
			expect(
				[...back.deadlines.values()].map((it) => [it.name, it.after]),
			).toEqual([
				["Chased", "two working days"],
				["Abandoned", "30 minutes"],
			]);
			expect(back.events.map((it) => it.ref)).toContain(waited.ref);
			expect(back.endEvents.map((it) => it.ref)).toContain(over.ref);
		});

		it("carries its anchor through the schema and back", () => {
			const { ws, process, happened } = reachingProcess();
			const waited = process.addDeadline("Chased", {
				description: "A reminder goes out",
				after: "two working days",
				from: happened,
			});
			process.on(waited);
			const schema = ws.toSchema();
			const rebuilt = Workspace.fromSchema(JSON.parse(JSON.stringify(schema)));
			expect(rebuilt.toSchema()).toEqual(schema);
			const back = rebuilt.getProcessByRefOrThrow(process.ref);
			expect(back.deadlines.get("chased")?.from?.ref).toBe(happened.ref);
		});
	});

	describe("the rules a process shares with a policy", () => {
		it("reads its three event lists as reactions the boundary rules see", () => {
			const { ws, down, downApp, upApp, process } = reachingProcess();
			const secret = upApp.provides("Secret", {
				description: "",
				type: "event",
				internal: true,
			});
			process.on(secret);
			down.separateWaysFrom(
				ws.getBoundedContextByRefOrThrow("#/boundedcontexts/up"),
			);
			expect(ruleOf(ws, "internal-consumable")).toContainEqual([
				"error",
				'Process "Long Running" reacts to "Secret", which is internal to "Up"',
				process.ref,
			]);
			expect(ruleOf(ws, "separate-ways")).toContainEqual([
				"error",
				'Process "Long Running" in "Down" reacts to "Happened" from "Up" although the contexts declare separate ways',
				process.ref,
			]);
			// An operation in `on` is a kind error, exactly as it is on a policy;
			// one in `starts` is the command that creates an instance and is not
			// (decision 23, third amendment).
			const wrong = down
				.addProcess("Kinds", { description: "" })
				.starts(downApp.provides("Began", { description: "", type: "event" }))
				.on(downApp.provides("Ask", { description: "", type: "operation" }))
				.ends(downApp.provides("Finished", { description: "", type: "event" }));
			expect(ruleOf(ws, "consumable-kind")).toContainEqual([
				"error",
				'Process "Kinds" reacts to "Ask", which is an operation, not an event',
				wrong.ref,
			]);
		});

		it("refuses a process on a system we do not own", () => {
			const ws = emptyWorkspace();
			const scheme = ws.addBoundedContext("Scheme", {
				description: "",
				external: true,
			});
			const process = scheme.addProcess("Settlement", { description: "" });
			expect(ruleOf(ws, "external-is-boundary")).toContainEqual([
				"error",
				'External context "Scheme" declares process "Settlement"; what happens inside a system we do not own is not ours to state, only what it provides and what it consumes',
				process.ref,
			]);
		});

		it("accepts a process of the consumer's context in a consumption's by", () => {
			const { ws, downApp, react, process } = reachingProcess();
			downApp.consumes(react, {
				pattern: "anti-corruption-layer",
				by: [process],
			});
			expect(ruleOf(ws, "consumption-by-resolves")).toEqual([]);
		});

		it("refuses a process of somebody else's context in a consumption's by", () => {
			const { ws, down, downApp, upApp, react } = reachingProcess();
			const theirs = ws
				.getBoundedContextByRefOrThrow("#/boundedcontexts/up")
				.addProcess("Theirs", { description: "" })
				.starts(
					upApp.provides("Started Over There", {
						description: "",
						type: "event",
					}),
				);
			const consumption = downApp.consumes(react, {
				pattern: "anti-corruption-layer",
				by: [theirs],
			});
			expect(down.processes.size).toBe(1);
			expect(ruleOf(ws, "consumption-by-resolves")).toEqual([
				[
					"error",
					`"Down App" says its consumption of "React" is made by process "Theirs" belongs to "Up"; a consumption names the consumer's own operations, or the policies and processes of its context`,
					consumption.ref,
				],
			]);
		});
	});

	describe("reaction-cycle", () => {
		/** A process that issues an operation whose event ends it: the normal shape. */
		function lifecycle() {
			const ws = emptyWorkspace();
			const bc = ws.addBoundedContext("BC", { description: "" });
			const app = bc.addService("App", {
				description: "",
				type: "application",
			});
			const begun = app.provides("Begun", { description: "", type: "event" });
			const finished = app.provides("Finished", {
				description: "",
				type: "event",
			});
			const finish = app
				.provides("Finish", { description: "", type: "operation" })
				.raises(finished);
			app
				.provides("Begin", { description: "", type: "operation" })
				.raises(begun);
			return { ws, bc, begun, finish, finished };
		}

		it("does not call a process that ends on what it raises a cycle", () => {
			const { ws, bc, begun, finish, finished } = lifecycle();
			bc.addProcess("Run", { description: "" })
				.starts(begun)
				.issues(finish)
				.ends(finished);
			expect(ruleOf(ws, "reaction-cycle")).toEqual([]);
		});

		it("reads a process fed by its own steps as one lifecycle", () => {
			// The ordinary multi-step process: it starts on a fact, issues an
			// operation, waits for the fact that operation raises, issues the
			// next, and ends. The chain walks that as a ring back into the same
			// process, and it is not one (decision 23).
			const ws = emptyWorkspace();
			const bc = ws.addBoundedContext("Fulfilment", { description: "" });
			const app = bc.addService("App", {
				description: "",
				type: "application",
			});
			const orderPlaced = app.provides("OrderPlaced", {
				description: "",
				type: "event",
			});
			const paymentAuthorized = app.provides("PaymentAuthorized", {
				description: "",
				type: "event",
			});
			const inventoryReserved = app.provides("InventoryReserved", {
				description: "",
				type: "event",
			});
			const orderDispatched = app.provides("OrderDispatched", {
				description: "",
				type: "event",
			});
			const authorize = app
				.provides("AuthorizePayment", { description: "", type: "operation" })
				.raises(paymentAuthorized);
			const reserve = app
				.provides("ReserveInventory", { description: "", type: "operation" })
				.raises(inventoryReserved);
			const dispatch = app
				.provides("DispatchOrder", { description: "", type: "operation" })
				.raises(orderDispatched);
			bc.addProcess("Order Fulfilment", { description: "" })
				.starts(orderPlaced)
				.on(paymentAuthorized, inventoryReserved)
				.issues(authorize, reserve, dispatch)
				.ends(orderDispatched);
			expect(ruleOf(ws, "reaction-cycle")).toEqual([]);
		});

		/**
		 * The referral ring: a triage process asks a scheduling process to book
		 * a slot and waits for the booking. Triage issues its own operation,
		 * that operation calls Scheduling's public one through the `by` on its
		 * consumption, and Scheduling's process starts on that call, assigns a
		 * slot and ends on the fact triage was waiting for.
		 *
		 * At process granularity that is a call and its answer: the scheduling
		 * instance is born on the way in and finished on the way out, so
		 * nothing on the ring keeps it alive and it is not a second reactor
		 * living here (decision 23, amendment of 2026-09-10, second; card 116).
		 */
		function referral() {
			const ws = emptyWorkspace();
			const triage = ws.addBoundedContext("Triage", { description: "" });
			const scheduling = ws.addBoundedContext("Scheduling", {
				description: "",
			});
			const triageApp = triage.addService("Triage App", {
				description: "",
				type: "application",
			});
			const schedulingApp = scheduling.addService("Scheduling App", {
				description: "",
				type: "application",
			});
			const referred = triageApp.provides("Referred", {
				description: "",
				type: "event",
			});
			const caseClosed = triageApp.provides("Case Closed", {
				description: "",
				type: "event",
			});
			const closeCase = triageApp
				.provides("Close Case", { description: "", type: "operation" })
				.raises(caseClosed);
			const requestBooking = triageApp.provides("Request Booking", {
				description: "",
				type: "operation",
			});
			const appointmentBooked = schedulingApp.provides("Appointment Booked", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
			const assignSlot = schedulingApp
				.provides("Assign Slot", { description: "", type: "operation" })
				.raises(appointmentBooked);
			const bookAppointment = schedulingApp.provides("Book Appointment", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			});
			triageApp.consumes(bookAppointment, {
				pattern: "anti-corruption-layer",
				by: [requestBooking],
			});
			triage.downstreamOf(scheduling, {
				upstreamRoles: ["open-host-service", "published-language"],
				downstreamRoles: ["anti-corruption-layer"],
			});
			return {
				ws,
				triage,
				triageApp,
				scheduling,
				referred,
				requestBooking,
				closeCase,
				caseClosed,
				bookAppointment,
				assignSlot,
				appointmentBooked,
			};
		}

		it("reads a sub-process the ring calls and hears back from as a call", () => {
			const {
				ws,
				triage,
				triageApp,
				scheduling,
				referred,
				requestBooking,
				closeCase,
				caseClosed,
				bookAppointment,
				assignSlot,
				appointmentBooked,
			} = referral();
			triageApp.consumes(appointmentBooked, {
				pattern: "anti-corruption-layer",
				by: [requestBooking],
			});
			const triaging = triage
				.addProcess("Triaging", { description: "" })
				.starts(referred)
				.on(appointmentBooked)
				.issues(requestBooking, closeCase)
				.ends(caseClosed);
			scheduling
				.addProcess("Scheduling", { description: "" })
				.starts(bookAppointment)
				.issues(assignSlot)
				.ends(appointmentBooked);
			// The ring is Triaging -> Request Booking -> Book Appointment ->
			// Scheduling -> Assign Slot -> Appointment Booked -> Triaging, and
			// the only reactor living on it is Triaging.
			expect(ruleOf(ws, "reaction-cycle")).toEqual([]);
			expect(triaging.name).toBe("Triaging");
		});

		it("still finds a ring whose second process is waiting on it, not called", () => {
			const {
				ws,
				triage,
				triageApp,
				scheduling,
				referred,
				requestBooking,
				closeCase,
				caseClosed,
				bookAppointment,
				assignSlot,
				appointmentBooked,
			} = referral();
			triageApp.consumes(appointmentBooked, {
				pattern: "anti-corruption-layer",
				by: [requestBooking],
			});
			triage
				.addProcess("Triaging", { description: "" })
				.starts(referred)
				.on(appointmentBooked)
				.issues(requestBooking, closeCase)
				.ends(caseClosed);
			// The same ring, except that the booking call reaches an instance
			// that was already alive and waiting: `on`, not `starts`. Both
			// processes live on the ring, neither can see the whole of it, and
			// each turn wakes the other again.
			const rota = scheduling.addService("Rota", {
				description: "",
				type: "application",
			});
			const rotaOpened = rota.provides("Rota Opened", {
				description: "",
				type: "event",
			});
			const rotaClosed = rota.provides("Rota Closed", {
				description: "",
				type: "event",
			});
			rota
				.provides("Close Rota", { description: "", type: "operation" })
				.raises(rotaClosed);
			scheduling
				.addProcess("Scheduling", { description: "" })
				.starts(rotaOpened)
				.on(bookAppointment)
				.issues(assignSlot)
				.ends(rotaClosed);
			const cycles = ruleOf(ws, "reaction-cycle");
			expect(cycles).toHaveLength(1);
			expect(cycles[0][0]).toBe("warning");
			expect(cycles[0][1]).toContain(
				"the chain triggers itself and nothing in the model says what ends it",
			);
			expect(cycles[0][1]).toContain('"Scheduling"');
			expect(cycles[0][1]).toContain('"Triaging"');
		});

		it("still finds a ring that runs through two processes", () => {
			const ws = emptyWorkspace();
			const bc = ws.addBoundedContext("BC", { description: "" });
			const app = bc.addService("App", {
				description: "",
				type: "application",
			});
			const there = app.provides("There", { description: "", type: "event" });
			const back = app.provides("Back", { description: "", type: "event" });
			const go = app
				.provides("Go", { description: "", type: "operation" })
				.raises(there);
			const returnOp = app
				.provides("Return", { description: "", type: "operation" })
				.raises(back);
			bc.addProcess("Out", { description: "" })
				.starts(back)
				.issues(go)
				.ends(there);
			const home = bc
				.addProcess("Home", { description: "" })
				.starts(there)
				.issues(returnOp)
				.ends(back);
			expect(ruleOf(ws, "reaction-cycle")).toEqual([
				[
					"warning",
					'Reactions run in a cycle: "Home" -> "Return" -> "Back" -> "Out" -> "Go" -> "There" -> "Home"; the chain triggers itself and nothing in the model says what ends it',
					home.ref,
				],
			]);
			expect(go.name).toBe("Go");
		});

		it("still finds a ring that runs through a process and a policy", () => {
			const ws = emptyWorkspace();
			const bc = ws.addBoundedContext("BC", { description: "" });
			const app = bc.addService("App", {
				description: "",
				type: "application",
			});
			const there = app.provides("There", { description: "", type: "event" });
			const back = app.provides("Back", { description: "", type: "event" });
			const go = app
				.provides("Go", { description: "", type: "operation" })
				.raises(there);
			const returnOp = app
				.provides("Return", { description: "", type: "operation" })
				.raises(back);
			bc.addProcess("Out", { description: "" })
				.starts(back)
				.issues(go)
				.ends(there);
			const comesHome = bc
				.addPolicy("Comes Home", { description: "" })
				.on(there)
				.issues(returnOp);
			expect(ruleOf(ws, "reaction-cycle")).toEqual([
				[
					"warning",
					'Reactions run in a cycle: "Comes Home" -> "Return" -> "Back" -> "Out" -> "Go" -> "There" -> "Comes Home"; the chain triggers itself and nothing in the model says what ends it',
					comesHome.ref,
				],
			]);
			expect(go.name).toBe("Go");
		});
	});
});

describe("raises-in-context", () => {
	/** Two contexts, each with a service, an operation and an event of its own. */
	function twoContexts() {
		const ws = emptyWorkspace();
		const mine = ws.addBoundedContext("Mine", { description: "" });
		const theirs = ws.addBoundedContext("Theirs", { description: "" });
		const myApp = mine.addService("My App", {
			description: "",
			type: "application",
		});
		const theirApp = theirs.addService("Their App", {
			description: "",
			type: "application",
		});
		return {
			ws,
			myApp,
			theirApp,
			act: myApp.provides("Act", { description: "", type: "operation" }),
			myEvent: myApp.provides("It Happened", {
				description: "",
				type: "event",
			}),
			theirEvent: theirApp.provides("It Happened Over There", {
				description: "",
				type: "event",
				pattern: "published-language",
			}),
		};
	}

	const raises = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "raises-in-context")
			.map((d) => [d.severity, d.message, d.ref]);

	it("flags an operation that raises the context next door's event", () => {
		const { ws, act, theirEvent } = twoContexts();
		act.raises(theirEvent);
		expect(raises(ws)).toEqual([
			[
				"error",
				'"Act" raises "It Happened Over There", which belongs to "Theirs"; a context publishes its own facts, so "Mine" cannot raise another context\'s event',
				act.ref,
			],
		]);
	});

	it("says nothing when the event is the operation's own context's", () => {
		const { ws, act, myEvent } = twoContexts();
		act.raises(myEvent);
		expect(raises(ws)).toEqual([]);
	});

	it("leaves the honest way of acting over there alone", () => {
		// Consume the other context's operation and let it raise its own event:
		// the causal chain crosses through the consumption, not through raises.
		const { ws, myApp, theirApp, act, theirEvent } = twoContexts();
		const theirOp = theirApp
			.provides("Do It Over There", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			})
			.raises(theirEvent);
		myApp.consumes(theirOp, { pattern: "conformist", by: [act] });
		expect(raises(ws)).toEqual([]);
	});
});

describe("raises-in-aggregate", () => {
	/**
	 * One context with two aggregates and a service in front of them: the shape
	 * the architect's round-14 probe C is about, where Order claims to make
	 * Stock Item's fact true.
	 */
	function twoAggregates() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Sales", { description: "" });
		const orderAgg = bc.addAggregate("Order", { description: "" });
		orderAgg
			.addRootEntity("Order", { description: "" })
			.addAttribute("Id", { type: "OrderId", identity: true });
		const stockAgg = bc.addAggregate("Stock Item", { description: "" });
		stockAgg
			.addRootEntity("Stock Item", { description: "" })
			.addAttribute("Sku", { type: "Sku", identity: true });
		const app = bc.addService("Sales App", {
			description: "",
			type: "application",
		});
		return {
			ws,
			bc,
			orderAgg,
			stockAgg,
			app,
			stockReserved: stockAgg.provides("Stock Reserved", {
				description: "",
				type: "event",
				internal: true,
			}),
			orderPlaced: orderAgg.provides("Order Placed", {
				description: "",
				type: "event",
				internal: true,
			}),
		};
	}

	const inAggregate = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "raises-in-aggregate")
			.map((d) => [d.severity, d.message, d.ref]);

	it("refuses an aggregate raising the aggregate next door's event", () => {
		const { ws, orderAgg, orderPlaced, stockReserved } = twoAggregates();
		const place = orderAgg
			.provides("Place Order", {
				description: "",
				type: "operation",
				internal: true,
			})
			.raises(orderPlaced, stockReserved);
		expect(inAggregate(ws)).toEqual([
			[
				"error",
				'Aggregate "Order" raises "Stock Reserved", which belongs to aggregate "Stock Item" in "Sales"; each aggregate is saved in its own transaction, so "Order" making another\'s fact true spans two of them with nothing on any map to say so. Let "Stock Item" raise its own event, and let a service of "Sales" front both',
				place.ref,
			],
		]);
	});

	it("says nothing about an aggregate raising its own event", () => {
		const { ws, orderAgg, orderPlaced } = twoAggregates();
		orderAgg
			.provides("Place Order", {
				description: "",
				type: "operation",
				internal: true,
			})
			.raises(orderPlaced);
		expect(inAggregate(ws)).toEqual([]);
	});

	/**
	 * The half decision 17's second amendment leaves open: the context's use
	 * case runs both transitions, so an application service's operation may
	 * raise any aggregate's event of its own context.
	 */
	it("lets an application service's operation raise any aggregate's event of its context", () => {
		const { ws, app, orderPlaced, stockReserved } = twoAggregates();
		app
			.provides("Place Order", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			})
			.raises(orderPlaced, stockReserved);
		expect(inAggregate(ws)).toEqual([]);
	});

	it("leaves the foreign context's event to raises-in-context, so one line is reported once", () => {
		const { ws, bc, orderAgg } = twoAggregates();
		const elsewhere = ws.addBoundedContext("Warehouse", { description: "" });
		const theirs = elsewhere
			.addService("Warehouse App", { description: "", type: "application" })
			.provides("Stock Moved", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
		orderAgg
			.provides("Place Order", {
				description: "",
				type: "operation",
				internal: true,
			})
			.raises(theirs);
		expect(inAggregate(ws)).toEqual([]);
		expect(
			ws.validate().filter((d) => d.rule === "raises-in-context"),
		).toHaveLength(1);
		expect(bc.name).toBe("Sales");
	});

	it("says nothing inside an external context, whose insides are not ours to state", () => {
		const { ws, bc, orderAgg, orderPlaced, stockReserved } = twoAggregates();
		bc.external = true;
		orderAgg
			.provides("Place Order", {
				description: "",
				type: "operation",
				internal: true,
			})
			.raises(orderPlaced, stockReserved);
		expect(inAggregate(ws)).toEqual([]);
	});
});

describe("raises-restated", () => {
	/**
	 * One context whose application service fronts an aggregate operation: the
	 * shape decision 17 requires, and the one a front can restate.
	 */
	function front() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Catalog", { description: "" });
		const agg = bc.addAggregate("Pet", { description: "" });
		agg.addRootEntity("Pet", { description: "" }).addAttribute("Id", {
			type: "string",
			identity: true,
		});
		const app = bc.addService("Pet App", {
			description: "",
			type: "application",
		});
		const reserved = agg.provides("Pet Reserved", {
			description: "",
			type: "event",
		});
		const reserve = agg
			.provides("Reserve Pet", {
				description: "",
				type: "operation",
				internal: true,
			})
			.raises(reserved);
		const reserveForOrder = app.provides("Reserve Pet For Order", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		return { ws, agg, app, reserved, reserve, reserveForOrder };
	}

	const restated = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "raises-restated")
			.map((d) => [d.severity, d.message, d.ref]);

	it("flags a front that restates the event the operation it calls raises", () => {
		const { ws, app, reserve, reserved, reserveForOrder } = front();
		reserveForOrder.raises(reserved);
		app.consumes(reserve, { by: [reserveForOrder] });
		expect(restated(ws)).toEqual([
			[
				"warning",
				'"Reserve Pet For Order" raises "Pet Reserved", which "Reserve Pet" already raises through the consumption it makes; drop it, the chain carries it',
				reserveForOrder.ref,
			],
		]);
	});

	it("says nothing once the front drops it and lets the chain carry it", () => {
		const { ws, app, reserve, reserveForOrder } = front();
		app.consumes(reserve, { by: [reserveForOrder] });
		expect(restated(ws)).toEqual([]);
	});

	it("leaves a fact the front produces itself alone", () => {
		const { ws, app, reserve, reserveForOrder } = front();
		const audited = app.provides("Reservation Audited", {
			description: "",
			type: "event",
		});
		reserveForOrder.raises(audited);
		app.consumes(reserve, { by: [reserveForOrder] });
		expect(restated(ws)).toEqual([]);
	});

	it("reads a lone operation as the by the model did not make it write", () => {
		// A consumer providing one operation is its own `by`, which is why
		// `consumption-by-required` does not ask for one; the chain reads it the
		// same way, so the front is restating a fact the chain already carries
		// (decision 21's third amendment, card 95).
		// The message has to name the raiser too. It read the consumptions with
		// the inference left out, so the warning printed an empty name and told
		// the author the fact was already raised by `""` (card 130).
		const { ws, app, reserve, reserved, reserveForOrder } = front();
		reserveForOrder.raises(reserved);
		app.consumes(reserve, {});
		expect(restated(ws)).toEqual([
			[
				"warning",
				'"Reserve Pet For Order" raises "Pet Reserved", which "Reserve Pet" already raises through the consumption it makes; drop it, the chain carries it',
				reserveForOrder.ref,
			],
		]);
	});

	it("says nothing when the consumption does not name the front in by", () => {
		// With two operations to choose between and no `by`, the model never
		// claims which one calls out, so there is no chain to carry the fact and
		// no restatement to drop.
		const { ws, app, reserve, reserved, reserveForOrder } = front();
		reserveForOrder.raises(reserved);
		app.provides("Cancel Reservation", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		app.consumes(reserve, {});
		expect(restated(ws)).toEqual([]);
	});

	it("follows a chain of fronts to the operation that really raises it", () => {
		const { ws, app, reserve, reserved, reserveForOrder } = front();
		const edge = app.provides("Reserve Pet Edge", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		edge.raises(reserved);
		app.consumes(reserve, { by: [reserveForOrder] });
		app.consumes(reserveForOrder, { by: [edge] });
		expect(restated(ws)).toEqual([
			[
				"warning",
				'"Reserve Pet Edge" raises "Pet Reserved", which "Reserve Pet For Order" already raises through the consumption it makes; drop it, the chain carries it',
				edge.ref,
			],
		]);
	});
});

describe("rejection-raised", () => {
	const rejectionRaised = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "rejection-raised")
			.map((d) => [d.severity, d.message, d.ref]);

	/**
	 * A refusal shape an operation also publishes as an event, with nobody yet
	 * listening: card 117's original Offer Slot.
	 */
	function bothShapes() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Clinic", { description: "" });
		const patientWaitlisted = bc.addSchema("Patient Waitlisted");
		const svc = bc.addService("S", { description: "", type: "application" });
		const event = svc.provides("Patient Waitlisted", {
			description: "",
			type: "event",
			pattern: "published-language",
			schema: patientWaitlisted,
		});
		const offerSlot = svc
			.provides("Offer Slot", {
				description: "",
				type: "operation",
				rejects: [patientWaitlisted],
			})
			.raises(event);
		return { ws, bc, event, offerSlot };
	}

	it("warns when the refusal it publishes as an event reaches nobody", () => {
		const { ws, offerSlot } = bothShapes();
		expect(rejectionRaised(ws)).toEqual([
			[
				"warning",
				'"Offer Slot" rejects with "Patient Waitlisted", which it also raises as the event "Patient Waitlisted", and no policy or process anywhere reacts to "Patient Waitlisted"; a rejection answers the caller and an event tells the world, and where both are true keep both — the fact somebody hears is what makes it an event, so name the policy or process that hears "Patient Waitlisted", one of "Clinic"\'s own included, or drop the event and let the rejection answer',
				offerSlot.ref,
			],
		]);
	});

	// A declined authorisation is the caller's answer and a fact the world
	// hears, and card 123 told the author one of the two was false. Where
	// somebody hears the event both are true and the rule is quiet
	// (decision 25, note of 2026-09-10; card 126).
	it("says nothing when another context reacts to the published refusal", () => {
		const { ws, bc, event } = bothShapes();
		const outside = ws.addBoundedContext("Reporting", { description: "" });
		outside.downstreamOf(bc, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		const reports = outside.addService("Reports", {
			description: "",
			type: "application",
		});
		reports.consumes(event, { pattern: "conformist" });
		const record = reports.provides("Record Waitlisting", {
			description: "",
			type: "operation",
		});
		outside.addPolicy("Record The Waitlisting", {
			description: "",
			on: [event],
			issues: [record],
		});
		expect(rejectionRaised(ws)).toEqual([]);
	});

	// The dunning policy of the context that declined the payment is somebody
	// hearing the fact: it is not the caller — the caller was answered — and a
	// context that refuses a call and acts on the refusal elsewhere in its own
	// model is the ordinary shape of the pair, not a warning (decision 25,
	// second note of 2026-09-10; card 128).
	it("says nothing when the raising context's own policy hears it", () => {
		const { ws, bc, event } = bothShapes();
		const inside = bc.addService("Waitlist", {
			description: "",
			type: "application",
		});
		const chase = inside.provides("Chase The Waitlist", {
			description: "",
			type: "operation",
		});
		bc.addPolicy("Work The Waitlist", {
			description: "",
			on: [event],
			issues: [chase],
		});
		expect(rejectionRaised(ws)).toEqual([]);
	});

	// A process hears facts as a policy does, and one that only starts on the
	// event is still somebody hearing it.
	it("says nothing when the raising context's own process starts on it", () => {
		const { ws, bc, event } = bothShapes();
		const svc = bc.addService("Waitlist", {
			description: "",
			type: "application",
		});
		const chase = svc.provides("Chase The Waitlist", {
			description: "",
			type: "operation",
		});
		const cleared = svc.provides("Waitlist Cleared", {
			description: "",
			type: "event",
		});
		chase.raises(cleared);
		bc.addProcess("Waitlist Run", { description: "" })
			.starts(event)
			.issues(chase)
			.ends(cleared);
		expect(rejectionRaised(ws)).toEqual([]);
	});

	// A subscription with nothing behind it is not somebody hearing the fact:
	// the consumption is only the route it travels, and subscription-backed is
	// what asks for the reactor at the end of it.
	it("still warns when a consumption carries it but no reactor acts on it", () => {
		const { ws, bc, event, offerSlot } = bothShapes();
		const outside = ws.addBoundedContext("Reporting", { description: "" });
		outside.downstreamOf(bc, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		outside
			.addService("Reports", { description: "", type: "application" })
			.consumes(event, { pattern: "conformist" });
		expect(
			rejectionRaised(ws).map(([severity, , ref]) => [severity, ref]),
		).toEqual([["warning", offerSlot.ref]]);
	});

	it("says nothing when an operation rejects with one shape and raises an event of another", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Clinic", { description: "" });
		const declined = bc.addSchema("Declined");
		const booked = bc.addSchema("Booked");
		const svc = bc.addService("S", { description: "", type: "application" });
		const slotBooked = svc.provides("Slot Booked", {
			description: "",
			type: "event",
			schema: booked,
		});
		svc
			.provides("Offer Slot", {
				description: "",
				type: "operation",
				rejects: [declined],
			})
			.raises(slotBooked);
		expect(rejectionRaised(ws)).toEqual([]);
	});
});

describe("aggregate-not-public and domain-service-internal", () => {
	/**
	 * One context with an aggregate and a domain service, and a second context
	 * ready to consume whatever the first offers.
	 */
	function inside() {
		const ws = emptyWorkspace();
		const own = ws.addBoundedContext("Own", { description: "" });
		const other = ws.addBoundedContext("Other", { description: "" });
		const agg = own.addAggregate("Thing", { description: "" });
		agg.addRootEntity("Thing", { description: "" }).addAttribute("Id", {
			type: "string",
			identity: true,
		});
		const rules = own.addService("Rules", {
			description: "",
			type: "domain",
		});
		const app = own.addService("App", {
			description: "",
			type: "application",
		});
		const outsider = other.addService("Outsider", {
			description: "",
			type: "application",
		});
		return { ws, own, agg, rules, app, outsider };
	}

	const boundary = (ws: Workspace) =>
		ws
			.validate()
			.filter(
				(d) =>
					d.rule === "aggregate-not-public" ||
					d.rule === "domain-service-internal",
			)
			.map((d) => [d.rule, d.severity, d.message, d.ref]);

	it("flags an aggregate operation that declares an upstream role", () => {
		const { ws, agg } = inside();
		const op = agg.provides("Reserve", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		expect(boundary(ws)).toEqual([
			[
				"aggregate-not-public",
				"error",
				'Aggregate "Thing" offers "Reserve" as open-host-service, but what "Own" offers outward is provided by an application service',
				op.ref,
			],
		]);
	});

	it("flags another context consuming an aggregate's operation", () => {
		const { ws, agg, outsider } = inside();
		const op = agg.provides("Reserve", {
			description: "",
			type: "operation",
			internal: true,
		});
		outsider.consumes(op, { pattern: "anti-corruption-layer" });
		expect(boundary(ws)).toEqual([
			[
				"aggregate-not-public",
				"error",
				'"Outsider" in "Other" consumes "Reserve", an operation of aggregate "Thing" internal to "Own"',
				outsider.ref,
			],
		]);
	});

	it("flags a domain service offering or lending out an operation", () => {
		const { ws, rules, outsider } = inside();
		const op = rules.provides("Decide", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		outsider.consumes(op, { pattern: "conformist" });
		expect(boundary(ws).map((d) => [d[0], d[3]])).toEqual([
			["domain-service-internal", op.ref],
			["domain-service-internal", outsider.ref],
		]);
	});

	it("says nothing when the application service fronts them both", () => {
		const { ws, agg, rules, app, outsider } = inside();
		const held = agg.provides("Reserve", {
			description: "",
			type: "operation",
			internal: true,
		});
		const decided = rules.provides("Decide", {
			description: "",
			type: "operation",
			internal: true,
		});
		const offered = app.provides("Reserve Thing", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		app.consumes(held, {});
		app.consumes(decided, {});
		outsider.consumes(offered, { pattern: "anti-corruption-layer" });
		expect(boundary(ws)).toEqual([]);
	});

	it("leaves an aggregate's events alone, published or consumed abroad", () => {
		const { ws, agg, outsider } = inside();
		const raised = agg.provides("Thing Happened", {
			description: "",
			type: "event",
			pattern: "published-language",
		});
		// An aggregate still publishes the facts its context is known by; only
		// its operations stay inside (decision 17).
		outsider.consumes(raised, { pattern: "conformist" });
		expect(boundary(ws)).toEqual([]);
	});

	// A kernel is code its sharers run as their own, so an aggregate two teams
	// maintain together is reached through its operations by each of them —
	// which is what `shared-kernel-backed` counts as the sharing (decision 16,
	// second amendment of 2026-09-09; card 98).
	it("lets a context that shares the kernel consume its aggregate's operation", () => {
		const { ws, own, agg, outsider } = inside();
		const convert = agg.provides("Convert Units", {
			description: "",
			type: "operation",
			internal: true,
		});
		outsider.consumes(convert, {});
		own.sharesKernelWith(
			ws.getBoundedContextByRefOrThrow("#/boundedcontexts/other"),
		);
		expect(boundary(ws)).toEqual([]);
	});

	it("still refuses a context that shares no kernel with it", () => {
		const { ws, agg, outsider } = inside();
		const convert = agg.provides("Convert Units", {
			description: "",
			type: "operation",
			internal: true,
		});
		outsider.consumes(convert, {});
		expect(boundary(ws).map((d) => d[0])).toEqual(["aggregate-not-public"]);
	});

	it("keeps refusing an upstream role on a kernel aggregate's operation", () => {
		const { ws, own, agg } = inside();
		const convert = agg.provides("Convert Units", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		own.sharesKernelWith(
			ws.getBoundedContextByRefOrThrow("#/boundedcontexts/other"),
		);
		expect(boundary(ws).map((d) => [d[0], d[3]])).toEqual([
			["aggregate-not-public", convert.ref],
		]);
	});
});

describe("aggregate-consumes-inside", () => {
	/**
	 * An aggregate and an application service in one context, and a neighbour
	 * offering an operation and an event for either of them to consume.
	 */
	function neighbours() {
		const ws = emptyWorkspace();
		const own = ws.addBoundedContext("Own", { description: "" });
		const other = ws.addBoundedContext("Other", { description: "" });
		const agg = own.addAggregate("Thing", { description: "" });
		agg.addRootEntity("Thing", { description: "" }).addAttribute("Id", {
			type: "string",
			identity: true,
		});
		const app = own.addService("App", {
			description: "",
			type: "application",
		});
		const theirApp = other.addService("TheirApp", {
			description: "",
			type: "application",
		});
		const call = theirApp.provides("Check", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		const fact = theirApp.provides("Happened", {
			description: "",
			type: "event",
			pattern: "published-language",
		});
		return { ws, own, agg, app, call, fact };
	}

	const inside = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "aggregate-consumes-inside")
			.map((d) => [d.severity, d.message, d.ref]);

	it("flags an aggregate calling another context's operation", () => {
		const { ws, agg, call } = neighbours();
		agg.consumes(call, { pattern: "anti-corruption-layer" });
		expect(inside(ws)).toEqual([
			[
				"error",
				'Aggregate "Thing" consumes "Check" from "Other"; an aggregate is a consistency boundary, not a client, so let an application service of "Own" make the call and hand "Thing" what it needs',
				agg.ref,
			],
		]);
	});

	it("flags an aggregate subscribing to another context's event, and points at a policy", () => {
		const { ws, agg, fact } = neighbours();
		agg.consumes(fact, { pattern: "conformist" });
		expect(inside(ws)).toEqual([
			[
				"error",
				'Aggregate "Thing" consumes "Happened" from "Other"; an aggregate is a consistency boundary, not a client, so let a policy of "Own" react to it and issue an operation of "Own" and hand "Thing" what it needs',
				agg.ref,
			],
		]);
	});

	it("says nothing when the application service consumes instead", () => {
		const { ws, app, call, fact } = neighbours();
		app.consumes(call, { pattern: "anti-corruption-layer" });
		app.consumes(fact, { pattern: "conformist" });
		expect(inside(ws)).toEqual([]);
	});

	it("leaves an aggregate consuming its own context alone", () => {
		const { ws, own, agg } = neighbours();
		const service = own.addService("Rules", {
			description: "",
			type: "domain",
		});
		agg.consumes(
			service.provides("Decide", {
				description: "",
				type: "operation",
				internal: true,
			}),
			{},
		);
		expect(inside(ws)).toEqual([]);
	});

	// Calling the aggregate next door is the same act with a shorter wire: two
	// transactions, and nothing on any map to say so (card 100).
	it("flags an aggregate calling another aggregate of its own context", () => {
		const { ws, own, agg } = neighbours();
		const other = own.addAggregate("Stock", { description: "" });
		other.addRootEntity("Stock", { description: "" });
		agg.consumes(
			other.provides("Reserve", {
				description: "",
				type: "operation",
				internal: true,
			}),
			{},
		);
		expect(inside(ws)).toEqual([
			[
				"error",
				'Aggregate "Thing" consumes "Reserve" from aggregate "Stock" in "Own"; each is saved in its own transaction, so one calling the other spans two of them with nothing on any map to say so. Let a service of "Own" front the call and hand "Thing" what it needs',
				agg.ref,
			],
		]);
	});

	it("leaves an aggregate consuming another aggregate's event alone", () => {
		const { ws, own, agg } = neighbours();
		const other = own.addAggregate("Stock", { description: "" });
		other.addRootEntity("Stock", { description: "" });
		agg.consumes(
			other.provides("Reserved", {
				description: "",
				type: "event",
				internal: true,
			}),
			{},
		);
		expect(inside(ws)).toEqual([]);
	});
});

describe("entity-identity", () => {
	/** An aggregate whose root is identified, and one plain entity beside it. */
	function aggregate() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		const root = agg.addRootEntity("Order", { description: "" });
		root.addAttribute("Order Id", { type: "uuid", identity: true });
		const line = agg.addEntity("Order Line", { description: "" });
		return { ws, bc, agg, root, line };
	}

	const identityRules = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "entity-identity");

	it("warns about a non-root entity with nothing identifying it, and says it is a value object", () => {
		const { ws, line } = aggregate();
		expect(
			identityRules(ws).map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"warning",
				'Entity "Order Line" in aggregate "Order" declares no identity attribute; an entity is what you tell apart from another holding the same values, so without one "Order Line" is a value object',
				line.ref,
			],
		]);
	});

	it("goes quiet once the entity says what identifies it", () => {
		const { ws, line } = aggregate();
		line.addAttribute("Line No", { type: "int", identity: true });
		expect(identityRules(ws)).toEqual([]);
	});

	it("wants an identity attribute, not just any attribute", () => {
		const { ws, line } = aggregate();
		line.addAttribute("Quantity", { type: "int" });
		expect(identityRules(ws)).toHaveLength(1);
	});

	it("leaves the root to root-identity, and says nothing about value objects", () => {
		const { ws, agg, bc, root } = aggregate();
		bc.addValueObject("Money", { description: "" });
		root.attributes.clear();
		// The root has no identity either now, but that is root-identity's error
		// to raise, not this rule's warning; and the value object never gets one.
		expect(identityRules(ws).map((d) => d.ref)).toEqual([
			agg.entities.get("order_line")?.ref,
		]);
		expect(ws.validate().some((d) => d.rule === "root-identity")).toBe(true);
	});
});

describe("identity-not-optional", () => {
	/** A root, an entity beside it, a value object and a schema, all in one context. */
	function model() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		const root = agg.addRootEntity("Order", { description: "" });
		root.addAttribute("Order Id", { type: "uuid", identity: true });
		const money = bc.addValueObject("Money", { description: "" });
		const payload = bc.addSchema("Order Placed");
		return { ws, bc, agg, root, money, payload };
	}

	const optionalIdentity = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "identity-not-optional");

	it("says nothing while an identity is always present", () => {
		const { ws } = model();
		expect(optionalIdentity(ws)).toEqual([]);
	});

	it("errors when an identity is also marked optional, and points at the attribute", () => {
		const { ws, root } = model();
		const maybe = root.addAttribute("Legacy Id", {
			type: "uuid",
			identity: true,
			optional: true,
		});
		expect(
			optionalIdentity(ws).map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"error",
				'"Order" marks attribute "Legacy Id" as both an identity and optional; an identity that may be missing cannot say which "Order" a reference means',
				maybe.ref,
			],
		]);
	});

	it("leaves an optional attribute that is not an identity alone", () => {
		const { ws, root } = model();
		root.addAttribute("Note", { type: "string", optional: true });
		expect(optionalIdentity(ws)).toEqual([]);
	});

	it("reads value objects and schemas too, not only entities", () => {
		const { ws, money, payload } = model();
		const vo = money.addAttribute("Currency", {
			type: "string",
			identity: true,
			optional: true,
		});
		const field = payload.addAttribute("Order Id", {
			type: "uuid",
			identity: true,
			optional: true,
		});
		expect(optionalIdentity(ws).map((d) => d.ref)).toEqual([field.ref, vo.ref]);
	});
});

describe("relationship-cycle", () => {
	/**
	 * Three contexts, each with an application service, and a `step` that
	 * declares one upstream of another and backs the step with real traffic —
	 * a call or an event, because since decision 20 only calls make a ring.
	 */
	function three() {
		const ws = emptyWorkspace();
		const make = (name: string) => {
			const bc = ws.addBoundedContext(name, { description: "" });
			return {
				bc,
				app: bc.addService(`${name} App`, {
					description: "",
					type: "application",
				}),
			};
		};
		const a = make("A");
		const b = make("B");
		const c = make("C");
		type Context = ReturnType<typeof make>;
		const step = (
			from: Context,
			to: Context,
			carriedBy: "operation" | "event",
			type?: "customer-supplier",
		) => {
			const consumable = from.app.provides(
				`${from.bc.name} to ${to.bc.name} ${carriedBy}`,
				{ description: "", type: carriedBy },
			);
			to.app.consumes(consumable, {});
			return from.bc.upstreamOf(to.bc, { type });
		};
		return { ws, a, b, c, step };
	}

	const cycles = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "relationship-cycle");

	it("is quiet on a chain of calls that never closes, even a branching one", () => {
		const { ws, a, b, c, step } = three();
		step(a, b, "operation");
		step(b, c, "operation");
		step(a, c, "operation");
		expect(cycles(ws)).toEqual([]);
	});

	it("names the ring's contexts in order, and reports at a relationship on it", () => {
		const { ws, a, b, c, step } = three();
		const ab = step(a, b, "operation");
		step(b, c, "operation");
		step(c, a, "operation");
		expect(cycles(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"warning",
				'Calls run in a cycle: "A" -> "B" -> "C" -> "A"; each of these calls the next, so all of them depend on each other\'s contracts. Put an anti-corruption layer on one of the steps, so that side translates and is free to change; or declare a partnership between two neighbours on the ring that really do move as one, which makes them one context here; or reverse a dependency by turning that call into an event the other side reacts to',
				ab.ref,
			],
		]);
	});

	// Decision 20: an operation is answered before its caller can go on, so a
	// ring of calls blocks every team on it. Nobody waits for an event, so the
	// same ring of contexts joined by events is a shape the model may keep.
	it("says nothing about a ring carried by events", () => {
		const { ws, a, b, c, step } = three();
		step(a, b, "event");
		step(b, c, "event");
		step(c, a, "event");
		expect(cycles(ws)).toEqual([]);
	});

	it("warns about the same ring once each step is a call", () => {
		const { ws, a, b, c, step } = three();
		step(a, b, "operation");
		step(b, c, "operation");
		step(c, a, "operation");
		expect(cycles(ws)).toHaveLength(1);
	});

	it("takes a mutual pair of calls as a ring of two, and events as no ring at all", () => {
		const calls = three();
		calls.step(calls.a, calls.b, "operation");
		calls.step(calls.b, calls.a, "operation");
		expect(cycles(calls.ws)).toHaveLength(1);

		const events = three();
		events.step(events.a, events.b, "event");
		events.step(events.b, events.a, "event");
		expect(cycles(events.ws)).toEqual([]);
	});

	it("needs every step of the ring to be a call; one event breaks it", () => {
		const { ws, a, b, c, step } = three();
		step(a, b, "operation");
		step(b, c, "event");
		step(c, a, "operation");
		expect(cycles(ws)).toEqual([]);
	});

	it("ignores a declared relationship no traffic backs at all", () => {
		const { ws, a, b } = three();
		a.bc.upstreamOf(b.bc, {});
		b.bc.upstreamOf(a.bc, {});
		expect(cycles(ws)).toEqual([]);
	});

	// The fix text has always named a partnership as one of the three remedies,
	// and until card 104 the walk did not read one: the pair moves as one, so
	// what runs between them is not a step at all.
	it("clears a ring of two once the pair declares a partnership", () => {
		const { ws, a, b, step } = three();
		step(a, b, "operation");
		step(b, a, "operation");
		expect(cycles(ws)).toHaveLength(1);
		a.bc.partnerOf(b.bc, {});
		expect(cycles(ws)).toEqual([]);
	});

	it("keeps a longer ring the partners are only part of, and says why", () => {
		// Merging the pair does not make the third context's dependency go
		// away: the pair calls C and C calls the pair, which is a ring of two
		// nodes, one of them a partnership.
		const { ws, a, b, c, step } = three();
		step(a, b, "operation");
		step(b, c, "operation");
		step(c, a, "operation");
		a.bc.partnerOf(b.bc, {});
		expect(cycles(ws)).toHaveLength(1);
		const [diagnostic] = cycles(ws);
		expect(diagnostic.message).toContain('"A" and "B" -> "C" -> "A" and "B"');
		expect(diagnostic.message).toContain(
			'"A" and "B" are partners, so each of those moves as one context here',
		);
	});

	// Decision 20's 2026-09-08 amendment: an anti-corruption layer is where one
	// side's contract stops, so a pair that calls each other through one is
	// free to change and is not a ring.
	it("does not count a step whose downstream declares an anti-corruption layer", () => {
		const { ws, a, b, step } = three();
		step(a, b, "operation");
		const back = b.app.provides("B to A operation", {
			description: "",
			type: "operation",
		});
		a.app.consumes(back, { pattern: "anti-corruption-layer" });
		b.bc.upstreamOf(a.bc, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		expect(cycles(ws)).toEqual([]);
	});

	// Decision 20's note of 2026-09-09: the exemption is read on the
	// consumption that declares the layer, so one translated call does not
	// excuse the untranslated one beside it (card 100).
	it("still counts a step whose second call is untranslated", () => {
		const { ws, a, b, step } = three();
		step(a, b, "operation");
		const back = b.app.provides("B to A operation", {
			description: "",
			type: "operation",
		});
		const raw = b.app.provides("B to A raw", {
			description: "",
			type: "operation",
		});
		a.app.consumes(back, { pattern: "anti-corruption-layer" });
		a.app.consumes(raw, {});
		b.bc.upstreamOf(a.bc, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		expect(cycles(ws)).toHaveLength(1);
	});

	it("still reports the ring when the layer is on a step that is not part of it", () => {
		const { ws, a, b, c, step } = three();
		step(a, b, "operation");
		step(b, c, "operation");
		step(c, a, "operation");
		// A translates what it consumes from C's neighbour, not from C.
		const d = ws.addBoundedContext("D", { description: "" });
		const app = d.addService("D App", { description: "", type: "application" });
		a.app.consumes(
			app.provides("D op", { description: "", type: "operation" }),
			{
				pattern: "anti-corruption-layer",
			},
		);
		d.upstreamOf(a.bc, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		expect(cycles(ws)).toHaveLength(1);
	});

	it("counts customer-supplier as directed too, so a mixed ring still closes", () => {
		const { ws, a, b, step } = three();
		step(a, b, "operation");
		step(b, a, "operation", "customer-supplier");
		expect(cycles(ws)).toHaveLength(1);
	});

	it("reads the same way whichever end declared the ring first", () => {
		const forwards = three();
		forwards.step(forwards.a, forwards.b, "operation");
		forwards.step(forwards.b, forwards.c, "operation");
		forwards.step(forwards.c, forwards.a, "operation");
		const backwards = three();
		backwards.step(backwards.c, backwards.a, "operation");
		backwards.step(backwards.b, backwards.c, "operation");
		backwards.step(backwards.a, backwards.b, "operation");
		expect(cycles(backwards.ws).map((d) => d.message)).toEqual(
			cycles(forwards.ws).map((d) => d.message),
		);
	});

	it("reports a two-context ring once, not once per direction", () => {
		const { ws, a, b, step } = three();
		step(a, b, "operation");
		step(b, a, "operation");
		expect(cycles(ws)).toHaveLength(1);
	});

	it("leaves symmetric relationships out of the graph", () => {
		const { ws, a, b, c, step } = three();
		step(a, b, "operation");
		b.bc.partnerOf(c.bc);
		c.bc.sharesKernelWith(a.bc);
		expect(cycles(ws)).toEqual([]);
	});

	it("reports each ring of distinct contexts once, not the walks that thread one twice", () => {
		// A -> B, B -> C, C -> B and C -> A: two rings, B/C and A/B/C. Walking
		// the relationships rather than the contexts would also report the closed
		// walk A -> B -> C -> B -> A, which tells a reader nothing new.
		const { ws, a, b, c, step } = three();
		step(a, b, "operation");
		step(b, c, "operation");
		step(c, b, "operation");
		step(c, a, "operation");
		expect(
			cycles(ws)
				.map((d) => d.message)
				.sort(),
		).toEqual(
			[
				'Calls run in a cycle: "A" -> "B" -> "C" -> "A"; each of these calls the next, so all of them depend on each other\'s contracts. Put an anti-corruption layer on one of the steps, so that side translates and is free to change; or declare a partnership between two neighbours on the ring that really do move as one, which makes them one context here; or reverse a dependency by turning that call into an event the other side reacts to',
				'Calls run in a cycle: "B" -> "C" -> "B"; each of these calls the next, so all of them depend on each other\'s contracts. Put an anti-corruption layer on one of the steps, so that side translates and is free to change; or declare a partnership between two neighbours on the ring that really do move as one, which makes them one context here; or reverse a dependency by turning that call into an event the other side reacts to',
			].sort(),
		);
	});
});

describe("shared-kernel-backed", () => {
	/** Two contexts sharing a kernel, each with something to share over it. */
	function kernel() {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const relationship = a.sharesKernelWith(b);
		return { ws, a, b, relationship };
	}

	const backed = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "shared-kernel-backed");

	it("warns about a kernel with nothing in it", () => {
		const { ws, relationship } = kernel();
		expect(backed(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"warning",
				'"A" and "B" declare a shared kernel, but neither types an attribute by a value object the other declares, carries one of its schemas or calls one of its operations, so nothing is in the kernel',
				relationship.ref,
			],
		]);
	});

	it("goes quiet when one context types an attribute by the other's value object", () => {
		const { ws, a, b } = kernel();
		const status = a.addValueObject("Status", { description: "" });
		const agg = b.addAggregate("Stock", { description: "" });
		const root = agg.addRootEntity("Stock", { description: "" });
		root.addAttribute("Id", { type: "uuid", identity: true });
		root.addAttribute("Status", { type: "Status", valueobject: status });
		expect(backed(ws)).toEqual([]);
	});

	it("goes quiet when a consumable of one context carries the other's schema", () => {
		const { ws, a, b } = kernel();
		const shape = a.addSchema("Shape");
		b.addService("S", { description: "", type: "application" }).provides("Op", {
			description: "",
			type: "operation",
			schema: shape,
		});
		expect(backed(ws)).toEqual([]);
	});

	it("goes quiet when an attribute of one context nests the other's schema", () => {
		const { ws, a, b } = kernel();
		const line = a.addSchema("Order Line");
		b.addSchema("Order Request").addAttribute("Lines", {
			type: "OrderLine[]",
			schema: line,
		});
		expect(backed(ws)).toEqual([]);
	});

	it("goes quiet when one context calls an operation of the other", () => {
		const { ws, a, b } = kernel();
		// The kernel holds something with identity and behaviour — a jointly
		// maintained Product with its unit conversions — so it is an aggregate of
		// the kernel context reached through its operations, and the sharing is
		// the call rather than a copied shape (decision 16, second amendment).
		const convert = a
			.addAggregate("Product", { description: "" })
			.provides("Convert Units", { description: "", type: "operation" });
		b.addService("Pricing", { description: "", type: "application" }).consumes(
			convert,
			{},
		);
		expect(backed(ws)).toEqual([]);
	});

	it("says nothing about contexts that declare no shared kernel", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		a.partnerOf(ws.addBoundedContext("B", { description: "" }));
		expect(backed(ws)).toEqual([]);
	});
});

describe("partnership-backed", () => {
	/** Two partner contexts, each with a service to hang traffic on. */
	function partners() {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const relationship = a.partnerOf(b);
		return {
			ws,
			a,
			b,
			relationship,
			aApp: a.addService("A App", { description: "", type: "application" }),
			bApp: b.addService("B App", { description: "", type: "application" }),
		};
	}

	const backed = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "partnership-backed");

	it("warns about a partnership with no traffic at all, and says the other direction is not demanded", () => {
		const { ws, relationship } = partners();
		expect(backed(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"warning",
				'"A" and "B" are declared partners, but nothing crosses between them in either direction; a partnership does not need traffic both ways — one team may consume everything and the other nothing and still share a release train — but with no exchange at all there is nothing holding the two together',
				relationship.ref,
			],
		]);
	});

	it("is quiet when the traffic only runs one way, because a joint release train needs no answer back", () => {
		const { ws, aApp, bApp } = partners();
		const fromA = aApp.provides("Thing", { description: "", type: "event" });
		bApp.consumes(fromA, {});
		expect(backed(ws)).toEqual([]);
	});

	it("goes quiet once something crosses each way", () => {
		const { ws, aApp, bApp } = partners();
		const fromA = aApp.provides("Thing", { description: "", type: "event" });
		const fromB = bApp.provides("Other Thing", {
			description: "",
			type: "event",
		});
		bApp.consumes(fromA, {});
		aApp.consumes(fromB, {});
		expect(backed(ws)).toEqual([]);
	});

	it("counts a policy reacting to the partner's event as traffic, as separate-ways does", () => {
		const { ws, a, aApp, bApp } = partners();
		const fromB = bApp.provides("Other Thing", {
			description: "",
			type: "event",
		});
		// The subscription is the only exchange there is: A consumes nothing from
		// B, and B nothing from A. It still backs the partnership, because it is
		// the same exchange told a different way.
		const act = aApp.provides("Act", { description: "", type: "operation" });
		a.addPolicy("On Other Thing", { description: "" }).on(fromB).issues(act);
		expect(backed(ws)).toEqual([]);
	});

	it("says nothing about shared kernels or directed relationships", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		a.sharesKernelWith(b);
		a.upstreamOf(b, {});
		expect(backed(ws)).toEqual([]);
	});
});

describe("reaction-cycle", () => {
	/** A context with an application service to hang a reaction chain on. */
	function context() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		return {
			ws,
			bc,
			app: bc.addService("App", { description: "", type: "application" }),
		};
	}

	const reactions = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "reaction-cycle");

	it("is quiet on a chain that ends", () => {
		const { ws, bc, app } = context();
		const placed = app.provides("Placed", { description: "", type: "event" });
		const invoiced = app.provides("Invoiced", {
			description: "",
			type: "event",
		});
		const invoice = app
			.provides("Invoice", { description: "", type: "operation" })
			.raises(invoiced);
		app
			.provides("Place", { description: "", type: "operation" })
			.raises(placed);
		bc.addPolicy("On Placed", { description: "" }).on(placed).issues(invoice);
		expect(reactions(ws)).toEqual([]);
	});

	it("names the chain in order when it closes on itself", () => {
		const { ws, bc, app } = context();
		const placed = app.provides("Placed", { description: "", type: "event" });
		const place = app
			.provides("Place", { description: "", type: "operation" })
			.raises(placed);
		const policy = bc
			.addPolicy("On Placed", { description: "" })
			.on(placed)
			.issues(place);
		expect(reactions(ws)).toHaveLength(1);
		const [diagnostic] = reactions(ws);
		expect(diagnostic.severity).toBe("warning");
		expect(diagnostic.message).toContain('"Place" -> "Placed"');
		expect(diagnostic.message).toContain('"Placed" -> "On Placed"');
		expect(diagnostic.message).toContain('"On Placed" -> "Place"');
		expect([place.ref, placed.ref, policy.ref]).toContain(diagnostic.ref);
	});

	it("follows the ring through two policies as well as one", () => {
		const { ws, bc, app } = context();
		const placed = app.provides("Placed", { description: "", type: "event" });
		const invoiced = app.provides("Invoiced", {
			description: "",
			type: "event",
		});
		const place = app
			.provides("Place", { description: "", type: "operation" })
			.raises(placed);
		const invoice = app
			.provides("Invoice", { description: "", type: "operation" })
			.raises(invoiced);
		bc.addPolicy("On Placed", { description: "" }).on(placed).issues(invoice);
		bc.addPolicy("On Invoiced", { description: "" }).on(invoiced).issues(place);
		expect(reactions(ws)).toHaveLength(1);
		expect(reactions(ws)[0].message).toContain('"On Invoiced"');
	});

	/**
	 * Two contexts, each acting on the other the way decision 17 requires: a
	 * policy issues a local operation, and that operation calls the far side's
	 * public one through a consumption whose `by` names it. The ring closes
	 * through both boundaries, and before card 69 the walk stopped at the first
	 * of them and the model validated clean (the architect review's probe 5).
	 */
	function twoContexts({
		bReacts = true,
		callBack = true,
	}: {
		bReacts?: boolean;
		callBack?: boolean;
	} = {}) {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const aApp = a.addService("A App", {
			description: "",
			type: "application",
		});
		const bApp = b.addService("B App", {
			description: "",
			type: "application",
		});
		const aEvent = aApp.provides("A Happened", {
			description: "",
			type: "event",
		});
		const bEvent = bApp.provides("B Happened", {
			description: "",
			type: "event",
		});
		const aPublic = aApp
			.provides("A Public", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			})
			.raises(aEvent);
		const bPublic = bApp
			.provides("B Public", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			})
			.raises(bEvent);
		const aLocal = aApp.provides("A Local", {
			description: "",
			type: "operation",
		});
		const bLocal = bApp.provides("B Local", {
			description: "",
			type: "operation",
		});
		// A's local operation either calls B's public one or only subscribes to
		// B's event; a subscription is not something the caller causes.
		aApp.consumes(callBack ? bPublic : bEvent, {
			pattern: "conformist",
			by: [aLocal],
		});
		bApp.consumes(aPublic, { pattern: "conformist", by: [bLocal] });
		a.addPolicy("A Policy", { description: "" }).on(aEvent).issues(aLocal);
		if (bReacts)
			b.addPolicy("B Policy", { description: "" }).on(bEvent).issues(bLocal);
		return { ws, a, b, aLocal, bLocal, aPublic, bPublic };
	}

	it("follows a consumption's by across a boundary and reports the ring, naming both contexts", () => {
		const { ws } = twoContexts();
		expect(reactions(ws)).toHaveLength(1);
		const [diagnostic] = reactions(ws);
		expect(diagnostic.message).toContain('"A Local" -> "B Public"');
		expect(diagnostic.message).toContain('"B Public" -> "B Happened"');
		expect(diagnostic.message).toContain('"B Happened" -> "B Policy"');
		expect(diagnostic.message).toContain('"B Policy" -> "B Local"');
		expect(diagnostic.message).toContain('"B Local" -> "A Public"');
		expect(diagnostic.message).toContain(
			'it runs through "A" and "B", so no one context can see the whole ring',
		);
	});

	it("is quiet when the chain ends at another context's event that no policy reacts to", () => {
		// B still publishes its fact; nobody over there acts on it, so the chain
		// stops at the foreign event instead of coming back.
		expect(reactions(twoContexts({ bReacts: false }).ws)).toEqual([]);
	});

	it("does not follow a consumption of an event, which the consumer reacts to rather than causes", () => {
		expect(reactions(twoContexts({ callBack: false }).ws)).toEqual([]);
	});

	/**
	 * Card 100's two-caller shape with a process at the top of it: A's process
	 * issues A's own operation, that operation calls B's public one through a
	 * consumption's `by`, and the fact B raises comes back to the process.
	 * NorthBank's onboarding and RiverMart's checkout are both written this
	 * way.
	 *
	 * With `bReacts`, B has a policy on that event which calls back into A,
	 * so a second reactor stands on the ring and nobody on it sees the whole.
	 */
	function outAndBack({ bReacts = false }: { bReacts?: boolean } = {}) {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const aApp = a.addService("A App", {
			description: "",
			type: "application",
		});
		const bApp = b.addService("B App", {
			description: "",
			type: "application",
		});
		const started = aApp.provides("Started", {
			description: "",
			type: "event",
		});
		const aHappened = aApp.provides("A Happened", {
			description: "",
			type: "event",
		});
		const bHappened = bApp.provides("B Happened", {
			description: "",
			type: "event",
		});
		const aPublic = aApp
			.provides("A Public", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			})
			.raises(aHappened);
		const bPublic = bApp
			.provides("B Public", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			})
			.raises(bHappened);
		const aLocal = aApp.provides("A Local", {
			description: "",
			type: "operation",
		});
		aApp.consumes(bPublic, { pattern: "conformist", by: [aLocal] });
		const run = a
			.addProcess("Run", { description: "" })
			.starts(started)
			.on(bHappened)
			.issues(aLocal);
		if (bReacts) {
			const bLocal = bApp.provides("B Local", {
				description: "",
				type: "operation",
			});
			bApp.consumes(aPublic, { pattern: "conformist", by: [bLocal] });
			b.addPolicy("B Policy", { description: "" }).on(bHappened).issues(bLocal);
			run.on(aHappened);
		}
		return { ws, run };
	}

	// A process's lifecycle is a lifecycle however far its own call travels:
	// the contexts the ring crosses do not make it a loop, and narrowing this
	// to the process's own context made two reference models warn about the
	// shape decision 23 describes (card 102, the lead's ruling).
	it("is quiet when a process calls the next context and waits for its fact", () => {
		expect(reactions(outAndBack().ws)).toEqual([]);
	});

	it("still reports that ring once a second reactor stands on it", () => {
		const { ws } = outAndBack({ bReacts: true });
		expect(reactions(ws)).toHaveLength(1);
		const [diagnostic] = reactions(ws);
		expect(diagnostic.message).toContain('"B Happened" -> "B Policy"');
		expect(diagnostic.message).toContain('"B Local" -> "A Public"');
		expect(diagnostic.message).toContain(
			'it runs through "A" and "B", so no one context can see the whole ring',
		);
	});

	/**
	 * A process and an operation it issues that raises the very fact the
	 * process starts on. The ring runs through one process and no other
	 * reactor, so it used to be read as a lifecycle; it is not one, because
	 * every pass round begins another instance (card 104).
	 */
	function restarts({ waits = false }: { waits?: boolean } = {}) {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Ops", { description: "" });
		const app = bc.addService("App", { description: "", type: "application" });
		const started = app.provides("Started", { description: "", type: "event" });
		const done = app.provides("Done", { description: "", type: "event" });
		const restart = app
			.provides("Restart", { description: "", type: "operation" })
			.raises(started);
		const finish = app
			.provides("Finish", { description: "", type: "operation" })
			.raises(done);
		const run = bc
			.addProcess("Run", { description: "" })
			.starts(started)
			.issues(restart, finish)
			.ends(done);
		if (waits) run.on(started);
		return { ws, run };
	}

	it("reports a ring that comes back to a process through what starts it", () => {
		const { ws } = restarts();
		expect(reactions(ws)).toHaveLength(1);
		const [diagnostic] = reactions(ws);
		expect(diagnostic.message).toContain('"Restart" -> "Started"');
		expect(diagnostic.message).toContain('"Started" -> "Run"');
	});

	it("is quiet again once the process waits on that fact as well", () => {
		// Waiting on it says the running instance is the one that wakes, which
		// is the lifecycle the exemption is for.
		expect(reactions(restarts({ waits: true }).ws)).toEqual([]);
	});

	/**
	 * A ring with no policy or process on it at all: two single-operation
	 * services calling each other, with nothing that reacts to anything
	 * (decision 20, note of 2026-09-10; card 108).
	 */
	describe("a ring of pure calls, with no reactor on it", () => {
		it("reports the ring once, as calls, when it stays inside one context", () => {
			const { ws, bc } = context();
			const other = bc.addService("Other", {
				description: "",
				type: "application",
			});
			const app = bc.addService("App2", {
				description: "",
				type: "application",
			});
			const fromApp = app.provides("From App", {
				description: "",
				type: "operation",
			});
			const fromOther = other.provides("From Other", {
				description: "",
				type: "operation",
			});
			app.consumes(fromOther, { by: [fromApp] });
			other.consumes(fromApp, { by: [fromOther] });
			expect(reactions(ws)).toHaveLength(1);
			const [diagnostic] = reactions(ws);
			expect(diagnostic.severity).toBe("warning");
			expect(diagnostic.message).toContain("Calls run in a cycle");
			expect(diagnostic.message).not.toContain("Reactions run in a cycle");
			expect(diagnostic.message).not.toContain("triggers itself");
		});

		it("leaves a cross-context ring of pure calls to relationship-cycle", () => {
			const ws = emptyWorkspace();
			const a = ws.addBoundedContext("A", { description: "" });
			const b = ws.addBoundedContext("B", { description: "" });
			const aApp = a.addService("A App", {
				description: "",
				type: "application",
			});
			const bApp = b.addService("B App", {
				description: "",
				type: "application",
			});
			const aOp = aApp.provides("A Op", { description: "", type: "operation" });
			const bOp = bApp.provides("B Op", { description: "", type: "operation" });
			aApp.consumes(bOp, { by: [aOp] });
			bApp.consumes(aOp, { by: [bOp] });
			a.upstreamOf(b, {});
			b.upstreamOf(a, {});
			// relationship-cycle already reports this ring as a ring of calls
			// between contexts; reaction-cycle has nothing to add to it.
			expect(
				ws.validate().filter((d) => d.rule === "relationship-cycle").length,
			).toBeGreaterThan(0);
			expect(reactions(ws)).toEqual([]);
		});
	});

	/**
	 * NorthBank's honest gateway shape: a process starts a gateway operation
	 * that calls an external scheme's operation, which raises the scheme's own
	 * event; a policy hears that event through an anti-corruption-layer
	 * consumption and republishes it as the bank's own event, which the
	 * process then hears. Card 110 wires this into NorthBank's own reference
	 * model; this is the same shape as a core test workspace (decision 23,
	 * amended 2026-09-10, second; card 108).
	 */
	describe("a process's lifecycle through a translating policy", () => {
		/**
		 * `hears` says where the process names the event the layer republishes:
		 * `on` while an instance is alive, which is the lifecycle; `starts`,
		 * which begins another instance every time round; or `ends`, which
		 * completes one and wakes nothing.
		 */
		function gateway(hears: "on" | "starts" | "ends" = "on") {
			const ws = emptyWorkspace();
			const bank = ws.addBoundedContext("Bank", { description: "" });
			const scheme = ws.addBoundedContext("Scheme", {
				description: "",
				external: true,
			});
			const schemeApi = scheme.addService("Scheme API", {
				description: "",
				type: "application",
			});
			const authorised = schemeApi.provides("Authorised", {
				description: "",
				type: "event",
			});
			const authorise = schemeApi
				.provides("Authorise", { description: "", type: "operation" })
				.raises(authorised);
			const gatewayApp = bank.addService("Gateway", {
				description: "",
				type: "application",
			});
			const instructionAuthorised = gatewayApp.provides(
				"Instruction Authorised",
				{ description: "", type: "event" },
			);
			const publishAuthorised = gatewayApp
				.provides("Publish Authorised", {
					description: "",
					type: "operation",
				})
				.raises(instructionAuthorised);
			const sendAuthorisation = gatewayApp.provides("Send Authorisation", {
				description: "",
				type: "operation",
			});
			gatewayApp.consumes(authorise, {
				pattern: "conformist",
				by: [sendAuthorisation],
			});
			const translator = bank
				.addPolicy("Publish Scheme Answer", { description: "" })
				.on(authorised)
				.issues(publishAuthorised);
			gatewayApp.consumes(authorised, {
				pattern: "anti-corruption-layer",
				by: [translator],
			});
			const requested = gatewayApp.provides("Instruction Requested", {
				description: "",
				type: "event",
			});
			const settled = gatewayApp.provides("Instruction Settled", {
				description: "",
				type: "event",
			});
			const settle = gatewayApp
				.provides("Settle Instruction", { description: "", type: "operation" })
				.raises(settled);
			const process = bank
				.addProcess("Instruction", { description: "" })
				.starts(requested)
				.issues(sendAuthorisation);
			if (hears === "on")
				process.on(instructionAuthorised).ends(instructionAuthorised);
			if (hears === "ends") process.ends(instructionAuthorised);
			// A process that begins on the translated event needs its own way
			// to finish, or it would have none to state.
			if (hears === "starts")
				process.starts(instructionAuthorised).issues(settle).ends(settled);
			return { ws, process, translator };
		}

		it("is quiet: the ring is the process's lifecycle through the layer", () => {
			const { ws } = gateway();
			expect(reactions(ws)).toEqual([]);
		});

		it("still reports a ring where the policy does not translate through an ACL", () => {
			// Same shape, but the policy hears the scheme's event as an ordinary
			// conformist rather than through an anti-corruption-layer consumption:
			// it is a second reactor with no layer to carry the process's
			// lifecycle through, so the ring is a genuine loop.
			const { ws } = gateway();
			const untranslated = ws
				.getServiceByRefOrThrow("#/boundedcontexts/bank/services/gateway")
				.consumptions.find(
					(c) => c.consumable.name === "Authorised" && c.by.length > 0,
				);
			if (untranslated) untranslated.pattern = "conformist";
			expect(reactions(ws)).toHaveLength(1);
		});

		// The exemption's premise, which card 108 asserted without checking it:
		// that the event coming back through the layer continues an instance.
		// Named in `starts` it begins one, so each turn of the ring is a
		// different instance and no state holds it together (card 113).
		it("reports the ring as spawning instances where the translated event starts the process", () => {
			const { ws, translator } = gateway("starts");
			expect(reactions(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
				[
					"warning",
					'Reactions run in a cycle that spawns instances: "Publish Scheme Answer" -> "Publish Authorised" -> "Instruction Authorised" -> "Instruction" -> "Send Authorisation" -> "Authorise" -> "Authorised" -> "Publish Scheme Answer"; the event that closes the ring starts "Instruction" rather than continuing it, so every turn begins another instance and nothing in the model says what ends them; it runs through "Bank" and "Scheme", so no one context can see the whole ring',
					translator.ref,
				],
			]);
		});

		// An ending fact completes an instance rather than waking it, so the
		// walk takes no step from one and this ring never closes at all.
		it("is quiet where the translated event ends the process", () => {
			const { ws } = gateway("ends");
			expect(reactions(ws)).toEqual([]);
		});

		// The exemption is about what the policy does on this ring. A layer it
		// declares for some other subscription says nothing about the trigger
		// that wakes it here, and reading the policy alone let a conformist
		// second reactor pass as a translator (card 113).
		it("reports a ring where the policy's trigger on it is conformist and its layer is elsewhere", () => {
			const { ws } = gateway();
			const gatewayApp = ws.getServiceByRefOrThrow(
				"#/boundedcontexts/bank/services/gateway",
			);
			const onTheRing = gatewayApp.consumptions.find(
				(c) => c.consumable.name === "Authorised" && c.by.length > 0,
			);
			if (onTheRing) onTheRing.pattern = "conformist";
			// A second subscription the policy does translate, off the ring:
			// the scheme's declined answer, which the policy also hears.
			const declined = ws
				.getServiceByRefOrThrow("#/boundedcontexts/scheme/services/scheme_api")
				.provides("Declined", { description: "", type: "event" });
			const translator = ws.getPolicyByRefOrThrow(
				"#/boundedcontexts/bank/policies/publish_scheme_answer",
			);
			translator.on(declined);
			gatewayApp.consumes(declined, {
				pattern: "anti-corruption-layer",
				by: [translator],
			});
			expect(reactions(ws).map((d) => d.message)).toEqual([
				'Reactions run in a cycle: "Publish Scheme Answer" -> "Publish Authorised" -> "Instruction Authorised" -> "Instruction" -> "Send Authorisation" -> "Authorise" -> "Authorised" -> "Publish Scheme Answer"; the chain triggers itself and nothing in the model says what ends it; it runs through "Bank" and "Scheme", so no one context can see the whole ring',
			]);
		});
	});
});

describe("disposition-needs-comment", () => {
	/** Two contexts and a relationship whose evidence the test decides. */
	function related(
		disposition?: "by-design" | "tolerated" | "refactor",
		comments?: Array<{ text: string }>,
	) {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const relationship = a.upstreamOf(b, { disposition, comments });
		return { ws, a, b, relationship };
	}

	const needsComment = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "disposition-needs-comment");

	it("says nothing when the intent is by-design, said or unsaid", () => {
		expect(needsComment(related().ws)).toEqual([]);
		expect(needsComment(related("by-design").ws)).toEqual([]);
	});

	it("warns about a tolerated relationship with nothing written down", () => {
		const { ws, relationship } = related("tolerated");
		expect(needsComment(ws).map((d) => [d.severity, d.message, d.ref])).toEqual(
			[
				[
					"warning",
					'The upstream-downstream between "A" and "B" is marked tolerated, but carries no comment saying what makes it so or what would clear it',
					relationship.ref,
				],
			],
		);
	});

	it("warns about a refactor the same way", () => {
		expect(needsComment(related("refactor").ws).map((d) => d.message)).toEqual([
			'The upstream-downstream between "A" and "B" is marked refactor, but carries no comment saying what makes it so or what would clear it',
		]);
	});

	it("goes quiet as soon as one comment explains it", () => {
		const { ws } = related("refactor", [
			{ text: "A reads B's tables directly; a read model is planned." },
		]);
		expect(needsComment(ws)).toEqual([]);
	});

	it("reaches a consumable, and a consumption at its own ref", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const aApp = a.addService("A App", {
			description: "",
			type: "application",
		});
		const bApp = b.addService("B App", {
			description: "",
			type: "application",
		});
		const feed = aApp.provides("Feed", {
			description: "",
			type: "event",
			pattern: "published-language",
			disposition: "tolerated",
		});
		const consumption = bApp.consumes(feed, {
			pattern: "conformist",
			disposition: "refactor",
		});
		expect(needsComment(ws).map((d) => [d.ref, d.message])).toEqual([
			[
				feed.ref,
				'"Feed", provided by "A App" is marked tolerated, but carries no comment saying what makes it so or what would clear it',
			],
			[
				consumption.ref,
				'"B App"\'s consumption of "Feed" is marked refactor, but carries no comment saying what makes it so or what would clear it',
			],
		]);
	});

	it("leaves an internal consumable alone; it never crosses a boundary", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const app = bc.addService("App", { description: "", type: "application" });
		app.provides("Housekeeping", {
			description: "",
			type: "event",
			internal: true,
			disposition: "refactor",
		});
		expect(needsComment(ws)).toEqual([]);
	});
});

describe("relationship-roles-backed and published languages", () => {
	/** An upstream context offering one consumable, and a downstream consuming it. */
	function crossingWithSchema(withSchema: boolean) {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const shape = up.addSchema("Order Summary");
		const op = up
			.addService("S", { description: "", type: "application" })
			.provides("Op", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
				schema: withSchema ? shape : undefined,
			});
		down
			.addService("T", { description: "", type: "application" })
			.consumes(op, { pattern: "conformist" });
		up.upstreamOf(down, {
			upstreamRoles: ["open-host-service", "published-language"],
			downstreamRoles: ["conformist"],
		});
		return ws;
	}

	const backedRules = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "relationship-roles-backed");

	it("takes a crossing consumable's schema as the published language, backing both roles at once", () => {
		expect(backedRules(crossingWithSchema(true))).toEqual([]);
	});

	it("still warns when nothing crossing carries a schema or the flag", () => {
		expect(
			backedRules(crossingWithSchema(false)).map((d) => d.message),
		).toEqual([
			'"Up" is declared published-language to "Down", but nothing "Down" consumes from "Up" carries that upstream role, and nothing in "Down" carries one of its schemas or value objects',
		]);
	});

	// A query's whole language may be what it answers with: the parameter is an
	// id and the shape a reader learns is the answer. Reading `schema` alone
	// left that language invisible (card 98).
	it("takes a crossing query's returns as the published language", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const counts = up.addSchema("Counts");
		counts.addAttribute("n", { type: "int" });
		const query = up
			.addService("Up App", { description: "", type: "application" })
			.provides("Get Counts", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
				returns: counts,
			});
		down
			.addService("Down App", { description: "", type: "application" })
			.consumes(query, { pattern: "conformist" });
		up.upstreamOf(down, {
			upstreamRoles: ["open-host-service", "published-language"],
			downstreamRoles: ["conformist"],
		});
		expect(backedRules(ws)).toEqual([]);
	});

	it("takes a crossing operation's rejection shape the same way", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const refusal = up.addSchema("Refusal");
		refusal.addAttribute("reason", { type: "string" });
		const op = up
			.addService("Up App", { description: "", type: "application" })
			.provides("Do", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
				rejects: [refusal],
			});
		down
			.addService("Down App", { description: "", type: "application" })
			.consumes(op, { pattern: "conformist" });
		up.upstreamOf(down, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		expect(backedRules(ws)).toEqual([]);
	});

	// The inbound integration: the caller dictates the format and nothing
	// crosses from upstream to downstream at all, so what backs both roles is
	// the caller's shape on the operation it reaches (decision 03, amended).
	it("backs an inbound upstream's roles by the shape its downstream carries", () => {
		const ws = emptyWorkspace();
		const caller = ws.addBoundedContext("Card Processor", {
			description: "",
			external: true,
		});
		const ours = ws.addBoundedContext("Cards", { description: "" });
		const message = caller.addSchema("Authorisation Message");
		message.addAttribute("pan token", { type: "string" });
		const authorise = ours
			.addService("Cards App", { description: "", type: "application" })
			.provides("Authorise Card", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
				schema: message,
			});
		const feed = caller.addService("Feed", {
			description: "",
			type: "application",
		});
		feed.consumes(authorise, { pattern: "conformist" });
		caller.upstreamOf(ours, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		// The other half of the same integration: the operation is ours and the
		// caller takes it as it stands.
		ours.upstreamOf(caller, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["conformist"],
		});
		expect(backedRules(ws)).toEqual([]);
	});
});

describe("relationship-declared", () => {
	const declared = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "relationship-declared");

	/** Two contexts, one consuming an event of the other, nothing declared. */
	function crossing() {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const provider = up.addService("Feed", {
			description: "",
			type: "application",
		});
		const happened = provider.provides("Happened", {
			description: "",
			type: "event",
			pattern: "published-language",
		});
		const consumer = down.addService("Reader", {
			description: "",
			type: "application",
		});
		const consumption = consumer.consumes(happened, { pattern: "conformist" });
		return { ws, up, down, consumer, consumption };
	}

	/** Two contexts, one holding the identity of the other's root, nothing else. */
	function identityOnly() {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const thing = up
			.addAggregate("Thing", { description: "" })
			.addRootEntity("Thing", { description: "" });
		thing.addAttribute("Id", { type: "uuid", identity: true });
		const holder = down
			.addAggregate("Holder", { description: "" })
			.addRootEntity("Holder", { description: "" });
		holder.addAttribute("Id", { type: "uuid", identity: true });
		const thingId = holder.addAttribute("Thing Id", {
			type: "uuid",
			identifies: thing,
		});
		return { ws, up, down, thingId };
	}

	it("warns about a consumption between contexts with no relationship", () => {
		const { ws, consumer } = crossing();
		expect(declared(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"warning",
				'"Down" consumes "Happened" from "Up", but no relationship says how "Up" and "Down" stand to each other',
				consumer.ref,
			],
		]);
	});

	// An identity crossing is its own record: the context map draws it under
	// «id», and asking for a typed relationship on top of it produced fourteen
	// upstream-downstream relationships with no roles across the reference
	// models (decision 14, amendment of 2026-09-09; card 100).
	it("says nothing about an identity into another context with nothing consumed", () => {
		const { ws } = identityOnly();
		expect(declared(ws)).toEqual([]);
	});

	it("goes quiet when the relationship points the way the crossing runs", () => {
		const { ws, up, down } = crossing();
		up.upstreamOf(down, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		expect(declared(ws)).toEqual([]);
	});

	// The arrow is the author's claim about who dictates the model, not about
	// who calls whom, so a relationship pointing against the traffic answers
	// the question the crossing raises just as well (decision 03, note of
	// 2026-09-09; card 99).
	it("takes a directed relationship pointing the other way", () => {
		const { ws, up, down } = crossing();
		down.upstreamOf(up, {});
		expect(declared(ws)).toEqual([]);
	});

	it("takes a partnership either way round", () => {
		const { ws, up, down } = crossing();
		down.partnerOf(up);
		expect(declared(ws)).toEqual([]);
	});

	it("takes a shared kernel either way round", () => {
		const { ws, up, down } = crossing();
		down.sharesKernelWith(up);
		expect(declared(ws)).toEqual([]);
	});

	// Separate ways says how the two stand, so this rule has nothing left to
	// ask; that the crossing contradicts it is `separate-ways`'s error, and one
	// mistake is one diagnostic (card 104).
	it("takes separate ways as an answer and leaves the crossing to that rule", () => {
		const { ws, up, down } = crossing();
		up.separateWaysFrom(down);
		expect(declared(ws)).toEqual([]);
		expect(
			ws.validate().filter((d) => d.rule === "separate-ways"),
		).toHaveLength(1);
	});

	it("warns once per pair and direction however many crossings there are", () => {
		const { ws, up, down } = crossing();
		const more = up.addService("More", {
			description: "",
			type: "application",
		});
		down.addService("Also", { description: "", type: "application" }).consumes(
			more.provides("Again", {
				description: "",
				type: "event",
				pattern: "published-language",
			}),
			{ pattern: "conformist" },
		);
		expect(declared(ws)).toHaveLength(1);
	});

	/** Two contexts, a policy in one reacting to the other's event. */
	function subscription() {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const happened = up
			.addService("Feed", { description: "", type: "application" })
			.provides("Happened", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
		const local = down
			.addService("Local", { description: "", type: "application" })
			.provides("React", { description: "", type: "operation" });
		const policy = down
			.addPolicy("On happened", { description: "" })
			.on(happened)
			.issues(local);
		return { ws, up, down, policy };
	}

	it("warns about a policy reacting to another context's event", () => {
		const { ws, policy } = subscription();
		expect(declared(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"warning",
				'Policy "On happened" in "Down" reacts to "Happened" from "Up", but no relationship says how "Up" and "Down" stand to each other',
				policy.ref,
			],
		]);
	});

	it("goes quiet when a relationship covers the subscription", () => {
		const { ws, up, down } = subscription();
		up.upstreamOf(down, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		expect(declared(ws)).toEqual([]);
	});

	it("says nothing about a policy reacting to its own context's event", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const service = bc.addService("S", {
			description: "",
			type: "application",
		});
		bc.addPolicy("On own", { description: "" })
			.on(service.provides("Own", { description: "", type: "event" }))
			.issues(service.provides("Do", { description: "", type: "operation" }));
		expect(declared(ws)).toEqual([]);
	});

	it("says nothing about a consumption or an identity inside one context", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("A", { description: "" });
		const root = agg.addRootEntity("A", { description: "" });
		root.addAttribute("Id", { type: "uuid", identity: true });
		const other = bc.addAggregate("B", { description: "" });
		const otherRoot = other.addRootEntity("B", { description: "" });
		otherRoot.addAttribute("Id", { type: "uuid", identity: true });
		otherRoot.addAttribute("A Id", { type: "uuid", identifies: root });
		other.consumes(
			agg.provides("Done", { description: "", type: "event" }),
			{},
		);
		expect(declared(ws)).toEqual([]);
	});
});

describe("consumption-once", () => {
	const once = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "consumption-once");

	/** One consumer and one consumable of another context, ready to be taken. */
	function pair() {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		up.upstreamOf(down, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		const happened = up
			.addService("Feed", { description: "", type: "application" })
			.provides("Happened", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
		const consumer = down.addService("Reader", {
			description: "",
			type: "application",
		});
		return { ws, up, down, happened, consumer };
	}

	it("errors on a second consumption of the same consumable when neither names a caller", () => {
		const { ws, happened, consumer } = pair();
		const first = consumer.consumes(happened, { pattern: "conformist" });
		consumer.consumes(happened, { pattern: "conformist" });
		const says =
			'"Reader" consumes "Happened" from "Feed" 2 times, and one of them names no caller in `by`; where one consumer takes one consumable more than once, each of those consumptions names the callers that make it and no two of them name the same caller';
		expect(once(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			["error", says, first.ref],
			["error", says, first.ref],
		]);
	});

	it("accepts two consumptions of one consumable made by different callers", () => {
		const { ws, down, happened, consumer } = pair();
		const archive = consumer.provides("Archive", {
			description: "",
			type: "operation",
		});
		const decide = down.addPolicy("Decide", { description: "" });
		const asIs = consumer.consumes(happened, {
			pattern: "conformist",
			by: [archive],
		});
		const translated = consumer.consumes(happened, {
			pattern: "anti-corruption-layer",
			by: [decide],
		});
		expect(once(ws)).toEqual([]);
		// The pair repeats, so each ref carries its first caller and the two
		// are reachable one at a time (decision 26).
		const pairRef =
			"#/boundedcontexts/down/services/reader/consumes/boundedcontexts~up~services~feed~provides~happened";
		// The caller's collection is part of the segment, so an operation and
		// a policy sharing an id stay apart (card 95).
		expect(asIs.ref).toBe(`${pairRef}/provides/archive`);
		expect(translated.ref).toBe(`${pairRef}/policies/decide`);
		expect(ws.findConsumption(asIs.ref)).toBe(asIs);
		expect(ws.findConsumption(translated.ref)).toBe(translated);
	});

	it("keeps an operation and a policy of one id apart in the ref", () => {
		// Petstore names a policy after the operation it issues, so both are
		// `reserve_pet`, and the ref carried the bare id: two consumptions, one
		// ref, and `consumption-once` saw two callers and said nothing (card 95).
		const { ws, down, happened, consumer } = pair();
		const reserve = consumer.provides("Reserve Pet", {
			description: "",
			type: "operation",
		});
		const policy = down.addPolicy("Reserve Pet", { description: "" });
		expect(policy.id).toBe(reserve.id);
		const byOperation = consumer.consumes(happened, {
			pattern: "conformist",
			by: [reserve],
		});
		const byPolicy = consumer.consumes(happened, {
			pattern: "anti-corruption-layer",
			by: [policy],
		});
		expect(byOperation.ref).not.toBe(byPolicy.ref);
		expect(ws.findConsumption(byPolicy.ref)).toBe(byPolicy);
		expect(once(ws)).toEqual([]);
	});

	it("errors when two consumptions of one consumable name the same caller", () => {
		const { ws, happened, consumer } = pair();
		const archive = consumer.provides("Archive", {
			description: "",
			type: "operation",
		});
		consumer.consumes(happened, { pattern: "conformist", by: [archive] });
		const second = consumer.consumes(happened, {
			pattern: "anti-corruption-layer",
			by: [archive],
		});
		expect(once(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"error",
				'"Reader" consumes "Happened" from "Feed" 2 times, and "Archive" makes more than one; where one consumer takes one consumable more than once, each of those consumptions names the callers that make it and no two of them name the same caller',
				second.ref,
			],
		]);
	});

	it("keeps the ref of a pair declared once as the pair alone", () => {
		const { ws, happened, consumer } = pair();
		const archive = consumer.provides("Archive", {
			description: "",
			type: "operation",
		});
		const only = consumer.consumes(happened, {
			pattern: "conformist",
			by: [archive],
		});
		expect(only.ref).toBe(
			"#/boundedcontexts/down/services/reader/consumes/boundedcontexts~up~services~feed~provides~happened",
		);
		expect(once(ws)).toEqual([]);
	});

	it("says nothing when the consumer takes it once", () => {
		const { ws, happened, consumer } = pair();
		consumer.consumes(happened, { pattern: "conformist" });
		expect(once(ws)).toEqual([]);
	});

	it("says nothing when two different consumers take the same consumable", () => {
		const { ws, down, happened, consumer } = pair();
		consumer.consumes(happened, { pattern: "conformist" });
		down
			.addService("Other", { description: "", type: "application" })
			.consumes(happened, { pattern: "conformist" });
		expect(once(ws)).toEqual([]);
	});
});

describe("relationship-duplicate", () => {
	const duplicates = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "relationship-duplicate");

	function pair() {
		const ws = emptyWorkspace();
		return {
			ws,
			a: ws.addBoundedContext("A", { description: "" }),
			b: ws.addBoundedContext("B", { description: "" }),
		};
	}

	it("errors on a second relationship of the same type and direction", () => {
		const { ws, a, b } = pair();
		a.upstreamOf(b, { upstreamRoles: ["open-host-service"] });
		const second = a.upstreamOf(b, { downstreamRoles: ["conformist"] });
		expect(duplicates(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"error",
				'"A" and "B" declare a upstream-downstream relationship more than once; the two share a ref, so only the first can be reached and everything said on this one is lost; name them both — a negotiated API and a tolerated feed are two agreements — or say the two things on one',
				second.ref,
			],
		]);
	});

	it("counts a symmetric relationship declared either way round as the same one", () => {
		const { ws, a, b } = pair();
		a.partnerOf(b);
		b.partnerOf(a);
		expect(duplicates(ws)).toHaveLength(1);
	});

	it("allows two relationships of different types between one pair", () => {
		const { ws, a, b } = pair();
		a.upstreamOf(b, {});
		b.upstreamOf(a, { type: "customer-supplier" });
		expect(duplicates(ws)).toEqual([]);
	});

	// One direction between one pair carries one directed relationship.
	// customer-supplier is a flavour of upstream/downstream, not a second joint,
	// so both of them the same way round disagree about whether the downstream
	// has a say in the upstream's planning (card 98).
	it("errors on two directed types in the same direction", () => {
		const { ws, a, b } = pair();
		a.upstreamOf(b, { upstreamRoles: ["open-host-service"] });
		const second = a.upstreamOf(b, {
			type: "customer-supplier",
			downstreamRoles: ["conformist"],
		});
		expect(duplicates(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"error",
				'"A" and "B" declare both a upstream-downstream and a customer-supplier relationship with "A" upstream; customer-supplier is a flavour of upstream/downstream, so one direction between one pair carries one directed relationship under one name, and two of them disagree about how the pair stands; name them both — a negotiated API and a tolerated feed are two agreements — or say the two things on one',
				second.ref,
			],
		]);
	});

	// A negotiated fulfilment API and a tolerated legacy feed from the same
	// warehouse are two agreements between one pair in one direction, each with
	// its own roles and disposition, and the name is what tells them apart
	// (decision 15, card 103).
	it("allows two named agreements in one direction, at refs of their own", () => {
		const { ws, a, b } = pair();
		const api = a.upstreamOf(b, {
			name: "Fulfilment API",
			upstreamRoles: ["open-host-service"],
		});
		const feed = a.upstreamOf(b, {
			name: "Legacy Feed",
			downstreamRoles: ["anti-corruption-layer"],
			disposition: "tolerated",
		});
		expect(duplicates(ws)).toEqual([]);
		expect([api.ref, feed.ref]).toEqual([
			"#/relationships/a~upstream-downstream~b~fulfilment_api",
			"#/relationships/a~upstream-downstream~b~legacy_feed",
		]);
		expect(ws.findRelationship(feed.ref)).toBe(feed);
	});

	it("errors on two agreements that share a name, which is one ref twice", () => {
		const { ws, a, b } = pair();
		a.upstreamOf(b, { name: "Legacy Feed" });
		const second = a.upstreamOf(b, { name: "legacy feed" });
		expect(duplicates(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"error",
				'"A" and "B" declare a upstream-downstream relationship called "legacy feed" more than once; the two share a ref, so only the first can be reached and everything said on this one is lost; give the second a name of its own, or say the two things on one of them',
				second.ref,
			],
		]);
	});

	it("errors on a named agreement beside an unnamed one only when both are unnamed", () => {
		const { ws, a, b } = pair();
		a.upstreamOf(b, {});
		a.upstreamOf(b, { name: "Legacy Feed" });
		expect(duplicates(ws)).toEqual([]);
	});

	it("still allows a partnership beside a shared kernel, which say different things", () => {
		const { ws, a, b } = pair();
		a.partnerOf(b);
		a.sharesKernelWith(b);
		expect(duplicates(ws)).toEqual([]);
	});

	it("allows the same type in each direction, which are two dependencies", () => {
		const { ws, a, b } = pair();
		a.upstreamOf(b, {});
		b.upstreamOf(a, {});
		expect(duplicates(ws)).toEqual([]);
	});

	it("reports every copy after the first", () => {
		const { ws, a, b } = pair();
		a.upstreamOf(b, {});
		a.upstreamOf(b, {});
		a.upstreamOf(b, {});
		expect(duplicates(ws)).toHaveLength(2);
	});
});

describe("external-is-boundary", () => {
	/** A context we do not own, and a context of ours that talks to it. */
	function scheme() {
		const ws = emptyWorkspace();
		const external = ws.addBoundedContext("Card Scheme", {
			description: "",
			external: true,
		});
		const ours = ws.addBoundedContext("Payments", { description: "" });
		return { ws, external, ours };
	}

	const boundary = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "external-is-boundary")
			.map((d) => [d.severity, d.message, d.ref]);

	it("refuses an aggregate on a system we do not own", () => {
		const { ws, external } = scheme();
		const ledger = external.addAggregate("Scheme Ledger", { description: "" });
		expect(boundary(ws)).toEqual([
			[
				"error",
				'External context "Card Scheme" declares aggregate "Scheme Ledger"; what happens inside a system we do not own is not ours to state, only what it provides and what it consumes. A kind this system publishes is a schema of this context, and an identity attribute of ours may name that schema instead of inventing the entity behind it',
				ledger.ref,
			],
		]);
	});

	// `internal` says an operation never leaves that system, which is a fact
	// about the insides of a machine we do not run (card 100).
	it("refuses an internal operation on a system we do not own", () => {
		const { ws, external } = scheme();
		const api = external.addService("Scheme API", {
			description: "",
			type: "application",
		});
		const hidden = api.provides("Settle Internally", {
			description: "",
			type: "operation",
			internal: true,
		});
		expect(boundary(ws)).toEqual([
			[
				"error",
				'External context "Card Scheme" marks operation "Settle Internally" internal; whether an operation of a system we do not own stays inside it is not ours to state, only that it exists and who it reaches. Drop internal, or drop the operation if nothing here depends on it',
				hidden.ref,
			],
		]);
	});

	// An event of theirs nobody outside hears is a fact nobody outside can
	// know they raise, which is the same invention as an internal operation
	// and was left unreported until card 102.
	it("refuses an internal event on a system we do not own", () => {
		const { ws, external } = scheme();
		const api = external.addService("Scheme API", {
			description: "",
			type: "application",
		});
		const hidden = api.provides("Ledger Rolled", {
			description: "",
			type: "event",
			internal: true,
		});
		expect(boundary(ws)).toEqual([
			[
				"error",
				'External context "Card Scheme" marks event "Ledger Rolled" internal; whether an event of a system we do not own stays inside it is not ours to state, only that it exists and who it reaches. Drop internal, or drop the event if nothing here depends on it',
				hidden.ref,
			],
		]);
	});

	it("leaves what it offers and what it publishes alone", () => {
		const { ws, external } = scheme();
		const api = external.addService("Scheme API", {
			description: "",
			type: "application",
		});
		api.provides("Submit", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		api.provides("Settled", {
			description: "",
			type: "event",
			pattern: "published-language",
		});
		expect(boundary(ws)).toEqual([]);
	});

	it("refuses a policy and an invariant on it too", () => {
		const { ws, external } = scheme();
		const app = external.addService("Scheme API", {
			description: "",
			type: "application",
		});
		const settled = app.provides("Settled", { description: "", type: "event" });
		const act = app.provides("Retry", { description: "", type: "operation" });
		const policy = external
			.addPolicy("Retry On Settlement", { description: "" })
			.on(settled)
			.issues(act);
		const invariant = external.addInvariant("One Settlement A Day", {
			description: "",
		});
		expect(boundary(ws).map((d) => d[2])).toEqual([policy.ref, invariant.ref]);
	});

	it("leaves what the system provides and consumes alone", () => {
		const { ws, external, ours } = scheme();
		const api = external.addService("Scheme API", {
			description: "",
			type: "application",
		});
		const authorised = api.provides("Authorisation Returned", {
			description: "",
			type: "event",
			pattern: "published-language",
		});
		const ourApp = ours.addService("Payments App", {
			description: "",
			type: "application",
		});
		ourApp.consumes(authorised, { pattern: "anti-corruption-layer" });
		external.upstreamOf(ours, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		expect(boundary(ws)).toEqual([]);
	});

	it("lets a standard's own rule stay on one of its value objects", () => {
		const { ws, external } = scheme();
		// A published rule — a checksum, a field constraint — is the standard's
		// contract rather than a guess about the system's insides, so it stays
		// (decision 28, third amendment).
		const amount = external.addValueObject("Scheme Amount", {
			description: "",
		});
		const minor = amount.addAttribute("minor units", { type: "int64" });
		amount
			.addInvariant("Never Negative", { description: "" })
			.constrains(amount, minor);
		expect(boundary(ws)).toEqual([]);
		expect(
			ws.validate().filter((d) => d.rule === "invariant-in-value-object"),
		).toEqual([]);
	});

	it("checks that rule like any other value object's", () => {
		const { ws, external } = scheme();
		const amount = external.addValueObject("Scheme Amount", {
			description: "",
		});
		const reference = external.addValueObject("Scheme Reference", {
			description: "",
		});
		const reaching = amount
			.addInvariant("Reaches Out", { description: "" })
			.constrains(reference);
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "invariant-in-value-object")
				.map((d) => d.ref),
		).toEqual([reaching.ref]);
	});

	it("leaves the value object itself alone", () => {
		const { ws, external } = scheme();
		external
			.addValueObject("Scheme Amount", { description: "" })
			.addAttribute("minor units", { type: "int64" });
		expect(boundary(ws)).toEqual([]);
	});

	// The two marks look alike and say opposite things about ownership: a mud
	// context is the enterprise's own, however unreadable, and an external one
	// is somebody else's machine (card 98).
	it("refuses a context marked external and a big ball of mud at once", () => {
		const ws = emptyWorkspace();
		const both = ws.addBoundedContext("Ancient Vendor Box", {
			description: "",
			external: true,
			bigBallOfMud: true,
		});
		expect(boundary(ws)).toEqual([
			[
				"error",
				"Bounded context \"Ancient Vendor Box\" is marked both external and a big ball of mud; a mud context is the enterprise's own, however unreadable, and an external one is somebody else's system, so a context is one or the other",
				both.ref,
			],
		]);
	});

	/**
	 * The published contract of a provider's own operation: capture takes a
	 * payment reference and answers with the captured payment (decision 28,
	 * amendment of 2026-09-10).
	 */
	function publishedCapture() {
		const { ws, external, ours } = scheme();
		const api = external.addService("Scheme API", {
			description: "",
			type: "application",
		});
		const request = external.addSchema("Capture Request", { description: "" });
		const reference = request.addAttribute("paymentReference", {
			type: "string",
		});
		const captured = external.addSchema("Captured Payment", {
			description: "",
		});
		const amount = captured.addAttribute("amount", { type: "int64" });
		const capture = api.provides("Capture", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
			schema: request,
			returns: { of: captured },
		});
		return { ws, external, ours, capture, reference, amount };
	}

	it("lets a system we do not own publish the contract of its own operation", () => {
		const { ws, external, capture, reference, amount } = publishedCapture();
		external
			.addInvariant("Capture Needs A Capturable Payment", {
				description: "",
				precondition: true,
			})
			.constrains(capture, reference);
		external
			.addInvariant("Capture Answers With The Captured Payment", {
				description: "",
				postcondition: true,
			})
			.constrains(capture, amount);
		expect(boundary(ws)).toEqual([]);
		// And the rules that read a context invariant are content with it too:
		// the guard is named, and both flags are allowed on one (card 103).
		expect(ws.validate().filter((d) => d.severity === "error")).toEqual([]);
	});

	it("still refuses one with neither flag, and says which is allowed", () => {
		const { ws, external, capture } = publishedCapture();
		const atRest = external
			.addInvariant("One Settlement A Day", { description: "" })
			.constrains(capture);
		expect(boundary(ws)).toEqual([
			[
				"error",
				'External context "Card Scheme" declares invariant "One Settlement A Day", which is neither a precondition nor a postcondition; a rule a system we do not own keeps at rest is not ours to state. What is ours to write down is that system\'s published contract: mark the rule a precondition or a postcondition of one of this context\'s own operations, or a postcondition of one of its own events, or move it to the context of ours that really keeps it',
				atRest.ref,
			],
		]);
	});

	it("still refuses a precondition guarding another context's operation", () => {
		const { ws, external, ours, capture } = publishedCapture();
		const ourCapture = ours
			.addService("Payments App", { description: "", type: "application" })
			.provides("Capture Payment", { description: "", type: "operation" });
		// Its own operation as well, so the one thing reported is the reach
		// outward rather than the missing guard the next test is about.
		const reaching = external
			.addInvariant("Capture Needs An Authorisation", {
				description: "",
				precondition: true,
			})
			.constrains(capture, ourCapture);
		expect(boundary(ws)).toEqual([
			[
				"error",
				'External context "Card Scheme" states a precondition on "Capture Payment", an operation of "Payments"; a system we do not own publishes the contract of what it offers and sends, and promises nothing about anybody else\'s. Move the rule to the context that provides the operation',
				reaching.ref,
			],
		]);
	});

	// Every reach rule walks the modelled contexts, so until card 116 nothing
	// asked what a flagged external invariant named: it could name no
	// operation at all and could reach into one of our aggregates
	// (decision 28, amendment of 2026-09-10, fourth).
	it("refuses a flagged invariant that names none of its own operations", () => {
		const { ws, external } = publishedCapture();
		const unguarded = external.addInvariant("Never Overdrawn", {
			description: "",
			precondition: true,
		});
		expect(boundary(ws)).toEqual([
			[
				"error",
				'External context "Card Scheme" states precondition "Never Overdrawn" on none of its own operations; what a system we do not own publishes is the contract of an operation it offers, so name that operation. A published contract states what one of this system\'s own operations takes and answers with, in the attributes of its own request and answer schemas, what one of its own events carries, in the attributes of that event\'s payload, and what its own value objects are; anything else about that system is ours to guess and not to state',
				unguarded.ref,
			],
		]);
	});

	/** One of our aggregates, for an external rule to reach into. */
	function ourOrder(ours: BoundedContext) {
		const aggregate = ours.addAggregate("Order", { description: "" });
		const order = aggregate.addRootEntity("Order", { description: "" });
		order.addAttribute("id", { type: "int64", identity: true });
		return { order, total: order.addAttribute("total", { type: "int64" }) };
	}

	it("refuses a flagged invariant that constrains one of our entities", () => {
		const { ws, external, ours } = publishedCapture();
		const { total } = ourOrder(ours);
		const reaching = external
			.addInvariant("Capture Within The Order Total", {
				description: "",
				postcondition: true,
			})
			.constrains(total);
		expect(boundary(ws).map((d) => [d[0], d[2]])).toEqual([
			// It names no operation of its own either, so both faults are said.
			["error", reaching.ref],
			["error", reaching.ref],
		]);
		expect(boundary(ws)[1][1]).toBe(
			'External context "Card Scheme" states a postcondition on "Order.total", which is not part of that contract. A published contract states what one of this system\'s own operations takes and answers with, in the attributes of its own request and answer schemas, what one of its own events carries, in the attributes of that event\'s payload, and what its own value objects are; anything else about that system is ours to guess and not to state',
		);
	});

	it("refuses the reach even where the rule does name its own operation", () => {
		const { ws, external, ours, capture } = publishedCapture();
		const { order, total } = ourOrder(ours);
		const reaching = external
			.addInvariant("Capture Within The Order Total", {
				description: "",
				precondition: true,
			})
			.constrains(capture, order, total);
		expect(boundary(ws).map((d) => [d[0], d[2]])).toEqual([
			["error", reaching.ref],
			["error", reaching.ref],
		]);
		expect(boundary(ws).map((d) => d[1])).toEqual([
			expect.stringContaining('states a precondition on "Order"'),
			expect.stringContaining('states a precondition on "Order.total"'),
		]);
	});

	it("lets the contract name its own value object as well as its shapes", () => {
		const { ws, external, capture, reference } = publishedCapture();
		const iban = external.addValueObject("IBAN", { description: "" });
		const checksum = iban.addAttribute("checksum", { type: "string" });
		external
			.addInvariant("Capture Needs A Capturable Payment", {
				description: "",
				precondition: true,
			})
			.constrains(capture, reference, iban, checksum);
		expect(boundary(ws)).toEqual([]);
		expect(ws.validate().filter((d) => d.severity === "error")).toEqual([]);
	});

	// A service's type says where a piece of our own model sits, and a system
	// we do not own has no inside for that distinction to be about; read on an
	// external context, `domain-service-internal` made a provider that wrote
	// `domain` invalid at every operation it publishes (card 116).
	it("does not read the type of an external context's service", () => {
		const { ws, external, ours } = scheme();
		const api = external.addService("Scheme API", {
			description: "",
			type: "domain",
		});
		const capture = api.provides("Capture", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		ours
			.addService("Payments App", { description: "", type: "application" })
			.consumes(capture, { pattern: "anti-corruption-layer" });
		ours.downstreamOf(external, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		expect(ws.validate().filter((d) => d.severity === "error")).toEqual([]);
	});

	/**
	 * A provider that only sends: the webhook it posts, its payload, and one
	 * of our contexts listening. There is no operation to hang the contract on,
	 * which is the case decision 28's fifth amendment is about (card 128).
	 */
	function webhook() {
		const { ws, external, ours } = scheme();
		const api = external.addService("Scheme API", {
			description: "",
			type: "application",
		});
		const payload = external.addSchema("Capture Notification", {
			description: "",
		});
		const amount = payload.addAttribute("amount", { type: "int64" });
		const authorised = payload.addAttribute("authorised", { type: "int64" });
		const notified = api.provides("Payment Captured", {
			description: "",
			type: "event",
			pattern: "published-language",
			schema: payload,
		});
		const ourApp = ours.addService("Payments App", {
			description: "",
			type: "application",
		});
		ourApp.consumes(notified, { pattern: "anti-corruption-layer" });
		external.upstreamOf(ours, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		const record = ourApp.provides("Record Capture", {
			description: "",
			type: "operation",
		});
		ours
			.addPolicy("Record The Capture", { description: "" })
			.on(notified)
			.issues(record);
		return { ws, external, ours, notified, amount, authorised };
	}

	// A webhook payload is published, citable and not the receiver's to
	// promise, which is this record's own argument for an operation contract
	// applied word for word (decision 28, fifth amendment).
	it("lets a system we do not own guarantee what its own event carries", () => {
		const { ws, external, notified, amount, authorised } = webhook();
		external
			.addInvariant("Captured Within The Authorisation", {
				description: "",
				postcondition: true,
			})
			.constrains(notified, amount, authorised);
		expect(boundary(ws)).toEqual([]);
		expect(ws.validate().filter((d) => d.severity === "error")).toEqual([]);
	});

	it("refuses a precondition on one of its events, which has no request", () => {
		const { ws, external, notified, amount } = webhook();
		const before = external
			.addInvariant("Captured Within The Authorisation", {
				description: "",
				precondition: true,
			})
			.constrains(notified, amount);
		// It guards no operation, and the payload is out of a precondition's
		// reach because there is no moment before an event to read it at.
		expect(boundary(ws).map((d) => [d[0], d[2]])).toEqual([
			["error", before.ref],
			["error", before.ref],
		]);
		expect(boundary(ws)[0][1]).toContain(
			'states precondition "Captured Within The Authorisation" on none of its own operations',
		);
		expect(boundary(ws)[1][1]).toContain(
			'states a precondition on "Capture Notification.amount", which is not part of that contract',
		);
	});

	it("refuses a postcondition on another context's event", () => {
		const { ws, external, ours, notified, amount } = webhook();
		const oursEvent = ours.services
			.get("payments_app")
			?.provides("Capture Recorded", { description: "", type: "event" });
		if (!oursEvent) throw new Error("no event");
		const reaching = external
			.addInvariant("Recorded Within The Authorisation", {
				description: "",
				postcondition: true,
			})
			.constrains(notified, oursEvent, amount);
		expect(boundary(ws)).toEqual([
			[
				"error",
				'External context "Card Scheme" states a postcondition on "Capture Recorded", an event of "Payments"; a system we do not own publishes the contract of what it offers and sends, and promises nothing about anybody else\'s. Move the rule to the context that raises the event',
				reaching.ref,
			],
		]);
	});

	it("refuses a postcondition reaching outside the payload it guards", () => {
		const { ws, external, ours, notified, amount } = webhook();
		const { total } = ourOrder(ours);
		const reaching = external
			.addInvariant("Captured Within The Order Total", {
				description: "",
				postcondition: true,
			})
			.constrains(notified, amount, total);
		expect(boundary(ws).map((d) => [d[0], d[2]])).toEqual([
			["error", reaching.ref],
		]);
		expect(boundary(ws)[0][1]).toContain(
			'states a postcondition on "Order.total", which is not part of that contract',
		);
	});

	// The payload of another of its own events is outside this contract too:
	// what is in reach is what the guarded event carries.
	it("refuses a postcondition reaching into another of its own payloads", () => {
		const { ws, external, notified, amount } = webhook();
		const other = external.addSchema("Refund Notification", {
			description: "",
		});
		const refunded = other.addAttribute("amount", { type: "int64" });
		external
			.addService("Refund API", { description: "", type: "application" })
			.provides("Payment Refunded", {
				description: "",
				type: "event",
				pattern: "published-language",
				schema: other,
			});
		const reaching = external
			.addInvariant("Captured Within The Refund", {
				description: "",
				postcondition: true,
			})
			.constrains(notified, amount, refunded);
		expect(boundary(ws).map((d) => [d[0], d[2]])).toEqual([
			["error", reaching.ref],
		]);
		expect(boundary(ws)[0][1]).toContain(
			'states a postcondition on "Refund Notification.amount", which is not part of that contract',
		);
	});

	it("asks an external context for no subdomain", () => {
		const { ws, external } = scheme();
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "context-serves-subdomain")
				.map((d) => d.ref),
		).not.toContain(external.ref);
	});
});

describe("context-serves-subdomain and the shared kernel", () => {
	/**
	 * The shape decision 16's amendment draws: a kernel of Money and
	 * AccountNumber as a context of its own, which `sharers` contexts borrow
	 * from and which serves no subdomain because it serves theirs.
	 */
	function kernel(sharers: number) {
		const ws = emptyWorkspace();
		const platform = ws
			.addDomain("Enterprise", { description: "" })
			.addSubdomain("Payments", { description: "", type: "core" });
		const shared = ws.addBoundedContext("Shared Kernel", { description: "" });
		const money = shared.addValueObject("Money", { description: "" });
		money.addAttribute("amount", { type: "decimal" });
		for (let i = 0; i < sharers; i++) {
			const bc = ws.addBoundedContext(`Sharer ${i}`, {
				description: "",
				subdomains: [platform],
			});
			const agg = bc.addAggregate(`Thing ${i}`, { description: "" });
			const root = agg.addRootEntity(`Thing ${i}`, { description: "" });
			root.addAttribute("Id", { type: "uuid", identity: true });
			root.addAttribute("Total", { type: "Money", valueobject: money });
			bc.sharesKernelWith(shared);
		}
		return { ws, shared };
	}

	const unserved = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "context-serves-subdomain")
			.map((d) => d.ref);

	it("asks a context two others share for no subdomain of its own", () => {
		const { ws, shared } = kernel(2);
		expect(unserved(ws)).toEqual([]);
		expect(shared.subdomains.size).toBe(0);
	});

	it("still asks a context only one other shares with", () => {
		// One sharer is an ordinary pair: the kernel is the two teams' joint
		// model, not a third context under everybody.
		const { ws, shared } = kernel(1);
		expect(unserved(ws)).toEqual([shared.ref]);
	});

	it("still asks a context that also stands in some other relationship", () => {
		// A context that consumes, publishes or conforms is doing something
		// besides being the kernel, and that something serves a subdomain.
		const { ws, shared } = kernel(2);
		ws.addBoundedContext("Elsewhere", { description: "" }).upstreamOf(shared, {
			upstreamRoles: ["published-language"],
		});
		expect(unserved(ws)).toContain(shared.ref);
	});
});

describe("event-unraised", () => {
	function context(external = false) {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Sales", { description: "", external });
		const app = bc.addService("Sales App", {
			description: "",
			type: "application",
		});
		return { ws, bc, app };
	}

	const unraised = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "event-unraised")
			.map((d) => [d.severity, d.message, d.ref]);

	it("warns about an event nothing in the context raises", () => {
		const { ws, app } = context();
		const event = app.provides("Order Placed", {
			description: "",
			type: "event",
		});
		expect(unraised(ws)).toEqual([
			[
				"warning",
				'No operation of "Sales" raises "Order Placed", so the model never says what makes it happen',
				event.ref,
			],
		]);
	});

	it("goes quiet once an operation of the context raises it", () => {
		const { ws, app } = context();
		const event = app.provides("Order Placed", {
			description: "",
			type: "event",
		});
		app
			.provides("Place Order", { description: "", type: "operation" })
			.raises(event);
		expect(unraised(ws)).toEqual([]);
	});

	it("takes an aggregate's operation as the raiser just as well", () => {
		const { ws, bc, app } = context();
		const event = app.provides("Order Placed", {
			description: "",
			type: "event",
		});
		const order = bc.addAggregate("Order", { description: "" });
		order.addRootEntity("Order", { description: "" });
		order
			.provides("Place", {
				description: "",
				type: "operation",
				internal: true,
			})
			.raises(event);
		expect(unraised(ws)).toEqual([]);
	});

	it("says nothing about an operation nobody consumes", () => {
		// Most of a system's public surface is called by people through a user
		// interface, and the model does not treat that as dead (decision 28).
		const { ws, app } = context();
		app.provides("Search Orders", { description: "", type: "operation" });
		expect(unraised(ws)).toEqual([]);
	});

	it("stays quiet on an external context, whose events come from outside", () => {
		const { ws, app } = context(true);
		app.provides("Settlement File Arrived", {
			description: "",
			type: "event",
		});
		expect(unraised(ws)).toEqual([]);
	});
});

describe("a big ball of mud, whose insides nobody can read", () => {
	/** A legacy context of ours, with a cluster and a fact and no insides. */
	function mud(bigBallOfMud = true) {
		const ws = emptyWorkspace();
		const legacy = ws.addBoundedContext("Sovereign Core", {
			description: "",
			bigBallOfMud,
		});
		const feed = legacy
			.addService("Feed", { description: "", type: "application" })
			.provides("Nightly Batch Completed", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
		const cluster = legacy.addAggregate("Account Master", { description: "" });
		const record = cluster.addEntity("Account Record", { description: "" });
		return { ws, legacy, feed, cluster, record };
	}

	const rules = (ws: Workspace, ...ids: string[]) =>
		ws.validate().filter((d) => ids.includes(d.rule));

	/** The four rules that ask a context to be complete about its insides. */
	const COMPLETENESS = [
		"event-unraised",
		"aggregate-root",
		"root-identity",
		"entity-identity",
	];

	it("is asked for no raiser, no root and no identity of any kind", () => {
		const { ws } = mud();
		expect(rules(ws, ...COMPLETENESS)).toEqual([]);
	});

	it("asks a context nobody has called unreadable for all of them", () => {
		const { ws } = mud(false);
		expect(rules(ws, ...COMPLETENESS).map((d) => d.rule)).toEqual([
			"aggregate-root",
			"entity-identity",
			"event-unraised",
		]);
	});

	it("still holds it to the rules about what it does state", () => {
		const { ws, record } = mud();
		// A mud context is exempt from completeness, not from coherence: what it
		// does say has to hold together. Card 90 read entity-identity as the
		// second kind and card 92 as the first — nobody can read a legacy system
		// well enough to say which column tells one row from another, which is
		// the same argument that exempts it from root-identity.
		const key = record.addAttribute("Account Key", {
			type: "string",
			identity: true,
			optional: true,
		});
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "identity-not-optional")
				.map((d) => d.ref),
		).toEqual([key.ref]);
	});
});

describe("subscription-consumed", () => {
	/**
	 * A publisher and a subscriber, with the reaction written as a policy and
	 * nothing else. `consume` hangs the consumption on the service that owns the
	 * reaction, which is what the fix asks for.
	 */
	function subscription({ consume = false } = {}) {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Catalogue", { description: "" });
		const down = ws.addBoundedContext("Search", { description: "" });
		up.upstreamOf(down, { downstreamRoles: ["conformist"] });
		const catalogueApi = up.addService("Catalogue API", {
			description: "",
			type: "application",
		});
		const listed = catalogueApi.provides("Product Listed", {
			description: "",
			type: "event",
			pattern: "published-language",
		});
		const searchApi = down.addService("Search API", {
			description: "",
			type: "application",
		});
		const index = searchApi.provides("Index Product", {
			description: "",
			type: "operation",
			internal: true,
		});
		const policy = down
			.addPolicy("Index on listing", { description: "" })
			.on(listed)
			.issues(index);
		if (consume) searchApi.consumes(listed, { by: [policy] });
		return { ws, up, down, catalogueApi, listed, searchApi, policy };
	}

	const consumed = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "subscription-consumed")
			.map((d) => [d.severity, d.message, d.ref]);

	it("refuses a policy reacting to a neighbour's event with nothing consuming it", () => {
		const { ws, policy } = subscription();
		expect(consumed(ws)).toEqual([
			[
				"error",
				'Policy "Index on listing" reacts to "Product Listed" from "Catalogue", but nothing in "Search" consumes it; a context takes a foreign fact in at its own boundary, so the subscription is a consumption and reads as one on both maps',
				policy.ref,
			],
		]);
	});

	it("goes quiet once the reacting context takes the event in", () => {
		const { ws } = subscription({ consume: true });
		expect(consumed(ws)).toEqual([]);
	});

	it("takes the consumption from anywhere in the context, not only the reactor's own node", () => {
		const { ws, down, listed } = subscription();
		const index = down.addAggregate("Index", { description: "" });
		index
			.addRootEntity("Index", { description: "" })
			.addAttribute("Id", { type: "uuid", identity: true });
		index.consumes(listed, { pattern: "conformist" });
		expect(consumed(ws)).toEqual([]);
	});

	it("says nothing about a reaction to the context's own event", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Sales", { description: "" });
		const app = bc.addService("Sales App", {
			description: "",
			type: "application",
		});
		const placed = app.provides("Order Placed", {
			description: "",
			type: "event",
		});
		const notify = app.provides("Notify", {
			description: "",
			type: "operation",
			internal: true,
		});
		bc.addPolicy("Notify on order", { description: "" })
			.on(placed)
			.issues(notify);
		expect(consumed(ws)).toEqual([]);
	});

	it("reads a process's starts, on and ends the same way", () => {
		const { ws, down, catalogueApi, listed, searchApi } = subscription({
			consume: true,
		});
		const retired = catalogueApi.provides("Product Retired", {
			description: "",
			type: "event",
			pattern: "published-language",
		});
		const process = down
			.addProcess("Reindex", { description: "" })
			.starts(listed)
			.ends(retired);
		expect(consumed(ws)).toEqual([
			[
				"error",
				'Process "Reindex" reacts to "Product Retired" from "Catalogue", but nothing in "Search" consumes it; a context takes a foreign fact in at its own boundary, so the subscription is a consumption and reads as one on both maps',
				process.ref,
			],
		]);
		searchApi.consumes(retired, { pattern: "conformist" });
		expect(consumed(ws)).toEqual([]);
	});
});

describe("consumption-by-required", () => {
	/** A provider's operation and a consumer with `operations` of its own. */
	function calls(operations: number, by = false) {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Ledger", { description: "" });
		const down = ws.addBoundedContext("Payments", { description: "" });
		up.upstreamOf(down, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["conformist"],
		});
		const post = up
			.addService("Ledger API", { description: "", type: "application" })
			.provides("Post Entry", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			});
		const app = down.addService("Payments App", {
			description: "",
			type: "application",
		});
		const own = Array.from({ length: operations }, (_, i) =>
			app.provides(`Step ${i + 1}`, {
				description: "",
				type: "operation",
				internal: true,
			}),
		);
		const consumption = app.consumes(post, {
			pattern: "conformist",
			by: by ? [own[0]] : undefined,
		});
		return { ws, consumption };
	}

	const required = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "consumption-by-required")
			.map((d) => [d.severity, d.message, d.ref]);

	it("asks a consumer with several operations which one calls out", () => {
		const { ws, consumption } = calls(3);
		expect(required(ws)).toEqual([
			[
				"warning",
				'"Payments App" consumes "Post Entry" from "Ledger" without saying which of its own operations makes the call; it provides "Step 1", "Step 2", "Step 3"',
				consumption.ref,
			],
		]);
	});

	it("goes quiet once by names one", () => {
		const { ws } = calls(3, true);
		expect(required(ws)).toEqual([]);
	});

	it("leaves a consumer with one operation alone; it is its own answer", () => {
		expect(required(calls(1).ws)).toEqual([]);
	});

	/**
	 * The subscribe-only application service reaching outward: nothing in the
	 * context can make the call, because there is no operation to name and the
	 * single-operation inference has nothing to infer from. The repair is the
	 * missing operation rather than a missing `by`, and the message says so
	 * (decision 21, second amendment of 2026-09-10; card 130).
	 */
	it("reports a consumer that provides none; nothing there can make the call", () => {
		const { ws, consumption } = calls(0);
		expect(required(ws)).toEqual([
			[
				"warning",
				'"Payments App" consumes "Post Entry" from "Ledger" but provides no operation, so nothing in "Payments" can make the call; add the operation of "Payments App" that makes it and name that operation in by',
				consumption.ref,
			],
		]);
	});

	it("asks nothing of a zero-operation consumer inside an external context", () => {
		const { ws } = calls(0);
		ws.getBoundedContextByRefOrThrow("#/boundedcontexts/payments").external =
			true;
		expect(required(ws)).toEqual([]);
	});

	it("asks nothing of a zero-operation consumer inside a big ball of mud", () => {
		const { ws } = calls(0);
		ws.getBoundedContextByRefOrThrow(
			"#/boundedcontexts/payments",
		).bigBallOfMud = true;
		expect(required(ws)).toEqual([]);
	});

	it("says nothing about a consumed event, which the consumer does not call", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Ledger", { description: "" });
		const down = ws.addBoundedContext("Payments", { description: "" });
		up.upstreamOf(down, { downstreamRoles: ["conformist"] });
		const posted = up
			.addService("Ledger API", { description: "", type: "application" })
			.provides("Entry Posted", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
		const app = down.addService("Payments App", {
			description: "",
			type: "application",
		});
		for (const name of ["One", "Two"])
			app.provides(name, { description: "", type: "operation" });
		app.consumes(posted, { pattern: "conformist" });
		expect(required(ws)).toEqual([]);
	});

	/**
	 * A front on an application service that calls an aggregate of its own
	 * context. `operations` is how many operations the front provides, which is
	 * the whole of what the rule reads.
	 */
	function callsInside(operations: number, by = false) {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Sales", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		agg
			.addRootEntity("Order", { description: "" })
			.addAttribute("Id", { type: "uuid", identity: true });
		const approve = agg.provides("Approve", {
			description: "",
			type: "operation",
			internal: true,
		});
		const app = bc.addService("Sales App", {
			description: "",
			type: "application",
		});
		const own = Array.from({ length: operations }, (_, i) =>
			app.provides(`Step ${i + 1}`, { description: "", type: "operation" }),
		);
		const consumption = app.consumes(approve, {
			by: by ? [own[0]] : undefined,
		});
		return { ws, consumption };
	}

	it("asks a two-operation front inside one context which of them calls", () => {
		const { ws, consumption } = callsInside(2);
		expect(required(ws)).toEqual([
			[
				"warning",
				'"Sales App" consumes "Approve" from "Order" without saying which of its own operations makes the call; it provides "Step 1", "Step 2"',
				consumption.ref,
			],
		]);
	});

	it("goes quiet once the front inside one context names its caller", () => {
		const { ws } = callsInside(2, true);
		expect(required(ws)).toEqual([]);
	});

	it("says nothing about a single-operation front inside one context", () => {
		const { ws } = callsInside(1);
		expect(required(ws)).toEqual([]);
	});

	/**
	 * A consumer whose own context is somebody else's system: `external` for a
	 * payment provider, `bigBallOfMud` for a legacy estate nobody can read.
	 */
	function foreignConsumer(mark: "external" | "bigBallOfMud") {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Ledger", { description: "" });
		const down = ws.addBoundedContext("Scheme", {
			description: "",
			[mark]: true,
		});
		up.upstreamOf(down, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["conformist"],
		});
		const post = up
			.addService("Ledger API", { description: "", type: "application" })
			.provides("Post Entry", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			});
		const app = down.addService("Scheme API", {
			description: "",
			type: "application",
		});
		for (const name of ["Notify", "Settle"])
			app.provides(name, { description: "", type: "operation" });
		app.consumes(post, { pattern: "conformist" });
		return ws;
	}

	it("does not ask an external consumer which of its operations calls out", () => {
		expect(required(foreignConsumer("external"))).toEqual([]);
	});

	it("does not ask a big ball of mud either", () => {
		expect(required(foreignConsumer("bigBallOfMud"))).toEqual([]);
	});
});

describe("valueobject-context", () => {
	/**
	 * The review's probe: a claims context typing a reserve by a policy admin
	 * context's `Money`, with whatever relationship the caller declares.
	 */
	function borrowed() {
		const ws = emptyWorkspace();
		const admin = ws.addBoundedContext("Policy Admin", { description: "" });
		const claims = ws.addBoundedContext("Claims", { description: "" });
		const money = admin.addValueObject("Money", { description: "" });
		money.addAttribute("Amount", { type: "int64" });
		const claim = claims
			.addAggregate("Claim", { description: "" })
			.addRootEntity("Claim", { description: "" });
		claim.addAttribute("Id", { type: "uuid", identity: true });
		const reserve = claim.addAttribute("Reserve", {
			type: "Money",
			valueobject: money,
		});
		claim.uses(money, "reserved-at", "1");
		return { ws, admin, claims, money, claim, reserve };
	}

	const borrowing = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "valueobject-context")
			.map((d) => [d.severity, d.message, d.ref]);

	it("refuses another context's value object where nothing carries it", () => {
		const { ws, reserve } = borrowed();
		expect(borrowing(ws)).toEqual([
			[
				"error",
				'"Claim" in "Claims" types attribute "Reserve" by value object "Money" from "Policy Admin"; a value object is part of one context\'s language, and holding it wants a shared kernel with "Policy Admin", a conformist relationship toward it, or a customer-supplier relationship under which "Claims" is the customer',
				reserve.ref,
			],
		]);
	});

	it("allows it over a shared kernel, either way round", () => {
		const { ws, admin, claims } = borrowed();
		claims.sharesKernelWith(admin);
		expect(borrowing(ws)).toEqual([]);
	});

	it("allows it down a relationship the borrower conforms on", () => {
		const { ws, admin, claims } = borrowed();
		admin.upstreamOf(claims, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		expect(borrowing(ws)).toEqual([]);
	});

	it("refuses it up a relationship the owner conforms on, since the borrowing is one-way", () => {
		const { ws, admin, claims } = borrowed();
		claims.upstreamOf(admin, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		expect(borrowing(ws)).toHaveLength(1);
	});

	/**
	 * The customer of a customer-supplier pair, which declares no downstream
	 * role at all: the pair negotiated the interface, so the supplier's types
	 * are a language the customer had a say in settling. Telling it to call
	 * itself a conformist would be telling it to claim it has no say, which is
	 * the word decision 03's amendment of 2026-09-10 stopped asking for (card
	 * 130).
	 */
	it("allows it to the customer of a customer-supplier pair, with no role written", () => {
		const { ws, admin, claims } = borrowed();
		admin.upstreamOf(claims, {
			type: "customer-supplier",
			upstreamRoles: ["published-language"],
		});
		expect(borrowing(ws)).toEqual([]);
	});

	it("refuses it to the supplier, since that borrowing runs downstream too", () => {
		const { ws, admin, claims } = borrowed();
		claims.upstreamOf(admin, {
			type: "customer-supplier",
			upstreamRoles: ["published-language"],
		});
		expect(borrowing(ws)).toHaveLength(1);
	});

	/**
	 * Partners plan and release together, which is not the same as keeping one
	 * model between them. The answer is a shared kernel beside the partnership,
	 * and the message is what has to say so (decision 16, second amendment of
	 * 2026-09-10).
	 */
	it("refuses it between partners, and names the shared kernel beside the partnership", () => {
		const { ws, admin, claims, reserve } = borrowed();
		claims.partnerOf(admin, { description: "one release train" });
		expect(borrowing(ws)).toEqual([
			[
				"error",
				'"Claim" in "Claims" types attribute "Reserve" by value object "Money" from "Policy Admin"; a value object is part of one context\'s language, and a partnership is not what shares one — "Claims" and "Policy Admin" plan and release together, which is not the same as keeping one model between them — so declare a shared kernel beside the partnership if they really do share this',
				reserve.ref,
			],
		]);
	});

	it("goes quiet once the partners declare the kernel beside the partnership", () => {
		const { ws, admin, claims } = borrowed();
		claims.partnerOf(admin, { description: "one release train" });
		claims.sharesKernelWith(admin, { description: "the money model" });
		expect(borrowing(ws)).toEqual([]);
		expect(
			ws.validate().filter((d) => d.rule === "relationship-duplicate"),
		).toEqual([]);
	});

	it("reads a payload schema's attribute the same way, since the definition is what is borrowed", () => {
		const { ws, claims, money } = borrowed();
		claims.sharesKernelWith(money.boundedcontext);
		const payload = claims.addSchema("Claim Registered");
		const amount = payload.addAttribute("Amount", {
			type: "Money",
			valueobject: money,
		});
		expect(borrowing(ws)).toEqual([]);
		ws.relationships.length = 0;
		expect(borrowing(ws).map(([, , ref]) => ref)).toContain(amount.ref);
	});

	it("says nothing about a value object of the attribute's own context", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Claims", { description: "" });
		const money = bc.addValueObject("Money", { description: "" });
		money.addAttribute("Amount", { type: "int64" });
		const claim = bc
			.addAggregate("Claim", { description: "" })
			.addRootEntity("Claim", { description: "" });
		claim.addAttribute("Id", { type: "uuid", identity: true });
		claim.addAttribute("Reserve", { type: "Money", valueobject: money });
		claim.uses(money, "reserved-at", "1");
		expect(borrowing(ws)).toEqual([]);
	});

	it("wants a relationship for the crossing, as an identity does", () => {
		const { ws, reserve } = borrowed();
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "relationship-declared")
				.map((d) => [d.message, d.ref]),
		).toEqual([
			[
				'"Claims" types "Claim"\'s "Reserve" by "Money" from "Policy Admin", but no relationship says how "Policy Admin" and "Claims" stand to each other',
				reserve.ref,
			],
		]);
	});
});

describe("a relation to a value object of another context", () => {
	/**
	 * An invoice holding a `Money` the model has lent it, with the relation the
	 * map needs for its label and cardinality declared beside the attribute.
	 * The relationship that carries the borrowing is the caller's to declare.
	 */
	function lent() {
		const ws = emptyWorkspace();
		const kernel = ws.addBoundedContext("Financial Primitives", {
			description: "",
		});
		const billing = ws.addBoundedContext("Billing", { description: "" });
		const money = kernel.addValueObject("Money", { description: "" });
		money.addAttribute("Amount Minor", { type: "int64" });
		const invoiceAgg = billing.addAggregate("Invoice", { description: "" });
		const invoice = invoiceAgg.addRootEntity("Invoice", { description: "" });
		invoice.addAttribute("Id", { type: "uuid", identity: true });
		invoice.addAttribute("Lines", { type: "Money[]", valueobject: money });
		invoice.uses(money, "charges", "1..*");
		return { ws, kernel, billing, money, invoice, invoiceAgg };
	}

	const crossings = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) =>
				["cross-context-relation", "valueobject-context"].includes(d.rule),
			)
			.map((d) => [d.rule, d.message]);

	// The rule told the author to hold the value's identity instead, and a
	// value object has none: the only way out was to write nothing, and the
	// label and the cardinality the map cannot otherwise show went with it
	// (decision 14, note of 2026-09-10; card 126).
	it("allows the relation over a shared kernel", () => {
		const { ws, kernel, billing } = lent();
		billing.sharesKernelWith(kernel);
		expect(crossings(ws)).toEqual([]);
	});

	it("allows it where the holder conforms to the value's context", () => {
		const { ws, kernel, billing } = lent();
		kernel.upstreamOf(billing, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		expect(crossings(ws)).toEqual([]);
	});

	// The relation goes exactly where the borrowing goes, so the two rules
	// never disagree about one crossing: an unbacked pair is refused twice,
	// once for the attribute and once for the relation.
	it("still refuses it where no relationship carries the borrowing", () => {
		const { ws } = lent();
		expect(crossings(ws)).toEqual([
			[
				"cross-context-relation",
				'"Invoice" in "Billing" uses "Money" in "Financial Primitives"; a relation reaches another context\'s value object only where the borrowing does, so declare a shared kernel with "Financial Primitives" or a conformist relationship toward it and type an attribute by "Money"',
			],
			[
				"valueobject-context",
				'"Invoice" in "Billing" types attribute "Lines" by value object "Money" from "Financial Primitives"; a value object is part of one context\'s language, and holding it wants a shared kernel with "Financial Primitives", a conformist relationship toward it, or a customer-supplier relationship under which "Billing" is the customer',
			],
		]);
	});

	// Only `uses` reaches a value: the borrowing lends the word, not a place
	// in this context's aggregate structure.
	it("refuses a references relation to it even over a kernel", () => {
		const { ws, kernel, billing, money, invoice } = lent();
		billing.sharesKernelWith(kernel);
		invoice.relations.length = 0;
		invoice.references(money, "for");
		expect(crossings(ws).map(([rule]) => rule)).toEqual([
			"cross-context-relation",
		]);
	});

	// The cardinality the relation adds is still checked against the attribute
	// it draws, which until now no borrowed value's relation could be.
	it("checks the cardinality it adds against the attribute", () => {
		const { ws, kernel, billing, invoice } = lent();
		billing.sharesKernelWith(kernel);
		invoice.relations[0].cardinality = "1";
		const coherence = ws
			.validate()
			.filter((d) => d.rule === "attribute-relation-coherence");
		expect(coherence.map((d) => d.severity)).toEqual(["warning"]);
	});
});

describe("waiting on an answer", () => {
	/**
	 * Payments answers a caller, and Checkout calls it: the shape decision 23's
	 * second amendment is about, named by its origin as the third asks.
	 * `consume` is what makes the answer this context's to hear; `reject` puts
	 * the shape on the operation.
	 */
	function answered({ consume = true, reject = true } = {}) {
		const ws = emptyWorkspace();
		const payments = ws.addBoundedContext("Payments", { description: "" });
		const checkout = ws.addBoundedContext("Checkout", { description: "" });
		payments.upstreamOf(checkout, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		const paymentsApi = payments.addService("Payments API", {
			description: "",
			type: "application",
		});
		const declined = payments.addSchema("Payment Declined");
		const authorise = paymentsApi.provides("Authorise Payment", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
			...(reject && { rejects: [declined] }),
		});
		const orchestrator = checkout.addService("Checkout Orchestrator", {
			description: "",
			type: "application",
		});
		const confirmed = orchestrator.provides("Cart Confirmed", {
			description: "",
			type: "event",
		});
		const ask = orchestrator.provides("Request Authorisation", {
			description: "",
			type: "operation",
			internal: true,
		});
		const reopen = orchestrator.provides("Reopen Cart", {
			description: "",
			type: "operation",
			internal: true,
		});
		orchestrator
			.provides("Confirm Cart", { description: "", type: "operation" })
			.raises(confirmed);
		if (consume)
			orchestrator.consumes(authorise, {
				pattern: "anti-corruption-layer",
				by: [ask],
			});
		const process = checkout
			.addProcess("Checkout", { description: "" })
			.starts(confirmed)
			.on(authorise.rejected(declined))
			.issues(ask, reopen)
			.ends(confirmed);
		return {
			ws,
			payments,
			checkout,
			confirmed,
			declined,
			authorise,
			process,
			ask,
			reopen,
		};
	}

	const kinds = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "consumable-kind")
			.map((d) => [d.severity, d.message, d.ref]);

	it("accepts a refusal of an operation the context consumes", () => {
		expect(kinds(answered().ws)).toEqual([]);
	});

	it("accepts what that operation returns, the same way", () => {
		const { ws, checkout, authorise, declined, ask, reopen } = answered({
			reject: false,
		});
		authorise.returns = declined;
		checkout.processes.clear();
		checkout
			.addPolicy("Reopen on decline", { description: "" })
			.on(authorise.returned())
			// The consumption says "Request Authorisation" makes the call, so the
			// policy that hears the answer is the one that issues it.
			.issues(ask, reopen);
		expect(kinds(ws)).toEqual([]);
	});

	// One consumption in the context is not "anybody here may listen" once it
	// says who calls: the answer went back to the caller, and a second reactor
	// beside it heard nothing (card 104).
	it("refuses a second reactor the lone consumption does not name", () => {
		const { ws, checkout, authorise, declined, reopen } = answered();
		const eavesdropper = checkout
			.addPolicy("Watch declines", { description: "" })
			.on(authorise.rejected(declined))
			.issues(reopen);
		expect(kinds(ws)).toEqual([
			[
				"error",
				`Policy "Watch declines" waits for "Authorise Payment rejects with Payment Declined", but nothing says policy "Watch declines" made that call: it does not issue "Authorise Payment", and no chain of "by" inside "Checkout" runs from an operation it issues to the consumption of "Authorise Payment". An answer comes back to whoever called, routing along the local "by" chain through as many of this context's fronts as it takes, so issue that operation, or say in "by" which of this context's operations makes the call, or react to an event instead`,
				eavesdropper.ref,
			],
		]);
	});

	it("accepts the same reactor once it issues the operation that calls", () => {
		const { ws, checkout, authorise, declined, ask, reopen } = answered();
		checkout.processes.clear();
		checkout
			.addPolicy("Watch declines", { description: "" })
			.on(authorise.rejected(declined))
			.issues(ask, reopen);
		expect(kinds(ws)).toEqual([]);
	});

	it("refuses a rejection the operation never declares, naming what to do", () => {
		const { ws, process } = answered({ reject: false });
		expect(kinds(ws)).toEqual([
			[
				"error",
				'Process "Checkout" waits for "Authorise Payment rejects with Payment Declined", which "Authorise Payment" never declares; wait for an answer the operation says it comes back with, or react to an event instead',
				process.ref,
			],
		]);
	});

	it("refuses an answer from an operation this context never calls", () => {
		const { ws, process } = answered({ consume: false });
		expect(kinds(ws)).toEqual([
			[
				"error",
				'Process "Checkout" waits for "Authorise Payment rejects with Payment Declined", but nothing says process "Checkout" made that call: it does not issue "Authorise Payment", and no chain of "by" inside "Checkout" runs from an operation it issues to the consumption of "Authorise Payment". An answer comes back to whoever called, routing along the local "by" chain through as many of this context\'s fronts as it takes, so issue that operation, or say in "by" which of this context\'s operations makes the call, or react to an event instead',
				process.ref,
			],
		]);
	});

	// An answer comes back to whoever called. A second caller of the same
	// operation, in a context of its own, hears its own call and not this one
	// (decision 23, 2026-09-09 fourth amendment; card 100).
	it("refuses an answer to a call another context made, where by names its caller", () => {
		const { ws, authorise, declined } = answered();
		const fraud = ws.addBoundedContext("Fraud", { description: "" });
		const fraudApp = fraud.addService("Fraud App", {
			description: "",
			type: "application",
		});
		const askFraud = fraudApp.provides("Ask Fraud", {
			description: "",
			type: "operation",
			internal: true,
		});
		const noteFraud = fraudApp.provides("Note Fraud", {
			description: "",
			type: "operation",
			internal: true,
		});
		// Fraud consumes the same operation twice, so nothing is inferred: the
		// two consumptions say which of Fraud's operations makes which call, and
		// the policy issues neither.
		fraudApp.consumes(authorise, {
			pattern: "anti-corruption-layer",
			by: [askFraud],
		});
		fraudApp.consumes(authorise, { pattern: "conformist", by: [noteFraud] });
		const policy = fraud
			.addPolicy("Note on decline", { description: "" })
			.on(authorise.rejected(declined))
			.issues(noteFraud);
		expect(kinds(ws)).toEqual([]);
		// Take the caller it issues out of `by` and nothing says Fraud made the
		// call the policy branches on.
		fraudApp.consumptions[1].by.length = 0;
		fraudApp.consumptions[1].by.push(askFraud);
		expect(kinds(ws).map(([severity, , ref]) => [severity, ref])).toEqual([
			["error", policy.ref],
		]);
	});

	// Decision 21's inference is "a consumer with one operation is its own
	// `by`", and this rule claimed it while asking only whether the lone
	// consumption was silent. So a by-less consumer with three operations was
	// told it might wait on the answer, and `routesTo` — which does ask —
	// drew no step: the process waited for something the flow map never
	// delivered (card 116).
	it("refuses a by-less consumption whose consumer has several operations", () => {
		const { ws, process, authorise } = answered();
		const orchestrator = ws
			.getBoundedContextByRefOrThrow("#/boundedcontexts/checkout")
			.services.get("checkout_orchestrator");
		if (!orchestrator) throw new Error("no service");
		orchestrator.consumptions[0].by.length = 0;
		expect(kinds(ws).map(([severity, , ref]) => [severity, ref])).toEqual([
			["error", process.ref],
		]);
		expect(hearsAnswerOf(process, authorise)).toBe(false);
		expect(routesTo(process, authorise)).toEqual([]);
	});

	it("accepts one whose consumer provides a single operation", () => {
		const { ws, checkout, authorise, declined, confirmed } = answered({
			consume: false,
		});
		checkout.processes.clear();
		// A front of its own: one operation, so there is nothing to choose
		// between and the model is not made to write the only answer there is.
		const front = checkout.addService("Authorisation Client", {
			description: "",
			type: "application",
		});
		const ask = front.provides("Ask For Authorisation", {
			description: "",
			type: "operation",
			internal: true,
		});
		front.consumes(authorise, { pattern: "anti-corruption-layer" });
		const waiting = checkout
			.addProcess("Checkout", { description: "" })
			.starts(confirmed)
			.on(authorise.rejected(declined))
			.issues(ask)
			.ends(confirmed);
		expect(kinds(ws)).toEqual([]);
		expect(hearsAnswerOf(waiting, authorise)).toBe(true);
		expect(routesTo(waiting, authorise)).toEqual([ask]);
	});

	it("accepts the answer of an operation the reactor issues itself", () => {
		// A local call and a branch: the process issues a validator of its own
		const { ws, checkout, declined, reopen, confirmed } = answered({
			consume: false,
			reject: false,
		});
		checkout.processes.clear();
		const verdict = checkout.addSchema("Verdict");
		verdict.addAttribute("ok", { type: "boolean" });
		const validate = checkout
			.addService("Validator", { description: "", type: "domain" })
			.provides("Validate Cart", {
				description: "",
				type: "operation",
				internal: true,
				returns: verdict,
			});
		checkout
			.addProcess("Checkout", { description: "" })
			.starts(confirmed)
			.on(validate.returned())
			.issues(validate, reopen)
			.ends(confirmed);
		expect(declined).toBeDefined();
		expect(kinds(ws)).toEqual([]);
	});

	it("refuses an answer of an operation that returns nothing at the DSL", () => {
		// There is no shape to name, so nothing is built to be waited on: the
		// mistake is refused where it is written, and the message says what to
		// wait on instead.
		const { authorise } = answered({ reject: false });
		expect(() => authorise.returned()).toThrow(
			"Operation Authorise Payment returns nothing",
		);
	});

	// An operation with no `returns` still comes back, and that is all a caller
	// of a command ever learns (decision 13, second amendment; card 99).
	it("accepts the bare completion of an operation that returns nothing", () => {
		const { ws, checkout, authorise, ask, reopen } = answered({
			reject: false,
		});
		checkout.processes.clear();
		checkout
			.addPolicy("Confirm on completion", { description: "" })
			.on(authorise.completed())
			.issues(ask, reopen);
		expect(kinds(ws)).toEqual([]);
	});

	it("names the completion by its origin, and resolves that ref", () => {
		const { ws, authorise } = answered({ reject: false });
		const completion = authorise.completed();
		expect(completion.ref).toBe(`${authorise.ref}/completed`);
		expect(completion.name).toBe("completes");
		expect(completion.origin).toBe("Authorise Payment completes");
		expect(completion.completion).toBe(true);
		expect(completion.many).toBe(false);
		expect(ws.getByRef(completion.ref)).toBe(completion);
	});

	it("refuses the completion of an operation that answers with a shape", () => {
		const { ws, checkout, authorise, declined, reopen } = answered({
			reject: false,
		});
		authorise.returns = declined;
		checkout.processes.clear();
		const policy = checkout
			.addPolicy("Confirm on completion", { description: "" })
			.on(authorise.completed())
			.issues(reopen);
		expect(kinds(ws)).toEqual([
			[
				"error",
				'Policy "Confirm on completion" waits for "Authorise Payment" to complete, but "Authorise Payment" returns "Payment Declined"; wait for that answer, which is the same call coming back and says what it came back with',
				policy.ref,
			],
		]);
	});

	it("refuses the completion of an event, which nobody calls", () => {
		const { ws, checkout, confirmed, reopen } = answered({ reject: false });
		checkout.processes.clear();
		const policy = checkout
			.addPolicy("Confirm on completion", { description: "" })
			.on(confirmed.completed())
			.issues(reopen);
		expect(kinds(ws)).toContainEqual([
			"error",
			'Policy "Confirm on completion" waits for "Cart Confirmed" to complete, but "Cart Confirmed" is an event, not an operation; an event is a fact that already happened and nobody is waiting on it to finish',
			policy.ref,
		]);
	});

	it("round-trips a completion through the schema and back", () => {
		const { ws, checkout, confirmed, authorise, reopen } = answered({
			reject: false,
		});
		checkout.processes.clear();
		const process = checkout
			.addProcess("Checkout", { description: "" })
			.starts(confirmed)
			.on(authorise.completed())
			.issues(reopen)
			.ends(confirmed);
		const rebuilt = Workspace.fromSchema(
			JSON.parse(JSON.stringify(ws.toSchema())),
		);
		expect(
			rebuilt.getProcessByRefOrThrow(process.ref).events.map((it) => it.ref),
		).toEqual([`${authorise.ref}/completed`]);
		expect(rebuilt.toSchema()).toEqual(ws.toSchema());
	});

	it("reads a policy's on and a process's ends the same way", () => {
		const { ws, checkout, confirmed, declined, authorise, reopen } = answered({
			reject: false,
		});
		checkout.processes.clear();
		const policy = checkout
			.addPolicy("Reopen on decline", { description: "" })
			.on(authorise.rejected(declined))
			.issues(reopen);
		expect(kinds(ws).map(([, , ref]) => ref)).toEqual([policy.ref]);
		checkout.policies.clear();
		const process = checkout
			.addProcess("Checkout", { description: "" })
			.starts(confirmed)
			.issues(reopen)
			.ends(authorise.rejected(declined));
		expect(kinds(ws).map(([, , ref]) => ref)).toEqual([process.ref]);
	});

	it("wants a relationship for the crossing the answer is", () => {
		// Without the consumption there is nothing more concrete to name the
		// pair by, so the answer is the crossing the warning reports.
		const { ws } = answered({ consume: false });
		ws.relationships.length = 0;
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "relationship-declared")
				.map((d) => d.message),
		).toContain(
			'Process "Checkout" in "Checkout" waits for "Authorise Payment rejects with Payment Declined" to come back from "Payments", but no relationship says how "Payments" and "Checkout" stand to each other',
		);
	});

	it("asks for no subscription-consumed of its own: the call is the consumption", () => {
		const { ws } = answered();
		expect(
			ws.validate().filter((d) => d.rule === "subscription-consumed"),
		).toEqual([]);
	});

	it("round-trips the answer through the schema and back", () => {
		const { ws, process, declined, authorise } = answered();
		const rebuilt = Workspace.fromSchema(
			JSON.parse(JSON.stringify(ws.toSchema())),
		);
		const waited = rebuilt.getProcessByRefOrThrow(process.ref).events;
		expect(waited.map((it) => it.ref)).toEqual([
			`${authorise.ref}/rejects/${declined.id}`,
		]);
		expect(rebuilt.toSchema()).toEqual(ws.toSchema());
	});

	it("names an answer by its origin, and resolves that ref", () => {
		const { ws, authorise, declined } = answered();
		const rejected = authorise.rejected(declined);
		expect(rejected.ref).toBe(`${authorise.ref}/rejects/payment_declined`);
		expect(ws.getByRef(rejected.ref)).toBe(rejected);
		authorise.returns = declined;
		expect(authorise.returned().ref).toBe(`${authorise.ref}/returns`);
		expect(ws.getByRef(`${authorise.ref}/returns`)).toBe(authorise.returned());
	});

	it("keeps two operations' refusals apart even when the shape is shared", () => {
		// Codex's review, run 4: Authorise and Refund both refuse with one
		// PaymentDeclined, and the reactor named only one of them.
		const { ws, payments, declined, authorise } = answered();
		const refund = payments.services
			.get("payments_api")
			?.provides("Refund Payment", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
				rejects: [declined],
			});
		expect(refund).toBeDefined();
		expect(authorise.rejected(declined)).not.toBe(refund?.rejected(declined));
		// Nothing new to report: the process waits on Authorise's refusal, and
		// Refund's is a different answer nobody named.
		expect(kinds(ws)).toEqual([]);
	});

	/**
	 * The chain the architect's twelfth round drew. A saga issues the use-case
	 * front, the front calls the payments adapter, and the adapter calls the
	 * provider: two hops of the caller's own `by` before the boundary, which is
	 * the shape decision 17 asks for once a context has more than one front.
	 * `deeper` puts a third context past the provider, so the same chain runs on
	 * beyond a boundary the saga said nothing about.
	 */
	function twoFronts({ deeper = false } = {}) {
		const ws = emptyWorkspace();
		const provider = ws.addBoundedContext("Provider", { description: "" });
		const caller = ws.addBoundedContext("Caller", { description: "" });
		provider.upstreamOf(caller, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		const providerApi = provider.addService("Provider API", {
			description: "",
			type: "application",
		});
		const verdict = provider.addSchema("Verdict");
		const authorise = providerApi.provides("Authorise", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
			returns: verdict,
		});
		const useCase = caller.addService("Checkout Use Case", {
			description: "",
			type: "application",
		});
		const adapter = caller.addService("Payments Adapter", {
			description: "",
			type: "application",
		});
		const started = useCase.provides("Checkout Started", {
			description: "",
			type: "event",
		});
		useCase
			.provides("Start Checkout", { description: "", type: "operation" })
			.raises(started);
		const front = useCase.provides("Take Payment", {
			description: "",
			type: "operation",
			internal: true,
		});
		const settle = useCase.provides("Settle", {
			description: "",
			type: "operation",
			internal: true,
		});
		const call = adapter.provides("Call Provider", {
			description: "",
			type: "operation",
			internal: true,
		});
		const retry = adapter.provides("Retry Call", {
			description: "",
			type: "operation",
			internal: true,
		});
		// Hop one: the use case calls the adapter. Hop two: the adapter calls
		// the provider. Each names the operation that makes it, so neither is
		// an inference.
		useCase.consumes(call, { by: [front] });
		adapter.consumes(authorise, {
			pattern: "anti-corruption-layer",
			by: [call],
		});
		const scheme = deeper
			? (() => {
					const bc = ws.addBoundedContext("Scheme", { description: "" });
					bc.upstreamOf(provider, {
						upstreamRoles: ["open-host-service"],
						downstreamRoles: ["anti-corruption-layer"],
					});
					const api = bc.addService("Scheme API", {
						description: "",
						type: "application",
					});
					const decision = bc.addSchema("Scheme Decision");
					const ask = api.provides("Ask Scheme", {
						description: "",
						type: "operation",
						pattern: "open-host-service",
						returns: decision,
					});
					providerApi.consumes(ask, {
						pattern: "anti-corruption-layer",
						by: [authorise],
					});
					return { ask, decision };
				})()
			: undefined;
		const process = caller
			.addProcess("Checkout", { description: "" })
			.starts(started)
			.issues(front, settle)
			.ends(started);
		return { ws, caller, authorise, process, front, call, retry, scheme };
	}

	// `reachedEvents` has always followed `by` through any number of local
	// fronts, and an answer stopped after one: `consumable-kind` then told a
	// saga it had not made a call it plainly made, and dictated which front it
	// had to issue (decision 21, amendment of 2026-09-10; card 126).
	it("routes an answer back along a two-front chain inside the context", () => {
		const { ws, authorise, process, front } = twoFronts();
		process.on(authorise.returned());
		expect(kinds(ws)).toEqual([]);
		expect(hearsAnswerOf(process, authorise)).toBe(true);
		// Drawn from the operation the process issued: the fronts between are
		// the context's own plumbing and take their own steps out.
		expect(routesTo(process, authorise)).toEqual([front]);
	});

	// Every hop of the chain is the caller's own `by`, about its own
	// operations, which is what keeps card 104's rule: past the boundary the
	// provider's chain is the provider's, and nothing here has spoken for it.
	it("stops at the boundary, however far the chain runs on past it", () => {
		const { ws, process, scheme } = twoFronts({ deeper: true });
		if (!scheme) throw new Error("no scheme");
		process.on(scheme.ask.returned());
		expect(kinds(ws).map(([severity, , ref]) => [severity, ref])).toEqual([
			["error", process.ref],
		]);
		expect(hearsAnswerOf(process, scheme.ask)).toBe(false);
		expect(routesTo(process, scheme.ask)).toEqual([]);
	});

	// A ring of calls terminates rather than looping, exactly as
	// `reachedEvents` does.
	it("terminates on a ring of local calls", () => {
		const { ws, authorise, process, front, call, retry } = twoFronts();
		const adapter = ws
			.getBoundedContextByRefOrThrow("#/boundedcontexts/caller")
			.services.get("payments_adapter");
		if (!adapter) throw new Error("no adapter");
		adapter.consumes(call, { by: [retry] });
		adapter.consumes(retry, { by: [call] });
		process.on(authorise.returned());
		expect(hearsAnswerOf(process, authorise)).toBe(true);
		expect(routesTo(process, authorise)).toEqual([front]);
	});

	/**
	 * The architect's thirteenth round. One context with a single-operation
	 * front that calls out, a caller that issues the front, and a bystander
	 * that issues something else entirely and waits on the answer. `explicitBy`
	 * writes down the caller the inference stands in for, so the two runs are
	 * the same model said two ways and have to be read the same way
	 * (decisions 21 and 23; card 128).
	 */
	function bystanders({ explicitBy = false } = {}) {
		const ws = emptyWorkspace();
		const provider = ws.addBoundedContext("Provider", { description: "" });
		const caller = ws.addBoundedContext("Caller", { description: "" });
		provider.upstreamOf(caller, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["conformist"],
		});
		const verdict = provider.addSchema("Verdict");
		verdict.addAttribute("ok", { type: "boolean" });
		const score = provider
			.addService("Provider API", { description: "", type: "application" })
			.provides("Score", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
				returns: verdict,
			});
		const aggregate = caller.addAggregate("Thing", { description: "" });
		aggregate
			.addRootEntity("Thing", { description: "" })
			.addAttribute("id", { type: "uuid", identity: true });
		const started = aggregate.provides("Started", {
			description: "",
			type: "event",
			internal: true,
		});
		aggregate
			.provides("Start", { description: "", type: "operation", internal: true })
			.raises(started);
		const other = aggregate.provides("Do Something Else", {
			description: "",
			type: "operation",
			internal: true,
		});
		// One operation, so the walk reads the service as its own `by` where
		// the consumption stays silent.
		const app = caller.addService("Caller App", {
			description: "",
			type: "application",
		});
		const front = app.provides("Front", {
			description: "",
			type: "operation",
		});
		app.consumes(score, {
			pattern: "conformist",
			...(explicitBy && { by: [front] }),
		});
		const asked = caller
			.addPolicy("Score On Start", { description: "" })
			.on(started)
			.issues(front);
		const bystander = caller
			.addPolicy("Bystander", { description: "" })
			.on(score.returned())
			.issues(other);
		return { ws, caller, score, front, other, started, asked, bystander };
	}

	// Card 126's fourth clause returned the sole operation of a silent
	// consumer as the route for any reactor of the context, without asking
	// whether that reactor issues it. So the bystander heard an answer to
	// somebody else's call — and only with `by` left off, which is the one
	// thing the inference is not allowed to change.
	it("refuses a bystander the answer with by absent exactly as with by written", () => {
		for (const explicitBy of [false, true]) {
			const { ws, score, front, asked, bystander } = bystanders({ explicitBy });
			expect(hearsAnswerOf(asked, score)).toBe(true);
			expect(routesTo(asked, score)).toEqual([front]);
			expect(hearsAnswerOf(bystander, score)).toBe(false);
			expect(routesTo(bystander, score)).toEqual([]);
			expect(kinds(ws).map(([severity, , ref]) => [severity, ref])).toEqual([
				["error", bystander.ref],
			]);
		}
	});

	// And the step the walk drew from that answer closed a ring: the front
	// woke the bystander, the bystander issued an operation raising the fact
	// the first policy reacts to, and `reaction-cycle` reported a chain the
	// model never says happens.
	it("draws no phantom ring through a reactor that made no call", () => {
		for (const explicitBy of [false, true]) {
			const { ws, caller, other, started, bystander } = bystanders({
				explicitBy,
			});
			// The bystander's operation raises what the first policy hears, so
			// an answer routed to it would close the ring.
			other.raises(started);
			expect(ws.validate().filter((d) => d.rule === "reaction-cycle")).toEqual(
				[],
			);
			expect(
				new ReactionChain(caller.workspace.boundedcontexts.values())
					.stepsFrom(other)
					.map((step) => step.to.name),
			).toEqual(["Started"]);
			expect(kinds(ws).map(([severity, , ref]) => [severity, ref])).toEqual([
				["error", bystander.ref],
			]);
		}
	});
});

describe("consumption-by-operation", () => {
	/**
	 * A reactor in one context acting on another's operation, with `by` naming
	 * either the reactor itself or the local operation decision 17 asks for.
	 */
	function reaches({ throughOperation = false } = {}) {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Catalog", { description: "" });
		const down = ws.addBoundedContext("Sales", { description: "" });
		up.upstreamOf(down, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		const catalogApi = up.addService("Catalog API", {
			description: "",
			type: "application",
		});
		const reserve = catalogApi.provides("Reserve Pet", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		const orderApp = down.addService("Order App", {
			description: "",
			type: "application",
		});
		const placed = orderApp.provides("Order Placed", {
			description: "",
			type: "event",
		});
		const local = orderApp.provides("Reserve For Order", {
			description: "",
			type: "operation",
			internal: true,
		});
		const policy = down
			.addPolicy("Reserve on order", { description: "" })
			.on(placed)
			.issues(local);
		const consumption = orderApp.consumes(reserve, {
			pattern: "anti-corruption-layer",
			by: [throughOperation ? local : policy],
		});
		return { ws, down, orderApp, reserve, local, policy, consumption };
	}

	const calls = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "consumption-by-operation")
			.map((d) => [d.severity, d.message, d.ref]);

	it("refuses a policy named as what makes a call", () => {
		const { ws, consumption } = reaches();
		expect(calls(ws)).toEqual([
			[
				"error",
				'"Order App" says its consumption of "Reserve Pet" is made by policy "Reserve on order"; a policy issues an operation of its own context and that operation makes the call, so name that operation here',
				consumption.ref,
			],
		]);
	});

	it("refuses a process the same way, and names it as one", () => {
		const { ws, down, orderApp, reserve, local } = reaches();
		orderApp.consumptions.length = 0;
		const process = down
			.addProcess("Order fulfilment", { description: "" })
			.issues(local);
		orderApp.consumes(reserve, { by: [process] });
		expect(calls(ws).map(([, message]) => message)).toEqual([
			'"Order App" says its consumption of "Reserve Pet" is made by process "Order fulfilment"; a process issues an operation of its own context and that operation makes the call, so name that operation here',
		]);
	});

	it("accepts the local operation the reactor issues", () => {
		expect(calls(reaches({ throughOperation: true }).ws)).toEqual([]);
	});

	it("says nothing about a policy on a consumption of an event, where nothing stands between", () => {
		const { ws, orderApp, down, local } = reaches({ throughOperation: true });
		const upstream = ws.getBoundedContextByRefOrThrow(
			"#/boundedcontexts/catalog",
		);
		const listed = upstream.services
			.get("catalog_api")
			?.provides("Pet Listed", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
		if (!listed) throw new Error("no event");
		const policy = down
			.addPolicy("Note listing", { description: "" })
			.on(listed)
			.issues(local);
		orderApp.consumes(listed, { pattern: "conformist", by: [policy] });
		expect(calls(ws)).toEqual([]);
	});
});

describe("consumption-by-reactor", () => {
	/**
	 * A context taking a neighbour's fact in, with `by` naming either the
	 * reaction that wakes on it or an operation that does not.
	 */
	function subscribes({ throughReactor = false } = {}) {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Catalogue", { description: "" });
		const down = ws.addBoundedContext("Offers", { description: "" });
		up.upstreamOf(down, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		const listed = up
			.addService("Catalogue API", { description: "", type: "application" })
			.provides("Product Listed", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
		const offerApi = down.addService("Offer API", {
			description: "",
			type: "application",
		});
		const record = offerApi.provides("Record Sku", {
			description: "",
			type: "operation",
			internal: true,
		});
		const keep = down
			.addPolicy("Keep the list", { description: "" })
			.on(listed)
			.issues(record);
		const consumption = offerApi.consumes(listed, {
			pattern: "conformist",
			by: [throughReactor ? keep : record],
		});
		return { ws, down, offerApi, listed, record, keep, consumption };
	}

	const woken = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "consumption-by-reactor")
			.map((d) => [d.severity, d.message, d.ref]);

	it("refuses an operation named as what takes a fact in", () => {
		const { ws, consumption } = subscribes();
		expect(woken(ws)).toEqual([
			[
				"error",
				'"Offer API" says its subscription to "Product Listed" is made by the operation "Record Sku"; an operation is issued rather than woken, so name the policy or the process of "Offers" that reacts to the fact — for a projection or a report, that is the policy whose own operation writes what "Record Sku" later reads',
				consumption.ref,
			],
		]);
	});

	it("accepts the policy that reacts", () => {
		expect(woken(subscribes({ throughReactor: true }).ws)).toEqual([]);
	});

	it("accepts a process the same way", () => {
		const { ws, down, offerApi, listed, record } = subscribes();
		offerApi.consumptions.length = 0;
		const relist = down
			.addProcess("Relist", { description: "" })
			.starts(listed)
			.issues(record);
		offerApi.consumes(listed, { pattern: "conformist", by: [relist] });
		expect(woken(ws)).toEqual([]);
	});

	it("says nothing about an operation on a consumption of an operation", () => {
		const { ws, offerApi, record } = subscribes({
			throughReactor: true,
		});
		const upstream = ws.getBoundedContextByRefOrThrow(
			"#/boundedcontexts/catalogue",
		);
		const list = upstream.services.get("catalogue_api")?.provides("List", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		if (!list) throw new Error("no operation");
		offerApi.consumes(list, { by: [record] });
		expect(woken(ws)).toEqual([]);
	});
});

describe("domain-service-consumes-inside", () => {
	/** A domain service reaching out, or the application service doing it for it. */
	function reads({ throughApp = false } = {}) {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Screening", { description: "" });
		const down = ws.addBoundedContext("Customer", { description: "" });
		up.upstreamOf(down, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		const screeningApp = up.addService("Screening App", {
			description: "",
			type: "application",
		});
		const screen = screeningApp.provides("Screen Party", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		const customerApp = down.addService("Customer App", {
			description: "",
			type: "application",
		});
		const ask = customerApp.provides("Screen Customer", {
			description: "",
			type: "operation",
			internal: true,
		});
		const kyc = down.addService("Kyc Screening", {
			description: "",
			type: "domain",
		});
		kyc.provides("Assess", { description: "", type: "operation" });
		if (throughApp) customerApp.consumes(screen, { by: [ask] });
		else kyc.consumes(screen, { pattern: "anti-corruption-layer" });
		return { ws, up, down, screen, kyc, customerApp, screeningApp };
	}

	const inside = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "domain-service-consumes-inside")
			.map((d) => [d.severity, d.message, d.ref]);

	it("refuses a domain service calling another context's operation", () => {
		const { ws, kyc } = reads();
		expect(inside(ws)).toEqual([
			[
				"error",
				'Domain service "Kyc Screening" consumes "Screen Party" from "Screening"; a domain service is the inside of the model, not a client, so let an application service of "Customer" make the call and hand "Kyc Screening" what it needs',
				kyc.ref,
			],
		]);
	});

	it("refuses a foreign event too, and says where the reaction goes", () => {
		const { ws, kyc, screeningApp } = reads({ throughApp: true });
		const matched = screeningApp.provides("Party Matched", {
			description: "",
			type: "event",
			pattern: "published-language",
		});
		kyc.consumes(matched, { pattern: "anti-corruption-layer" });
		expect(inside(ws).map(([, message]) => message)).toEqual([
			'Domain service "Kyc Screening" consumes "Party Matched" from "Screening"; a domain service is the inside of the model, not a client, so let an application service of "Customer" take it in, with the policy or process that reacts to it named in `by` and hand "Kyc Screening" what it needs',
		]);
	});

	it("goes quiet once the application service makes the call", () => {
		expect(inside(reads({ throughApp: true }).ws)).toEqual([]);
	});

	it("says nothing about a domain service consuming its own context's operation", () => {
		const { ws, down, kyc } = reads({ throughApp: true });
		const own = down.services
			.get("customer_app")
			?.provides("Read Customer", { description: "", type: "operation" });
		if (!own) throw new Error("no operation");
		kyc.consumes(own, {});
		expect(inside(ws)).toEqual([]);
	});
});

describe("subscription-backed", () => {
	/** A context taking in a neighbour's event, with or without something under it. */
	function feed() {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Catalogue", { description: "" });
		const down = ws.addBoundedContext("Offers", { description: "" });
		up.upstreamOf(down, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		const catalogueApi = up.addService("Catalogue API", {
			description: "",
			type: "application",
		});
		const listed = catalogueApi.provides("Product Listed", {
			description: "",
			type: "event",
			pattern: "published-language",
		});
		const offerApi = down.addService("Offer API", {
			description: "",
			type: "application",
		});
		const record = offerApi.provides("Record Sku", {
			description: "",
			type: "operation",
			internal: true,
		});
		const consumption = offerApi.consumes(listed, { pattern: "conformist" });
		return { ws, down, offerApi, listed, record, consumption };
	}

	const backed = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "subscription-backed")
			.map((d) => [d.severity, d.message, d.ref]);

	it("warns about an event no reaction of the consumer's context waits for", () => {
		const { ws, consumption } = feed();
		expect(backed(ws)).toEqual([
			[
				"warning",
				'"Offer API" consumes "Product Listed" from "Catalogue", but no policy or process of "Offers" reacts to it; a subscription nothing acts on is a dependency with nothing under it',
				consumption.ref,
			],
		]);
	});

	it("goes quiet when a policy of the consumer's context reacts", () => {
		const { ws, down, listed, record } = feed();
		down
			.addPolicy("Keep the list", { description: "" })
			.on(listed)
			.issues(record);
		expect(backed(ws)).toEqual([]);
	});

	it("goes quiet when a process waits on it, wherever in its lifecycle", () => {
		const { ws, down, listed, record } = feed();
		down
			.addProcess("Relist", { description: "" })
			.starts(listed)
			.issues(record)
			.ends(listed);
		expect(backed(ws)).toEqual([]);
	});

	// Naming an operation in `by` used to clear it, on the reading that a
	// projection updated by an operation had said what the subscription was
	// for. An operation is issued rather than woken, so that pointed at
	// something which does not run when the fact arrives: the reaction is what
	// the model was missing, and `consumption-by-reactor` refuses the `by`
	// outright (card 98).
	it("stays warning when the consumption names an operation of its own", () => {
		const { ws, offerApi, listed, record, consumption } = feed();
		offerApi.consumptions.length = 0;
		const named = offerApi.consumes(listed, {
			pattern: "conformist",
			by: [record],
		});
		expect(named.ref).toBe(consumption.ref);
		expect(backed(ws).map((d) => d[0])).toEqual(["warning"]);
		expect(
			ws.validate().filter((d) => d.rule === "consumption-by-reactor"),
		).toHaveLength(1);
	});

	/**
	 * Our fact goes into a system nobody here can read. Which of its programs
	 * wakes up is not ours to state, and asking sent the author to invent a
	 * policy for it — the invention decision 28 refuses, and the one
	 * `consumption-by-required` already declines to ask for on the other side
	 * of the same exchange (decision 28, note of 2026-09-10, fourth; card 124).
	 */
	function outwardFeed(attributes: {
		bigBallOfMud?: boolean;
		external?: boolean;
	}) {
		const ws = emptyWorkspace();
		const ours = ws.addBoundedContext("Sales", { description: "" });
		const theirs = ws.addBoundedContext("Legacy ERP", {
			description: "",
			...attributes,
		});
		ours.upstreamOf(theirs, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		const placed = ours
			.addService("Sales API", { description: "", type: "application" })
			.provides("Order Placed", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
		const consumption = theirs
			.addService("ERP Interface", { description: "", type: "application" })
			.consumes(placed, { pattern: "conformist" });
		return { ws, consumption };
	}

	it("says nothing when the consumer is a big ball of mud", () => {
		const { ws } = outwardFeed({ bigBallOfMud: true });
		expect(backed(ws)).toEqual([]);
	});

	it("says nothing when the consumer is an external context", () => {
		const { ws } = outwardFeed({ external: true });
		expect(backed(ws)).toEqual([]);
	});

	// The same shape in a context of ours is still asked, so the exemption is
	// the mud's and not the rule going quiet.
	it("still warns about a modelled consumer in the same shape", () => {
		const { ws, consumption } = outwardFeed({});
		expect(backed(ws)).toEqual([
			[
				"warning",
				'"ERP Interface" consumes "Order Placed" from "Sales", but no policy or process of "Legacy ERP" reacts to it; a subscription nothing acts on is a dependency with nothing under it',
				consumption.ref,
			],
		]);
	});

	it("says nothing about a consumed operation, which the consumer calls itself", () => {
		const { ws, down, offerApi } = feed();
		offerApi.consumptions.length = 0;
		const catalogue = ws.getBoundedContextByRefOrThrow(
			"#/boundedcontexts/catalogue",
		);
		const read = catalogue.services
			.get("catalogue_api")
			?.provides("Get Product", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			});
		if (!read) throw new Error("no operation");
		down.services.get("offer_api")?.consumes(read, { pattern: "conformist" });
		expect(backed(ws)).toEqual([]);
	});
});
