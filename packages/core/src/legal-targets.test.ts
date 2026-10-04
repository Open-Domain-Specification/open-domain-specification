import { describe, expect, it } from "vitest";
import {
	holderForNew,
	holderOf,
	isLegalTarget,
	type LegalClassId,
	legalTargets,
	relationForChoices,
	systemKindProblem,
} from "./legal-targets";
import type { SetPath } from "./path-codec";
import { REF_KINDS } from "./ref-kinds";
import { mayConstrain } from "./validate";
import { idOf, Workspace } from "./workspace";
import { WorkspaceSet } from "./workspace-set";

const rulesOf = (ws: Workspace) => ws.validate().map((d) => d.rule);

/** "file:context.name" for each candidate, in the order offered. */
function offered(
	set: WorkspaceSet,
	cls: LegalClassId,
	holder: ReturnType<typeof holderOf>,
) {
	return legalTargets(set, cls, holder).map((it) => {
		const context = (it.element as { boundedcontext?: { name: string } })
			.boundedcontext;
		return `${it.file}:${context ? `${context.name}.` : ""}${it.name}`;
	});
}

describe("legal targets that depend on borrowing (C1)", () => {
	/**
	 * `Mine` holds an entity whose attribute may be typed by a value object.
	 * Each neighbour declares a `Money` and one relationship to `Mine`; a second
	 * file has a `Kernel` context of the same local id that also shares a kernel
	 * with `Mine`.
	 */
	function borrowing() {
		const a = new Workspace("A", { description: "", version: "t" });
		const mine = a.addBoundedContext("Mine", { description: "" });
		mine.addValueObject("Own", { description: "" });
		const order = mine.addAggregate("Order", { description: "" });
		const root = order.addRootEntity("Order", { description: "" });
		const neighbour = (name: string) => {
			const context = a.addBoundedContext(name, { description: "" });
			context.addValueObject("Money", { description: "" });
			return context;
		};
		neighbour("Kernel").sharesKernelWith(mine);
		neighbour("Upstream").upstreamOf(mine, { downstreamRoles: ["conformist"] });
		neighbour("Supplier").upstreamOf(mine, { type: "customer-supplier" });
		const partner = neighbour("Partner");
		partner.partnerOf(mine);
		const stranger = neighbour("Stranger");
		// `Mine` is the upstream here, so the borrowing runs the other way.
		mine.upstreamOf(neighbour("Downstream"), {
			downstreamRoles: ["conformist"],
		});
		const b = new Workspace("B", { description: "", version: "t" });
		const kernel = b.addBoundedContext("Kernel", { description: "" });
		kernel.addValueObject("Money", { description: "" });
		kernel.sharesKernelWith(mine);
		const set = WorkspaceSet.fromWorkspaces([
			["a.json", a],
			["b.json", b],
		]);
		return { set, root, partner, stranger, kernel };
	}

	it("offers a kernel, a conformist upstream and a supplier to its customer, not a partner, a stranger or the wrong direction, and keeps equal local ids in two files apart", () => {
		const { set, root, partner, stranger } = borrowing();
		const holder = holderForNew(set, root, "attribute");
		const cls = "LC-VALUE-OBJECT-BORROWABLE";

		expect(offered(set, cls, holder)).toEqual([
			"a.json:Mine.Own",
			"a.json:Kernel.Money",
			"a.json:Upstream.Money",
			"a.json:Supplier.Money",
			"b.json:Kernel.Money",
		]);

		const candidates = legalTargets(set, cls, holder);
		const kernels = candidates.filter(
			(it) =>
				it.name === "Money" &&
				(it.element as { boundedcontext: { name: string } }).boundedcontext
					.name === "Kernel",
		);
		expect(kernels.map((it) => it.file)).toEqual(["a.json", "b.json"]);
		expect(new Set(kernels.map((it) => it.key)).size).toBe(2);

		for (const neighbour of [partner, stranger]) {
			const money = neighbour.valueobjects.get("money");
			if (!money) throw new Error("fixture");
			const verdict = isLegalTarget(set, cls, holder, money);
			expect(verdict.ok).toBe(false);
			if (!verdict.ok) {
				expect(verdict.rule).toBe("valueobject-context");
				expect(verdict.reason).toContain(`"${neighbour.name}"`);
			}
		}
	});
});

