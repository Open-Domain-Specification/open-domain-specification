import {
	aggregate,
	application,
	type Case,
	operation,
	runCases,
	world,
} from "./rule-cases.support";

/**
 * Slice 7 of issue #57: value objects, attributes and the shapes an operation
 * answers with. Each pair is one builder taking `hostile`; see
 * `rule-cases.boundary.test.ts` for the shape.
 */

/** One context with Money, a value object, and an Order that holds a Cost of it. */
function shop() {
	const { ws, context } = world();
	const bc = context("Sales");
	const money = bc.addValueObject("Money", { description: "" });
	money.addAttribute("Amount", { type: "int64" });
	const order = aggregate(bc, "Order");
	return { ws, bc, money, order };
}

/** A context with one event and one operation that says what it answers with. */
function answers(fault?: "returns" | "rejects") {
	const { ws, context } = world();
	const bc = context("Sales");
	const app = application(bc);
	const answer = bc.addSchema("Answer");
	const refusal = bc.addSchema("Refusal");
	// An event that says what it answers with or refuses with is the fault.
	const noted = app.provides("Noted", {
		description: "",
		type: "event",
		...(fault === "returns" ? { returns: answer } : {}),
		...(fault === "rejects" ? { rejects: [refusal] } : {}),
	});
	operation(app, "Note", { internal: true }).raises(noted);
	operation(app, "Ask", {
		internal: true,
		returns: answer,
		rejects: [refusal],
	});
	return { ws, bc, app, answer, refusal, noted };
}

const valueCases: Case[] = [
	{
		rules: ["value-object-shape"],
		name: "a value object has no identity attribute",
		fires: ["value-object-shape"],
		build: (hostile) => {
			const { ws, money } = shop();
			money.addAttribute("Currency", { type: "string", identity: hostile });
			return ws;
		},
	},
	{
		rules: ["value-object-shape"],
		name: "a value object uses other values; it does not include them",
		fires: ["value-object-shape"],
		build: (hostile) => {
			const { ws, bc, money } = shop();
			const price = bc.addValueObject("Price", { description: "" });
			price.addAttribute("Cost", { type: "Money", valueobject: money });
			if (hostile) price.includes(money, "holds");
			else price.uses(money, "holds");
			return ws;
		},
	},
	{
		rules: ["value-object-shape"],
		name: "a value object reaches no entity; it holds an identity as an attribute instead",
		// Reaching an entity by uses is also a uses that lands on an entity.
		fires: ["aggregate-tree", "value-object-shape"],
		build: (hostile) => {
			const { ws, bc, money, order } = shop();
			const price = bc.addValueObject("Price", { description: "" });
			price.addAttribute("Cost", { type: "Money", valueobject: money });
			if (hostile) price.uses(order.root, "prices");
			else
				price.addAttribute("OrderId", {
					type: "uuid",
					identifies: order.root,
				});
			return ws;
		},
	},
	{
		rules: ["attribute-relation-coherence"],
		name: "a uses relation to a value object says where in an attribute typed by it",
		fires: ["attribute-relation-coherence"],
		build: (hostile) => {
			const { ws, money, order } = shop();
			if (!hostile)
				order.root.addAttribute("Cost", { type: "Money", valueobject: money });
			order.root.uses(money, "costs");
			return ws;
		},
	},
	{
		rules: ["relation-for-resolves"],
		name: "a relation's for names an attribute of the entity that declares it",
		// A relation drawing an attribute that is not there also matches none.
		fires: ["attribute-relation-coherence", "relation-for-resolves"],
		build: (hostile) => {
			const { ws, money, order } = shop();
			order.root.addAttribute("Cost", { type: "Money", valueobject: money });
			order.root.uses(money, "costs", undefined, {
				for: hostile ? "Missing" : "Cost",
			});
			return ws;
		},
	},
	{
		rules: ["attribute-one-shape"],
		name: "an attribute is typed by a value object or a schema, not both",
		fires: ["attribute-one-shape"],
		build: (hostile) => {
			const { ws, bc, money, order } = shop();
			order.root.addAttribute("Cost", {
				type: "Money",
				valueobject: money,
				schema: hostile ? bc.addSchema("Cost Payload") : undefined,
			});
			return ws;
		},
	},
	{
		rules: ["attribute-one-shape"],
		name: "only a schema's attribute names a schema; an entity's names a value object",
		fires: ["attribute-one-shape"],
		build: (hostile) => {
			const { ws, bc, money, order } = shop();
			order.root.addAttribute(
				"Cost",
				hostile
					? { type: "Cost Payload", schema: bc.addSchema("Cost Payload") }
					: { type: "Money", valueobject: money },
			);
			return ws;
		},
	},
	{
		rules: ["returns-on-operation"],
		name: "an operation declares what it returns; an event is a fact nobody answers",
		fires: ["returns-on-operation"],
		build: (hostile) => {
			return answers(hostile ? "returns" : undefined).ws;
		},
	},
	{
		rules: ["rejects-on-operation"],
		name: "an operation declares what it rejects with; an event has nothing left to refuse",
		fires: ["rejects-on-operation"],
		build: (hostile) => {
			return answers(hostile ? "rejects" : undefined).ws;
		},
	},
	{
		rules: ["rejects-duplicate"],
		name: "an operation declares each rejection schema once",
		fires: ["rejects-duplicate"],
		build: (hostile) => {
			const { ws, context } = world();
			const bc = context("Payments");
			const app = application(bc);
			const refusal = bc.addSchema("Refusal");
			app.provides("Charge", {
				description: "",
				type: "operation",
				rejects: hostile
					? [{ schema: refusal }, { schema: refusal }]
					: [{ schema: refusal }],
			});
			return ws;
		},
	},
];

runCases(
	"rule cases: value objects and attributes",
	["value-objects-and-specialisation"],
	valueCases,
);
