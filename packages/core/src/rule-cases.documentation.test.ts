import { aggregate, type Case, runCases, world } from "./rule-cases.support";

/**
 * Slice 8 of issue #57: the glossary, the strategic map and the evidence the
 * strategy carries. Each pair is one builder taking `hostile`; see
 * `rule-cases.boundary.test.ts` for the shape.
 */

const because = [{ text: "B reads A through a nightly export." }];

const documentationCases: Case[] = [
	{
		rules: ["term-in-context"],
		name: "a glossary term is embodied by an element of its own context, not a neighbour's",
		fires: ["term-in-context"],
		build: (hostile) => {
			const { ws, context } = world();
			const sales = context("Sales");
			const billing = context("Billing");
			const order = aggregate(sales, "Order");
			const invoice = aggregate(billing, "Invoice");
			sales.addTerm("Order", {
				definition: "What a customer places.",
				embodiedBy: hostile ? invoice.root : order.root,
			});
			return ws;
		},
	},
	{
		rules: ["context-serves-subdomain"],
		name: "a context serves a subdomain",
		fires: ["context-serves-subdomain"],
		build: (hostile) => {
			const { ws, context } = world();
			context("Sales", { serves: !hostile });
			return ws;
		},
	},
	{
		rules: ["context-serves-subdomain"],
		name: "an external context serves no subdomain and is not asked to",
		fires: ["context-serves-subdomain"],
		build: (hostile) => {
			const { ws, context } = world();
			context("Scheme", { external: !hostile, serves: false });
			return ws;
		},
	},
	{
		rules: ["context-serves-subdomain"],
		name: "a shared kernel context serves none, but only where two or more contexts share it",
		fires: ["context-serves-subdomain"],
		build: (hostile) => {
			const { ws, context } = world();
			const kernel = context("Kernel", { serves: false });
			const money = kernel.addValueObject("Money", { description: "" });
			money.addAttribute("Amount", { type: "int64" });
			for (const name of hostile ? ["Sales"] : ["Sales", "Billing"]) {
				const sharer = context(name);
				sharer.sharesKernelWith(kernel);
				aggregate(sharer, `${name} Record`).root.addAttribute("Total", {
					type: "Money",
					valueobject: money,
				});
			}
			return ws;
		},
	},
	{
		rules: ["comments-required"],
		name: "where comments are required, every relationship carries one",
		fires: ["comments-required"],
		build: (hostile) => {
			const { ws, context } = world({ commentsRequired: true });
			context("Up").upstreamOf(context("Down"), {
				comments: hostile ? [] : because,
			});
			return ws;
		},
	},
	{
		rules: ["comments-required"],
		name: "comments are required only where the workspace asks for them",
		fires: ["comments-required"],
		build: (hostile) => {
			const { ws, context } = world({ commentsRequired: hostile });
			context("Up").upstreamOf(context("Down"));
			return ws;
		},
	},
	{
		rules: ["disposition-needs-comment"],
		name: "a tolerated relationship says in a comment what makes it so",
		fires: ["disposition-needs-comment"],
		build: (hostile) => {
			const { ws, context } = world();
			context("Up").upstreamOf(context("Down"), {
				disposition: "tolerated",
				comments: hostile ? [] : because,
			});
			return ws;
		},
	},
	{
		rules: ["disposition-needs-comment"],
		name: "a relationship that is how it should be, by design, owes no comment",
		fires: ["disposition-needs-comment"],
		build: (hostile) => {
			const { ws, context } = world();
			context("Up").upstreamOf(context("Down"), {
				disposition: hostile ? "refactor" : "by-design",
			});
			return ws;
		},
	},
];

runCases(
	"rule cases: documentation and strategy",
	["documentation-and-strategy"],
	documentationCases,
);
