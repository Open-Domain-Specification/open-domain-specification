import { describe, expect, it } from "vitest";
import { makeRichTestWs, makeTestWs } from "./makeTestWs";
import type { WorkspaceSchema } from "./schema";
import { getWorkspaceFromSchema } from "./workspace-from-schema";

describe("workspaceFromSchema", () => {
	const test = makeTestWs();
	const schema = test.ws.toSchema();
	const workspace = getWorkspaceFromSchema(schema);

	it("should create a workspace from a schema", async () => {
		expect(workspace.toSchema()).toEqual(schema);
	});
});

/**
 * Every map of elements is optional in the file, and an absent one loads as an
 * empty one: a context that states nothing but its name says so by saying
 * nothing, rather than by writing eight empty maps (card 104).
 */
describe("a file that leaves its empty collections out", () => {
	const bare: WorkspaceSchema = {
		id: "bare",
		name: "Bare",
		odsVersion: "1.0.0",
		description: "",
		version: "0",
		domains: {},
		teams: {},
		relationships: [],
		boundedcontexts: {
			only: {
				name: "Only",
				description: "",
				subdomains: [],
			},
		},
	};

	it("loads a context that declares nothing but its name", () => {
		const loaded = getWorkspaceFromSchema(structuredClone(bare));
		const bc = loaded.getBoundedContextByRefOrThrow("#/boundedcontexts/only");
		expect([
			bc.aggregates.size,
			bc.services.size,
			bc.policies.size,
			bc.processes.size,
			bc.invariants.size,
			bc.glossary.size,
			bc.valueobjects.size,
			bc.schemas.size,
		]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
	});

	it("reads an aggregate, a service, an entity and a value the same way", () => {
		const schema = structuredClone(bare);
		schema.boundedcontexts.only.aggregates = {
			order: {
				name: "Order",
				description: "",
				consumes: [],
				entities: {
					order: { name: "Order", description: "", root: true, attributes: {} },
				},
			},
		};
		schema.boundedcontexts.only.services = {
			app: { name: "App", description: "", type: "application", consumes: [] },
		};
		schema.boundedcontexts.only.valueobjects = {
			money: { name: "Money", description: "", attributes: {}, invariants: {} },
		};
		const loaded = getWorkspaceFromSchema(schema);
		const order = loaded.getEntityByRefOrThrow(
			"#/boundedcontexts/only/aggregates/order/entities/order",
		);
		expect(order.relations).toEqual([]);
		expect(order.aggregate.invariants.size).toBe(0);
		expect(order.aggregate.consumables.size).toBe(0);
		expect(
			loaded.getValueObjectByRefOrThrow(
				"#/boundedcontexts/only/valueobjects/money",
			).relations,
		).toEqual([]);
	});
});

/**
 * A `$ref` that names nothing is a mistake in the model, and loading reports
 * it instead of throwing: the link is left unset, the rest of the file is
 * still built, and every other rule still runs over it (card 100).
 *
 * Written against JSON on purpose. The DSL passes objects, so these mistakes
 * cannot be made there at all — which was the defect: the crash fell only on
 * the author editing a file, who is the one with no compiler.
 */
describe("a ref that resolves to nothing", () => {
	/** The schema's name for what a reactor issues; see `issuesSchemaKey`. */
	const ISSUES = "then" as const;
	const GONE = "#/boundedcontexts/nowhere/schemas/gone";
	const rich = makeRichTestWs();
	const clean = rich.ws.toSchema();
	const baseline = new Set(
		getWorkspaceFromSchema(structuredClone(clean)).validate().map(diagnostic),
	);

	function diagnostic(d: { rule: string; ref: string }): string {
		return `${d.rule}|${d.ref}`;
	}

	/** The file with one edit made to it, loaded; what loading newly reports. */
	function loadWith(edit: (schema: WorkspaceSchema) => void) {
		const schema = structuredClone(clean);
		edit(schema);
		const loaded = getWorkspaceFromSchema(schema);
		const diagnostics = loaded.validate();
		return {
			loaded,
			unresolved: diagnostics.filter((d) => d.rule === "unresolved-ref"),
			others: diagnostics.filter(
				(d) => d.rule !== "unresolved-ref" && !baseline.has(diagnostic(d)),
			),
		};
	}

	it("still builds everything else in the file", () => {
		const { loaded, unresolved } = loadWith((s) => {
			s.boundedcontexts.ordering_bc.aggregates!.order
				.provides!.order_placed.schema = { $ref: GONE };
		});
		expect(unresolved).toHaveLength(1);
		// The rest of Ordering is there, and so is the context next door.
		expect(loaded.boundedcontexts.size).toBe(
			Object.keys(clean.boundedcontexts).length,
		);
		expect(
			loaded.getConsumableByRefOrThrow(rich.orderPlaced.ref).schema,
		).toBeUndefined();
		expect(loaded.getConsumableByRefOrThrow(rich.placeOrder.ref).schema).toBe(
			loaded.getSchemaByRefOrThrow(rich.orderRequest.ref),
		);
	});

	it("says which element wrote the ref, and where", () => {
		const { unresolved } = loadWith((s) => {
			s.boundedcontexts.ordering_bc.services!.order_app
				.provides!.place_order.returns = { $ref: GONE };
		});
		expect(unresolved[0].ref).toBe(rich.placeOrder.ref);
		expect(unresolved[0].message).toContain('Operation "Place Order"');
		expect(unresolved[0].message).toContain('in "returns"');
		expect(unresolved[0].message).toContain("nothing in this workspace");
	});

	it("says so differently when the ref names the wrong kind of thing", () => {
		const { unresolved } = loadWith((s) => {
			s.boundedcontexts.invoicing_bc.processes!.invoice_to_customer.starts = [
				{ $ref: `${rich.placeOrder.ref}/returns` },
			];
		});
		expect(unresolved[0].message).toContain("which is not an event");
	});

	const sites: Array<[string, (s: WorkspaceSchema) => void, string]> = [
		[
			"schema",
			(s) => {
				s.boundedcontexts.ordering_bc.services!.order_app
					.provides!.place_order.schema = { $ref: GONE };
			},
			rich.placeOrder.ref,
		],
		[
			"returns",
			(s) => {
				s.boundedcontexts.ordering_bc.services!.order_app
					.provides!.place_order.returns = { $ref: GONE };
			},
			rich.placeOrder.ref,
		],
		[
			"rejects",
			(s) => {
				s.boundedcontexts.ordering_bc.services!.order_app
					.provides!.place_order.rejects = [{ $ref: GONE }];
			},
			rich.placeOrder.ref,
		],
		[
			"by",
			(s) => {
				s.boundedcontexts.invoicing_bc.services!.invoice_app.consumes[1].by = [
					{ $ref: GONE },
				];
			},
			rich.invoiceApp.ref,
		],
		[
			"valueobject",
			(s) => {
				s.boundedcontexts.ordering_bc.aggregates!.order
					.entities!.order.attributes.total.valueobject = { $ref: GONE };
			},
			`${rich.order.ref}/attributes/total`,
		],
		[
			"identifies",
			(s) => {
				s.boundedcontexts.invoicing_bc.aggregates!.invoice
					.entities!.invoice.attributes.order_id.identifies = { $ref: GONE };
			},
			`${rich.invoice.ref}/attributes/order_id`,
		],
		[
			"constrains",
			(s) => {
				s.boundedcontexts.ordering_bc.aggregates!.order
					.invariants!.non_empty.constrains = [{ $ref: GONE }];
			},
			rich.nonEmpty.ref,
		],
		[
			"on",
			(s) => {
				s.boundedcontexts.invoicing_bc.policies!.invoice_on_order_placed.on = [
					{ $ref: GONE },
				];
			},
			rich.invoiceOnOrderPlaced.ref,
		],
		[
			"starts",
			(s) => {
				s.boundedcontexts.invoicing_bc.processes!.invoice_to_customer.starts = [
					{ $ref: GONE },
				];
			},
			rich.invoiceToCustomer.ref,
		],
		[
			"ends",
			(s) => {
				s.boundedcontexts.invoicing_bc.processes!.invoice_to_customer.ends = [
					{ $ref: GONE },
				];
			},
			rich.invoiceToCustomer.ref,
		],
		[
			"from",
			(s) => {
				const process =
					s.boundedcontexts.invoicing_bc.processes!.invoice_to_customer;
				process.deadlines = {
					chase: {
						name: "Chase",
						description: "Chase an invoice nobody has paid",
						after: "30 days",
						from: { $ref: GONE },
					},
				};
			},
			`${rich.invoiceToCustomer.ref}/deadlines/chase`,
		],
	];

	for (const [field, edit, at] of sites) {
		it(`reports an unresolvable "${field}" at the element that wrote it`, () => {
			const { unresolved } = loadWith(edit);
			expect(unresolved).toHaveLength(1);
			expect(unresolved[0].severity).toBe("error");
			expect(unresolved[0].ref).toBe(at);
			expect(unresolved[0].message).toContain(`in "${field}"`);
		});
	}

	it("leaves a consumption out when the consumable it names is gone", () => {
		const { loaded, unresolved } = loadWith((s) => {
			s.boundedcontexts.invoicing_bc
				.services!.invoice_app.consumes[0].consumable = { $ref: GONE };
		});
		expect(unresolved).toHaveLength(1);
		expect(unresolved[0].ref).toBe(rich.invoiceApp.ref);
		expect(
			loaded.getServiceByRefOrThrow(rich.invoiceApp.ref).consumptions,
		).toHaveLength(1);
	});

	it("leaves a relationship out when one of its ends is gone", () => {
		const { loaded, unresolved } = loadWith((s) => {
			const directed = s.relationships.find((r) => "upstream" in r);
			if (directed && "upstream" in directed)
				directed.upstream = { $ref: "#/boundedcontexts/nowhere" };
		});
		expect(unresolved).toHaveLength(1);
		expect(unresolved[0].message).toContain('in "upstream"');
		expect(loaded.relationships).toHaveLength(clean.relationships.length - 1);
	});

	it("drops a deadline of another process rather than throwing on it", () => {
		const { loaded, unresolved } = loadWith((s) => {
			const process =
				s.boundedcontexts.invoicing_bc.processes!.invoice_to_customer;
			process.deadlines = {
				chase: {
					name: "Chase",
					description: "Chase an invoice nobody has paid",
					after: "30 days",
				},
			};
			s.boundedcontexts.ordering_bc.processes = {
				borrower: {
					name: "Borrower",
					description: "Waits on somebody else's clock",
					starts: [{ $ref: rich.orderPlaced.ref }],
					on: [
						{
							$ref: `${rich.invoiceToCustomer.ref}/deadlines/chase`,
						},
					],
					// `then` is written through a key so biome's thenable rule
					// leaves it alone, the way the model does.
					[ISSUES]: [],
					ends: [],
				},
			};
		});
		expect(unresolved).toHaveLength(1);
		expect(unresolved[0].message).toContain(
			"one of this process's own deadlines",
		);
		expect(
			loaded.getProcessByRefOrThrow(
				"#/boundedcontexts/ordering_bc/processes/borrower",
			).events,
		).toHaveLength(0);
	});

	it("says nothing about a workspace whose refs all resolve", () => {
		const { unresolved, others } = loadWith(() => {});
		expect(unresolved).toHaveLength(0);
		expect(others).toHaveLength(0);
	});

	it("leaves a context's team unset rather than losing the context", () => {
		const { loaded, unresolved } = loadWith((s) => {
			s.boundedcontexts.ordering_bc.team = { $ref: "#/teams/nobody" };
		});
		expect(unresolved[0].message).toContain('in "team"');
		expect(
			loaded.getBoundedContextByRefOrThrow(rich.orderingBc.ref).team,
		).toBeUndefined();
		expect(
			loaded.getBoundedContextByRefOrThrow(rich.orderingBc.ref).aggregates.size,
		).toBe(2);
	});
});
