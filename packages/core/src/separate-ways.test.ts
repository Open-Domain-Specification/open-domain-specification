import { describe, expect, it } from "vitest";
import { Workspace } from "./workspace";

type Fixture = {
	workspace: Workspace;
	ref: string;
	message: string;
};

type BorrowingRoute = "kernel" | "conformist" | "customer" | "none";

const pair = (separate: boolean, route: BorrowingRoute = "kernel") => {
	const workspace = new Workspace("Apart", {
		description: "",
		version: "0",
	});
	const subdomain = workspace
		.addDomain("Business", { description: "" })
		.addSubdomain("Work", { description: "", type: "core" });
	const owner = subdomain.addBoundedcontext("Owner", { description: "" });
	const borrower = subdomain.addBoundedcontext("Borrower", { description: "" });
	if (route === "kernel") owner.sharesKernelWith(borrower);
	if (route === "conformist")
		owner.upstreamOf(borrower, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
	if (route === "customer")
		owner.upstreamOf(borrower, { type: "customer-supplier" });
	if (separate) owner.separateWaysFrom(borrower);
	return { workspace, owner, borrower };
};

const cases: Array<[string, (separate: boolean) => Fixture]> = [
	[
		"value-object attribute",
		(separate) => {
			const { workspace, owner, borrower } = pair(separate);
			const money = owner.addValueObject("Money", { description: "" });
			const invoice = borrower.addValueObject("Invoice Total", {
				description: "",
			});
			const amount = invoice.addAttribute("Amount", {
				type: "Money",
				valueobject: money,
			});
			return {
				workspace,
				ref: amount.ref,
				message:
					'"Borrower" types "Invoice Total"\'s "Amount" by "Money" from "Owner"',
			};
		},
	],
	[
		"value-object specialisation",
		(separate) => {
			const { workspace, owner, borrower } = pair(separate);
			const parent = owner.addValueObject("Parent", { description: "" });
			parent.addAttribute("Amount", { type: "decimal" });
			const child = borrower.addValueObject("Child", {
				description: "",
				specialises: parent,
			});
			return {
				workspace,
				ref: child.ref,
				message: '"Borrower" specialises "Child" from "Parent" in "Owner"',
			};
		},
	],
	[
		"schema composition",
		(separate) => {
			const { workspace, owner, borrower } = pair(separate);
			const shape = owner.addSchema("Shape", { description: "" });
			shape.addAttribute("Amount", { type: "decimal" });
			const envelope = borrower.addSchema("Envelope", { description: "" });
			const nested = envelope.addAttribute("Shape", {
				type: "Shape",
				schema: shape,
			});
			return {
				workspace,
				ref: nested.ref,
				message:
					'"Borrower" types "Envelope"\'s "Shape" by schema "Shape" from "Owner"',
			};
		},
	],
	...(["service", "aggregate"] as const).flatMap((providerKind) =>
		(["request", "return", "rejection"] as const).map(
			(kind): [string, (separate: boolean) => Fixture] => [
				`${providerKind} ${kind} schema`,
				(separate) => {
					const { workspace, owner, borrower } = pair(separate);
					const shape = owner.addSchema("Shape", { description: "" });
					const aggregate =
						providerKind === "aggregate"
							? borrower.addAggregate("Ledger", { description: "" })
							: undefined;
					aggregate
						?.addRootEntity("Ledger", { description: "" })
						.addAttribute("Ledger Id", { type: "uuid", identity: true });
					const provider =
						aggregate ??
						borrower.addService("Application", {
							description: "",
							type: "application",
						});
					const operation = provider.provides("Act", {
						description: "",
						type: "operation",
						internal: providerKind === "aggregate",
						...(kind === "request" ? { schema: shape } : {}),
						...(kind === "return" ? { returns: shape } : {}),
						...(kind === "rejection" ? { rejects: [shape] } : {}),
					});
					return {
						workspace,
						ref: operation.ref,
						message: `"Borrower" ${kind === "request" ? "carries" : kind === "return" ? "returns" : "rejects with"} schema "Shape" from "Owner"`,
					};
				},
			],
		),
	),
];

const diagnostics = (workspace: Workspace) =>
	workspace.validate().map(({ severity, rule, message, ref }) => ({
		severity,
		rule,
		message,
		ref,
	}));

describe("separate-ways shared-language dependencies", () => {
	it.each(cases)(
		"rejects a %s dependency in source and JSON",
		(_name, build) => {
			const { workspace, ref, message } = build(true);
			for (const candidate of [
				workspace,
				Workspace.fromSchema(JSON.parse(JSON.stringify(workspace.toSchema()))),
			]) {
				expect(diagnostics(candidate)).toEqual([
					{
						severity: "error",
						rule: "separate-ways",
						message: `${message} although the contexts declare separate ways`,
						ref,
					},
				]);
			}
		},
	);

	it.each(cases)(
		"accepts the same %s dependency without separate ways",
		(_name, build) => {
			const { workspace } = build(false);
			for (const candidate of [
				workspace,
				Workspace.fromSchema(JSON.parse(JSON.stringify(workspace.toSchema()))),
			]) {
				expect(diagnostics(candidate)).toEqual([]);
			}
		},
	);

	it("accepts separate ways where no traffic, identity or language crosses", () => {
		const { workspace } = pair(true, "none");
		for (const candidate of [
			workspace,
			Workspace.fromSchema(JSON.parse(JSON.stringify(workspace.toSchema()))),
		])
			expect(diagnostics(candidate)).toEqual([]);
	});

	it.each(["conformist", "customer"] as const)(
		"keeps %s borrowing permission separate from a separate-ways contradiction",
		(route) => {
			for (const separate of [false, true]) {
				const { workspace, owner, borrower } = pair(separate, route);
				const parent = owner.addValueObject("Parent", { description: "" });
				parent.addAttribute("Amount", { type: "decimal" });
				const child = borrower.addValueObject("Child", {
					description: "",
					specialises: parent,
				});
				const shape = owner.addSchema("Shape", { description: "" });
				shape.addAttribute("Amount", { type: "decimal" });
				const nested = borrower
					.addSchema("Envelope", { description: "" })
					.addAttribute("Shape", { type: "Shape", schema: shape });
				const expected = separate
					? [
							{
								severity: "error",
								rule: "separate-ways",
								message:
									'"Borrower" specialises "Child" from "Parent" in "Owner" although the contexts declare separate ways',
								ref: child.ref,
							},
							{
								severity: "error",
								rule: "separate-ways",
								message:
									'"Borrower" types "Envelope"\'s "Shape" by schema "Shape" from "Owner" although the contexts declare separate ways',
								ref: nested.ref,
							},
						]
					: [];
				for (const candidate of [
					workspace,
					Workspace.fromSchema(
						JSON.parse(JSON.stringify(workspace.toSchema())),
					),
				])
					expect(diagnostics(candidate)).toEqual(expected);
			}
		},
	);
});