describe("what an invariant may constrain (C2)", () => {
	function shop() {
		const ws = new Workspace("Shop", { description: "", version: "t" });
		const bc = ws.addBoundedContext("Shop", { description: "" });
		const money = bc.addValueObject("Money", { description: "" });
		const amount = money.addAttribute("Amount", { type: "number" });
		const unheld = bc.addValueObject("Unheld", { description: "" });
		const order = bc.addAggregate("Order", { description: "" });
		const orderRoot = order.addRootEntity("Order", { description: "" });
		const total = orderRoot.addAttribute("Total", {
			type: "Money",
			valueobject: money,
		});
		const place = order.provides("Place", {
			description: "",
			type: "operation",
		});
		const stock = bc.addAggregate("Stock", { description: "" });
		const stockRoot = stock.addRootEntity("Stock", { description: "" });
		const front = bc.addService("Front", {
			description: "",
			type: "application",
		});
		const request = bc.addSchema("PlaceRequest");
		const requestTotal = request.addAttribute("Total", { type: "number" });
		const submit = front.provides("Submit", {
			description: "",
			type: "operation",
			schema: request,
		});
		const other = ws.addBoundedContext("Other", { description: "" });
		const foreign = other
			.addAggregate("Foreign", { description: "" })
			.addRootEntity("Foreign", { description: "" });
		const set = WorkspaceSet.fromWorkspaces([["shop.json", ws]]);
		return {
			ws,
			set,
			bc,
			money,
			amount,
			unheld,
			order,
			orderRoot,
			total,
			place,
			stockRoot,
			submit,
			request,
			requestTotal,
			foreign,
		};
	}

	const reach = (
		set: WorkspaceSet,
		invariant: Parameters<typeof mayConstrain>[1],
	) =>
		legalTargets(set, "LC-CONSTRAINS", { invariant }).map((it) => it.element);

	it("lets an aggregate's rule reach its own entities, the values they hold and its context's service operations, not an unheld value, a neighbour aggregate or another context", () => {
		const f = shop();
		const reached = reach(f.set, {
			owner: f.order,
			precondition: false,
			postcondition: false,
			guarded: [],
		});
		expect(reached).toEqual(
			expect.arrayContaining([
				f.orderRoot,
				f.total,
				f.place,
				f.money,
				f.amount,
				f.submit,
			]),
		);
		for (const outside of [f.unheld, f.stockRoot, f.foreign, f.requestTotal])
			expect(reached).not.toContain(outside);

		// The validator agrees with what is refused: constraining an unheld value
		// is exactly `invariant-in-aggregate`, constraining a held one is not.
		f.order.addInvariant("Held", { description: "" }).constrains(f.money);
		expect(rulesOf(f.ws)).not.toContain("invariant-in-aggregate");
		f.order.addInvariant("Unheld", { description: "" }).constrains(f.unheld);
		expect(rulesOf(f.ws)).toContain("invariant-in-aggregate");
	});

	it("lets a precondition reach the request its guard takes and nothing it does not", () => {
		const f = shop();
		const plain = {
			owner: f.order,
			precondition: false,
			postcondition: false,
			guarded: [f.submit],
		};
		expect(reach(f.set, plain)).not.toContain(f.requestTotal);
		expect(reach(f.set, { ...plain, precondition: true })).toContain(
			f.requestTotal,
		);
		// A precondition that names no guard reaches no request.
		expect(
			reach(f.set, { ...plain, precondition: true, guarded: [] }),
		).not.toContain(f.requestTotal);
	});

	it("lets a context's rule reach every aggregate of its context but not a value nothing holds", () => {
		const f = shop();
		const reached = reach(f.set, {
			owner: f.bc,
			precondition: false,
			postcondition: false,
			guarded: [],
		});
		expect(reached).toContain(f.orderRoot);
		expect(reached).toContain(f.stockRoot);
		expect(reached).not.toContain(f.unheld);
		expect(reached).not.toContain(f.foreign);
		expect(
			mayConstrain(
				f.set.scope,
				{
					owner: f.order,
					precondition: false,
					postcondition: false,
					guarded: [],
				},
				f.stockRoot,
			),
		).toBe(false);
	});
});

