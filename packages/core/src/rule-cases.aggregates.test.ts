import { aggregate, type Case, runCases, world } from "./rule-cases.support";

/**
 * Slice 6 of issue #57: aggregates, their entities and their identities. Each
 * pair is one builder taking `hostile`; see `rule-cases.boundary.test.ts` for
 * the shape.
 */

/** One context, and an aggregate the rules below can hang something off. */
function sales() {
	const { ws, context } = world();
	const bc = context("Sales");
	const order = aggregate(bc, "Order");
	return { ws, bc, order };
}

/** A child entity of `agg`, with an identity of its own. */
function child(agg: ReturnType<typeof aggregate>["agg"], name: string) {
	const entity = agg.addEntity(name, { description: "" });
	entity.addAttribute(`${name} Id`, { type: "uuid", identity: true });
	return entity;
}

const aggregateCases: Case[] = [
	{
		rules: ["aggregate-root"],
		name: "an aggregate has a root entity",
		fires: ["aggregate-root"],
		build: (hostile) => {
			const { ws, bc } = sales();
			const agg = bc.addAggregate("Stock", { description: "" });
			const entity = agg.addEntity("Stock", {
				description: "",
				root: !hostile,
			});
			entity.addAttribute("Id", { type: "uuid", identity: true });
			return ws;
		},
	},
	{
		rules: ["aggregate-root"],
		name: "an aggregate has one root entity, not two",
		fires: ["aggregate-root"],
		build: (hostile) => {
			const { ws, bc } = sales();
			const agg = bc.addAggregate("Stock", { description: "" });
			const first = agg.addRootEntity("Stock", { description: "" });
			first.addAttribute("Id", { type: "uuid", identity: true });
			const second = hostile
				? agg.addRootEntity("Shelf", { description: "" })
				: agg.addEntity("Shelf", { description: "" });
			second.addAttribute("Shelf Id", { type: "uuid", identity: true });
			if (!hostile) first.includes(second, "holds");
			return ws;
		},
	},
	{
		rules: ["cross-aggregate-reference"],
		name: "across aggregates a relation references, it does not include",
		fires: ["cross-aggregate-reference"],
		build: (hostile) => {
			const { ws, bc, order } = sales();
			const stock = aggregate(bc, "Stock");
			if (hostile) order.root.includes(stock.root, "holds");
			else order.root.references(stock.root, "reserves");
			return ws;
		},
	},
	{
		rules: ["cross-aggregate-reference"],
		name: "a reference into another aggregate lands on its root, not on a child",
		fires: ["cross-aggregate-reference"],
		build: (hostile) => {
			const { ws, bc, order } = sales();
			const stock = aggregate(bc, "Stock");
			const shelf = child(stock.agg, "Shelf");
			stock.root.includes(shelf, "holds");
			order.root.references(hostile ? shelf : stock.root, "reserves");
			return ws;
		},
	},
	{
		rules: ["root-identity"],
		name: "the root of an aggregate declares an identity",
		fires: ["root-identity"],
		build: (hostile) => {
			const { ws, bc } = sales();
			const agg = bc.addAggregate("Stock", { description: "" });
			const root = agg.addRootEntity("Stock", { description: "" });
			root.addAttribute("Id", { type: "uuid", identity: !hostile });
			return ws;
		},
	},
	{
		rules: ["entity-identity"],
		name: "a child entity declares an identity, or it is a value object",
		fires: ["entity-identity"],
		build: (hostile) => {
			const { ws, order } = sales();
			const line = order.agg.addEntity("Line", { description: "" });
			line.addAttribute("Line Id", { type: "uuid", identity: !hostile });
			order.root.includes(line, "holds");
			return ws;
		},
	},
	{
		rules: ["identity-not-optional"],
		name: "an identity attribute is never optional",
		fires: ["identity-not-optional"],
		build: (hostile) => {
			const { ws, bc } = sales();
			const agg = bc.addAggregate("Stock", { description: "" });
			const root = agg.addRootEntity("Stock", { description: "" });
			root.addAttribute("Id", {
				type: "uuid",
				identity: true,
				optional: hostile,
			});
			return ws;
		},
	},
	{
		rules: ["aggregate-tree"],
		name: "inside an aggregate an entity is included, not used",
		// A used entity is also one nothing reaches by includes or references.
		fires: ["aggregate-tree", "aggregate-tree"],
		build: (hostile) => {
			const { ws, order } = sales();
			const line = child(order.agg, "Line");
			if (hostile) order.root.uses(line, "holds");
			else order.root.includes(line, "holds");
			return ws;
		},
	},
	{
		rules: ["aggregate-tree"],
		name: "an entity uses a value object; it does not include one",
		fires: ["aggregate-tree"],
		build: (hostile) => {
			const { ws, bc, order } = sales();
			const money = bc.addValueObject("Money", { description: "" });
			money.addAttribute("Amount", { type: "int64" });
			order.root.addAttribute("Cost", { type: "Money", valueobject: money });
			if (hostile) order.root.includes(money, "costs");
			else order.root.uses(money, "costs");
			return ws;
		},
	},
	{
		rules: ["aggregate-tree"],
		name: "every entity of an aggregate is reachable from its root",
		fires: ["aggregate-tree"],
		build: (hostile) => {
			const { ws, order } = sales();
			const line = child(order.agg, "Line");
			if (!hostile) order.root.includes(line, "holds");
			return ws;
		},
	},
	{
		rules: ["specialisation-cycle"],
		name: "no chain of kinds returns to where it started",
		fires: ["specialisation-cycle"],
		build: (hostile) => {
			const { ws, order } = sales();
			const parent = child(order.agg, "Parent");
			const kind = order.agg.addEntity("Kind", {
				description: "",
				specialises: parent,
			});
			order.root.includes(parent, "holds");
			if (hostile) parent.specialises = kind;
			return ws;
		},
	},
	{
		rules: ["specialisation-not-root"],
		name: "a kind of an entity is not itself the aggregate's root",
		// Two roots is what marking the kind a root makes of the aggregate, and
		// a root of its own is asked for an identity of its own.
		fires: ["aggregate-root", "root-identity", "specialisation-not-root"],
		build: (hostile) => {
			const { ws, order } = sales();
			order.agg.addEntity("Rush order", {
				description: "",
				root: hostile,
				specialises: order.root,
			});
			return ws;
		},
	},
	{
		rules: ["specialisation-redeclares"],
		name: "a kind does not declare an attribute its parent already has",
		fires: ["specialisation-redeclares"],
		build: (hostile) => {
			const { ws, order } = sales();
			const kind = order.agg.addEntity("Rush order", {
				description: "",
				specialises: order.root,
			});
			kind.addAttribute(hostile ? "Id" : "Deadline", { type: "string" });
			return ws;
		},
	},
];

runCases(
	"rule cases: aggregates and identity",
	["aggregates-and-identity"],
	aggregateCases,
);
