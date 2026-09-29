import {
	aggregate,
	application,
	type Case,
	operation,
	runCases,
	world,
} from "./rule-cases.support";

/**
 * Slice 5 of issue #57: the invariant and contract rules. Each pair is one
 * builder taking `hostile`; see `rule-cases.boundary.test.ts` for the shape.
 *
 * The last pair is for `external-is-boundary`, whose family is boundary and
 * borrowing: it was owed from slice 1 and belongs here because what it pins is
 * how far an external context's published invariant may reach.
 */

/** A context holding an aggregate whose root has a status to constrain. */
function ledger() {
	const { ws, context } = world();
	const bc = context("Sales");
	const order = aggregate(bc, "Order");
	const status = order.root.addAttribute("Status", { type: "string" });
	const front = application(bc);
	const place = operation(front, "Place", { internal: true });
	return { ws, context, bc, order, status, front, place };
}

const invariantCases: Case[] = [
	{
		rules: ["invariant-in-value-object"],
		name: "a value object's invariant constrains its own attributes or those of a value it composes, not another value's",
		fires: ["invariant-in-value-object"],
		build: (hostile) => {
			const { ws, context } = world();
			const bc = context("Sales");
			const money = bc.addValueObject("Money", { description: "" });
			const amount = money.addAttribute("Amount", { type: "int64" });
			const address = bc.addValueObject("Address", { description: "" });
			const line = address.addAttribute("Line", { type: "string" });
			money
				.addInvariant("Amount is not negative", { description: "" })
				.constrains(hostile ? line : amount);
			return ws;
		},
	},
	{
		rules: ["invariant-in-aggregate"],
		name: "an aggregate's invariant constrains what is inside it, not an attribute of another aggregate",
		fires: ["invariant-in-aggregate"],
		build: (hostile) => {
			const { ws, bc, order, status } = ledger();
			const stock = aggregate(bc, "Stock");
			const level = stock.root.addAttribute("Level", { type: "int32" });
			order.agg
				.addInvariant("A placed order has a status", { description: "" })
				.constrains(hostile ? level : status);
			return ws;
		},
	},
	{
		rules: ["invariant-in-context"],
		name: "a context's invariant constrains what is in that context, not an attribute of another context's entity",
		fires: ["invariant-in-context"],
		build: (hostile) => {
			const { ws, context, bc, status, place } = ledger();
			const other = context("Billing");
			const invoice = aggregate(other, "Invoice");
			const total = invoice.root.addAttribute("Total", { type: "int64" });
			bc.addInvariant("Orders are placed with a status", {
				description: "",
			}).constrains(place, hostile ? total : status);
			return ws;
		},
	},
	{
		rules: ["context-invariant-is-checked"],
		name: "a context's invariant names the operation that checks it",
		fires: ["context-invariant-is-checked"],
		build: (hostile) => {
			const { ws, bc, status, place } = ledger();
			const invariant = bc
				.addInvariant("Orders are placed with a status", { description: "" })
				.constrains(status);
			if (!hostile) invariant.constrains(place);
			return ws;
		},
	},
	{
		rules: ["precondition-names-operation"],
		name: "a precondition names the operation it is checked before",
		fires: ["precondition-names-operation"],
		build: (hostile) => {
			const { ws, order, status } = ledger();
			const post = operation(order.agg, "Confirm", { internal: true });
			const invariant = order.agg
				.addInvariant("An order confirms from a status", {
					description: "",
					precondition: true,
				})
				.constrains(status);
			if (!hostile) invariant.constrains(post);
			return ws;
		},
	},
	{
		rules: ["postcondition-names-operation"],
		name: "a postcondition names the operation whose answer it guarantees",
		fires: ["postcondition-names-operation"],
		build: (hostile) => {
			const { ws, order, status } = ledger();
			const post = operation(order.agg, "Confirm", { internal: true });
			const invariant = order.agg
				.addInvariant("A confirmed order has a status", {
					description: "",
					postcondition: true,
				})
				.constrains(status);
			if (!hostile) invariant.constrains(post);
			return ws;
		},
	},
	{
		rules: ["postcondition-names-operation"],
		name: "a rule is a precondition or a postcondition, not both",
		fires: ["postcondition-names-operation"],
		build: (hostile) => {
			const { ws, order, status } = ledger();
			const post = operation(order.agg, "Confirm", { internal: true });
			order.agg
				.addInvariant("A confirmed order has a status", {
					description: "",
					postcondition: true,
					precondition: hostile,
				})
				.constrains(status, post);
			return ws;
		},
	},
	{
		rules: ["external-is-boundary"],
		name: "an external context's published contract reaches the attributes of the shapes its own operation carries, not an attribute of our entity",
		fires: ["external-is-boundary"],
		build: (hostile) => {
			const { ws, context, order } = ledger();
			const scheme = context("Scheme", { external: true });
			const request = scheme.addSchema("Capture Request");
			const reference = request.addAttribute("Reference", { type: "string" });
			const capture = operation(application(scheme), "Capture", {
				pattern: "open-host-service",
				schema: request,
			});
			const contract = scheme
				.addInvariant("Capture takes a capturable payment", {
					description: "",
					precondition: true,
				})
				.constrains(capture);
			contract.constrains(hostile ? order.root : reference);
			return ws;
		},
	},
];

runCases("rule cases: invariants", ["invariants"], invariantCases);