describe("what a relation or an identity may name (C3)", () => {
	function model() {
		const ws = new Workspace("M", { description: "", version: "t" });
		const bc = ws.addBoundedContext("Shop", { description: "" });
		const money = bc.addValueObject("Money", { description: "" });
		const a = bc.addAggregate("A", { description: "" });
		const a1 = a.addRootEntity("A1", { description: "" });
		const a2 = a.addEntity("A2", { description: "" });
		const b = bc.addAggregate("B", { description: "" });
		const b1 = b.addRootEntity("B1", { description: "" });
		const b2 = b.addEntity("B2", { description: "" });
		const kernel = ws.addBoundedContext("Kernel", { description: "" });
		const kernelMoney = kernel.addValueObject("KernelMoney", {
			description: "",
		});
		kernel.sharesKernelWith(bc);
		const far = ws.addBoundedContext("Far", { description: "" });
		const farMoney = far.addValueObject("FarMoney", { description: "" });
		const farRoot = far
			.addAggregate("Far", { description: "" })
			.addRootEntity("Far", { description: "" });
		const gateway = ws.addBoundedContext("Gateway", {
			description: "",
			external: true,
		});
		const set = WorkspaceSet.fromWorkspaces([["m.json", ws]]);
		return {
			ws,
			set,
			bc,
			money,
			a1,
			a2,
			b1,
			b2,
			kernelMoney,
			farMoney,
			farRoot,
			far,
			gateway,
		};
	}

	const names = (
		set: WorkspaceSet,
		cls: LegalClassId,
		holder: ReturnType<typeof holderOf>,
	) => legalTargets(set, cls, holder).map((it) => it.name);

	it("offers by relation type: includes the aggregate's own entities, references also another aggregate's root, uses a value it may hold", () => {
		const m = model();
		const holder = (relation: "includes" | "references" | "uses") => ({
			...holderOf(m.set, m.a1),
			relation,
		});
		expect(names(m.set, "LC-RELATION-TARGET", holder("includes"))).toEqual([
			"A1",
			"A2",
		]);
		expect(names(m.set, "LC-RELATION-TARGET", holder("references"))).toEqual([
			"A1",
			"A2",
			"B1",
		]);
		expect(names(m.set, "LC-RELATION-TARGET", holder("uses"))).toEqual([
			"Money",
			"KernelMoney",
		]);
		// The validator refuses exactly what was not offered.
		m.a1.includes(m.b2, "wrongly");
		m.a1.uses(m.farMoney, "far");
		expect(rulesOf(m.ws)).toEqual(
			expect.arrayContaining([
				"cross-aggregate-reference",
				"cross-context-relation",
			]),
		);
		const refused = isLegalTarget(
			m.set,
			"LC-RELATION-TARGET",
			holder("uses"),
			m.farMoney,
		);
		expect(refused.ok).toBe(false);
		if (!refused.ok) expect(refused.rule).toBe("cross-context-relation");
	});

	it("offers a value object only uses", () => {
		const m = model();
		const holder = {
			...holderOf(m.set, m.money),
			relation: "includes" as const,
		};
		expect(names(m.set, "LC-RELATION-TARGET", holder)).toEqual([]);
		expect(
			names(m.set, "LC-RELATION-TARGET", { ...holder, relation: "uses" }),
		).toEqual(["Money", "KernelMoney"]);
	});

	it("names an entity of any context, an external context, never a modelled one", () => {
		const m = model();
		const holder = holderOf(m.set, m.a1);
		const targets = legalTargets(m.set, "LC-IDENTITY-TARGET", holder).map(
			(it) => it.element,
		);
		expect(targets).toEqual(
			expect.arrayContaining([m.a1, m.b2, m.farRoot, m.gateway]),
		);
		expect(targets).not.toContain(m.far);
		expect(targets).not.toContain(m.bc);
		const refused = isLegalTarget(m.set, "LC-IDENTITY-TARGET", holder, m.far);
		expect(refused.ok).toBe(false);
		if (!refused.ok) expect(refused.reason).toContain('"Far"');
	});
});

describe("what a reaction hears and what a consumer takes (rule bodies, not summaries)", () => {
	function neighbours() {
		const ws = new Workspace("N", { description: "", version: "t" });
		const shop = ws.addBoundedContext("Shop", { description: "" });
		const other = ws.addBoundedContext("Other", { description: "" });
		const receipt = shop.addSchema("Receipt");
		const front = shop.addService("Front", {
			description: "",
			type: "application",
		});
		const charge = front.provides("Charge", {
			description: "",
			type: "operation",
			returns: receipt,
		});
		front.provides("Charged", { description: "", type: "event" });
		const cart = shop.addAggregate("Cart", { description: "" });
		cart.provides("Add", { description: "", type: "operation" });
		shop
			.addAggregate("Wish", { description: "" })
			.provides("Wishlist", { description: "", type: "operation" });
		const calc = shop.addService("Calc", { description: "", type: "domain" });
		calc.provides("Price", { description: "", type: "operation" });
		const svc = other.addService("Svc", {
			description: "",
			type: "application",
		});
		svc.provides("Public", { description: "", type: "event" });
		svc.provides("Hidden", { description: "", type: "event", internal: true });
		svc.provides("OtherOp", { description: "", type: "operation" });
		other
			.addAggregate("OAgg", { description: "" })
			.provides("OAggOp", { description: "", type: "operation" });
		other
			.addService("ODom", { description: "", type: "domain" })
			.provides("ODomOp", { description: "", type: "operation" });
		const hearing = shop.addPolicy("Hearing", { description: "" });
		hearing.issues(charge);
		const deaf = shop.addPolicy("Deaf", { description: "" });
		return {
			ws,
			set: WorkspaceSet.fromWorkspaces([["n.json", ws]]),
			shop,
			other,
			front,
			cart,
			hearing,
			deaf,
		};
	}

	it("offers an answer only to the policy that made the call, and never an operation or another context's internal event", () => {
		const n = neighbours();
		const heard = (policy: typeof n.hearing) =>
			legalTargets(n.set, "LC-POLICY-ON", holderOf(n.set, policy)).map(
				(it) => `${it.kind}:${it.name}`,
			);
		expect(heard(n.hearing)).toEqual([
			"answer:Receipt",
			"event:Charged",
			"event:Public",
		]);
		expect(heard(n.deaf)).toEqual(["event:Charged", "event:Public"]);
		const hidden = n.other.services.get("svc")?.consumables.get("hidden");
		if (!hidden) throw new Error("fixture");
		const verdict = isLegalTarget(
			n.set,
			"LC-POLICY-ON",
			holderOf(n.set, n.hearing),
			hidden,
		);
		expect(verdict.ok).toBe(false);
		if (!verdict.ok) expect(verdict.rule).toBe("internal-consumable");
	});

	it("offers a process its own starting command to wait on, as the validator tolerates, and refuses every other operation", () => {
		const n = neighbours();
		const open = n.cart.consumables.get("add");
		const other = n.front.consumables.get("charge");
		if (!open || !other) throw new Error("fixture");
		const process = n.shop.addProcess("Checkout", { description: "" });
		process.starts(open);
		process.on(open, other);
		const holder = holderOf(n.set, process);
		const verdict = (op: typeof open) =>
			isLegalTarget(n.set, "LC-PROCESS-TRIGGER", holder, op);
		expect(verdict(open).ok).toBe(true);
		const refused = verdict(other);
		expect(refused.ok).toBe(false);
		if (!refused.ok) expect(refused.rule).toBe("consumable-kind");
		const kinds = n.ws
			.validate()
			.filter((d) => d.rule === "consumable-kind")
			.map((d) => d.message);
		expect(kinds).toHaveLength(1);
		expect(kinds[0]).toContain('"Charge"');
	});

	it("keeps an aggregate and a domain service inside their context, and another context's aggregate or domain service operations out of reach but across a kernel", () => {
		const n = neighbours();
		const taken = (consumer: typeof n.cart | typeof n.front) =>
			legalTargets(n.set, "LC-CONSUMED", holderOf(n.set, consumer)).map(
				(it) => it.name,
			);
		// An aggregate takes its own context's, but not the aggregate next door's operation.
		expect(taken(n.cart)).toEqual(["Add", "Charge", "Charged", "Price"]);
		const front = taken(n.front);
		expect(front).toEqual(
			expect.arrayContaining([
				"Charge",
				"Add",
				"Wishlist",
				"Price",
				"Public",
				"OtherOp",
			]),
		);
		expect(front).not.toContain("OAggOp");
		expect(front).not.toContain("ODomOp");
		expect(front).not.toContain("Hidden");
		n.other.sharesKernelWith(n.shop);
		const shared = taken(n.front);
		expect(shared).toContain("OAggOp");
		expect(shared).not.toContain("ODomOp");
	});
});

describe("a reference that is legal beside the fields already chosen (separate ways, one shape, one root)", () => {
	const verdictOf = (
		set: WorkspaceSet,
		cls: LegalClassId,
		holder: ReturnType<typeof holderOf>,
		target: object | undefined,
	) => {
		if (!target) throw new Error("fixture");
		const verdict = isLegalTarget(set, cls, holder, target);
		return verdict.ok ? "ok" : verdict.rule;
	};

	it("refuses a consumption or a subscription across separate ways, and allows it once the contexts are not apart", () => {
		const ws = new Workspace("W", { description: "", version: "t" });
		const mine = ws.addBoundedContext("Mine", { description: "" });
		const theirs = ws.addBoundedContext("Theirs", { description: "" });
		const svc = theirs.addService("Svc", {
			description: "",
			type: "application",
		});
		const op = svc.provides("Op", { description: "", type: "operation" });
		const event = svc.provides("Happened", { description: "", type: "event" });
		const front = mine.addService("Front", {
			description: "",
			type: "application",
		});
		const policy = mine.addPolicy("Listen", { description: "" });
		const set = WorkspaceSet.fromWorkspaces([["w.json", ws]]);
		const check = () => [
			verdictOf(set, "LC-CONSUMED", holderOf(set, front), op),
			verdictOf(set, "LC-POLICY-ON", holderOf(set, policy), event),
		];
		expect(check()).toEqual(["ok", "ok"]);
		mine.separateWaysFrom(theirs);
		expect(check()).toEqual(["separate-ways", "separate-ways"]);
		// The refusal is the validator's own: the same two choices made would be errors.
		front.consumes(op);
		policy.on(event);
		expect(rulesOf(ws)).toContain("separate-ways");
	});

	it("refuses naming a schema beside a value object and a value object beside a schema on one attribute, in either order", () => {
		const ws = new Workspace("W", { description: "", version: "t" });
		const bc = ws.addBoundedContext("Mine", { description: "" });
		const money = bc.addValueObject("Money", { description: "" });
		const payload = bc.addSchema("Payload");
		const typed = bc.addSchema("Typed");
		const byValue = typed.addAttribute("ByValue", {
			type: "Money",
			valueobject: money,
		});
		const byShape = typed.addAttribute("ByShape", {
			type: "Payload",
			schema: payload,
		});
		const plain = typed.addAttribute("Plain", { type: "string" });
		const set = WorkspaceSet.fromWorkspaces([["w.json", ws]]);
		const schemaFor = (attribute: typeof plain) =>
			verdictOf(set, "LC-SCHEMA-ATTRIBUTE", holderOf(set, attribute), payload);
		const valueFor = (attribute: typeof plain) =>
			verdictOf(
				set,
				"LC-VALUE-OBJECT-BORROWABLE",
				holderOf(set, attribute),
				money,
			);
		expect(schemaFor(byValue)).toBe("attribute-one-shape");
		expect(valueFor(byShape)).toBe("attribute-one-shape");
		expect(schemaFor(plain)).toBe("ok");
		expect(valueFor(plain)).toBe("ok");
		// The post-change state: the form clears the sibling in the same edit.
		const cleared = { ...holderOf(set, byValue), attribute: {} };
		expect(verdictOf(set, "LC-SCHEMA-ATTRIBUTE", cleared, payload)).toBe("ok");
	});

	it("refuses a kind of an entity for one marked the root, and allows it for one that is not or is about to stop being", () => {
		const ws = new Workspace("W", { description: "", version: "t" });
		const bc = ws.addBoundedContext("Mine", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		const root = agg.addRootEntity("Order", { description: "" });
		const line = agg.addEntity("Line", { description: "" });
		const set = WorkspaceSet.fromWorkspaces([["w.json", ws]]);
		const kindOf = (holder: ReturnType<typeof holderOf>) =>
			verdictOf(set, "LC-OWN-AGGREGATE-ENTITY", holder, line);
		expect(kindOf(holderOf(set, root))).toBe("specialisation-not-root");
		expect(kindOf({ ...holderOf(set, root), root: false })).toBe("ok");
		expect(
			verdictOf(set, "LC-OWN-AGGREGATE-ENTITY", holderOf(set, line), root),
		).toBe("ok");
	});
});

describe("ids and flags (C4)", () => {
	it("gives the id the DSL gives an element", () => {
		const ws = new Workspace("W", { description: "", version: "t" });
		const bc = ws.addBoundedContext("Order Item", { description: "" });
		expect(bc.id).toBe(idOf("Order Item"));
		expect(idOf("Order Item")).toBe("order_item");
		expect(idOf("Order Item", "custom")).toBe("custom");
	});

	it("refuses a kind exactly where the validator refuses the flag", () => {
		const build = (flags: { external?: boolean; boundaryOnly?: boolean }) => {
			const ws = new Workspace("W", { description: "", version: "t" });
			const bc = ws.addBoundedContext("Ctx", { description: "", ...flags });
			return { ws, bc };
		};
		const withAggregate = build({ external: true });
		withAggregate.bc.addAggregate("Held", { description: "" });
		expect(rulesOf(withAggregate.ws)).toContain("external-is-boundary");
		expect(systemKindProblem(withAggregate.bc, "external")).toContain('"Held"');
		expect(systemKindProblem(withAggregate.bc, "modelled")).toBeUndefined();
		expect(systemKindProblem(withAggregate.bc, "bigBallOfMud")).toBeUndefined();

		const empty = build({ external: true });
		expect(rulesOf(empty.ws)).not.toContain("external-is-boundary");
		expect(systemKindProblem(empty.bc, "external")).toBeUndefined();

		const withInvariant = build({ boundaryOnly: true });
		withInvariant.bc.addInvariant("Rule", { description: "" });
		expect(rulesOf(withInvariant.ws)).toContain("boundary-only-is-boundary");
		expect(systemKindProblem(withInvariant.bc, "boundaryOnly")).toContain(
			'"Rule"',
		);
	});

	it("lists the attributes a relation may draw, inherited ones included", () => {
		const ws = new Workspace("W", { description: "", version: "t" });
		const bc = ws.addBoundedContext("Ctx", { description: "" });
		const parent = bc
			.addAggregate("A", { description: "" })
			.addRootEntity("Parent", { description: "" });
		parent.addAttribute("Id", { type: "string" });
		const kind = bc.aggregates
			.get("a")
			?.addEntity("Kind", { description: "", specialises: parent });
		kind?.addAttribute("Extra", { type: "string" });
		if (!kind) throw new Error("fixture");
		expect(relationForChoices(kind)).toEqual(["Extra", "Id"]);
	});
});

describe("asking the same question of the set before and after a change", () => {
	it("refuses a ref that was legal when the form opened and became illegal, though the ref string is still in the file", () => {
		const ws = new Workspace("W", { description: "", version: "t" });
		const mine = ws.addBoundedContext("Mine", { description: "" });
		const kernel = ws.addBoundedContext("Kernel", { description: "" });
		const money = kernel.addValueObject("Money", { description: "" });
		kernel.sharesKernelWith(mine);
		const entity = mine
			.addAggregate("Order", { description: "" })
			.addRootEntity("Order", { description: "" });
		entity.addAttribute("Price", { type: "Money", valueobject: money });
		const opened = WorkspaceSet.fromWorkspaces([["w.json", ws]]);

		// The file as it is after the relationship was removed, and nothing else.
		const files = opened.toSchemas();
		const schema = files.get("w.json" as SetPath);
		if (!schema) throw new Error("fixture");
		const written = JSON.stringify(schema);
		expect(written).toContain("#/boundedcontexts/kernel/valueobjects/money");
		schema.relationships = [];
		const saved = WorkspaceSet.fromSchemas(files);

		const verdictIn = (set: WorkspaceSet) => {
			const file = set.byPath("w.json" as SetPath);
			if (!file) throw new Error("fixture");
			const attribute = file.boundedcontexts
				.get("mine")
				?.aggregates.get("order")
				?.entities.get("order")
				?.attributes.get("price");
			if (!attribute) throw new Error("fixture");
			const ref = set.resolve(
				file,
				"#/boundedcontexts/kernel/valueobjects/money",
				REF_KINDS.valueObject,
			);
			if (!ref.ok) throw new Error(ref.detail);
			return isLegalTarget(
				set,
				"LC-VALUE-OBJECT-BORROWABLE",
				holderOf(set, attribute),
				ref.target,
			);
		};

		expect(verdictIn(opened).ok).toBe(true);
		expect(verdictIn(saved).ok).toBe(false);
		// An element of the set the question was not built on is a caller's mistake.
		expect(() => holderOf(saved, entity)).toThrow(/not an element of this set/);
	});
});

describe("a relationship's ends, judged on the relationship itself", () => {
	it("refuses, from the element a set holds, a context that is both ends, and keeps two different ends legal", () => {
		const ws = new Workspace("W", { description: "", version: "t" });
		ws.addBoundedContext("A", { description: "" });
		ws.addBoundedContext("B", { description: "" });
		const files = WorkspaceSet.fromWorkspaces([["w.json", ws]]).toSchemas();
		const schema = files.get("w.json" as SetPath);
		if (!schema) throw new Error("fixture");
		const end = (id: string) => ({ $ref: `#/boundedcontexts/${id}` });
		schema.relationships = [
			{ type: "partnership", participants: [end("a"), end("a")] },
			{ type: "partnership", participants: [end("a"), end("b")] },
		] as never;
		const set = WorkspaceSet.fromSchemas(files);
		const file = set.byPath("w.json" as SetPath);
		if (!file) throw new Error("fixture");
		const [same, apart] = file.relationships;
		const a = file.boundedcontexts.get("a");
		const b = file.boundedcontexts.get("b");
		if (!same || !apart || !a || !b) throw new Error("fixture");

		const refused = isLegalTarget(set, "LC-CONTEXT", holderOf(set, same), a);
		expect(refused.ok).toBe(false);
		expect(!refused.ok && refused.rule).toBe("relationship-ends");
		expect(isLegalTarget(set, "LC-CONTEXT", holderOf(set, same), b).ok).toBe(
			true,
		);
		for (const end of [a, b])
			expect(
				isLegalTarget(set, "LC-CONTEXT", holderOf(set, apart), end).ok,
			).toBe(true);
	});
});
