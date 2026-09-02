import { describe, expect, it } from "vitest";
import { migrateWorkspaceSchema } from "./migrate";
import { Workspace } from "./workspace";

const legacyWorkspace = {
	id: "legacy",
	name: "Legacy",
	odsVersion: "1.0.0",
	description: "Produced by an older release",
	version: "0.0.1",
	domains: {
		commerce: {
			name: "Commerce",
			description: "Commerce",
			type: "core",
			subdomains: {
				sales: {
					name: "Sales",
					description: "Sales",
					boundedcontexts: {
						ordering: {
							name: "Ordering",
							description: "Ordering",
							aggregates: {
								order: {
									name: "Order",
									description: "Order",
									entities: {
										order: {
											name: "Order",
											description: "Order",
											root: true,
											relations: [
												{
													target: {
														$ref: "#/domains/commerce/subdomains/sales/boundedcontexts/ordering/aggregates/order/valueobjects/money",
													},
													relation: "uses",
												},
											],
										},
									},
									valueobjects: {
										money: {
											name: "Money",
											description: "Money",
											relations: [],
										},
									},
									invariants: {},
									provides: {
										order_placed: {
											name: "Order Placed",
											description: "Order Placed",
											type: "event",
											pattern: "published-language",
										},
									},
									consumes: [],
								},
							},
							services: {},
						},
					},
				},
				already_typed: {
					name: "Already typed",
					description: "Keeps its own type",
					type: "generic",
					boundedcontexts: {},
				},
			},
		},
		untyped: {
			name: "Untyped",
			description: "No type anywhere",
			subdomains: {
				misc: {
					name: "Misc",
					description: "Misc",
					boundedcontexts: {
						ordering: {
							name: "Ordering (clash)",
							description: "Same id as the commerce one",
							aggregates: {},
							services: {
								reporting: {
									name: "Reporting",
									description: "Reporting",
									type: "application",
									provides: {},
									consumes: [
										{
											consumable: {
												$ref: "#/domains/commerce/subdomains/sales/boundedcontexts/ordering/aggregates/order/provides/order_placed",
											},
											pattern: "conformist",
										},
									],
								},
							},
						},
					},
				},
			},
		},
	},
};

describe("migrateWorkspaceSchema", () => {
	it("does not mutate the input document", () => {
		const before = JSON.stringify(legacyWorkspace);
		migrateWorkspaceSchema(legacyWorkspace);
		expect(JSON.stringify(legacyWorkspace)).toBe(before);
	});

	it("moves the legacy domain type onto untyped subdomains (decision 01)", () => {
		const migrated = migrateWorkspaceSchema(legacyWorkspace);
		expect(migrated.domains.commerce).not.toHaveProperty("type");
		expect(migrated.domains.commerce.subdomains.sales.type).toBe("core");
		expect(migrated.domains.commerce.subdomains.already_typed.type).toBe(
			"generic",
		);
		expect(migrated.domains.untyped.subdomains.misc.type).toBe("supporting");
	});

	it("hoists nested bounded contexts to the workspace and links them to their subdomain (decision 02)", () => {
		const migrated = migrateWorkspaceSchema(legacyWorkspace);
		expect(migrated.domains.commerce.subdomains.sales).not.toHaveProperty(
			"boundedcontexts",
		);
		expect(migrated.boundedcontexts.ordering.subdomains).toEqual([
			{ $ref: "#/domains/commerce/subdomains/sales" },
		]);
	});

	it("suffixes a hoisted context id that clashes with an earlier one", () => {
		const migrated = migrateWorkspaceSchema(legacyWorkspace);
		expect(Object.keys(migrated.boundedcontexts).sort()).toEqual([
			"ordering",
			"ordering_misc",
		]);
		expect(migrated.boundedcontexts.ordering_misc.subdomains).toEqual([
			{ $ref: "#/domains/untyped/subdomains/misc" },
		]);
	});

	it("rewrites refs that pointed beneath a nested context", () => {
		const migrated = migrateWorkspaceSchema(legacyWorkspace);
		expect(
			migrated.boundedcontexts.ordering.aggregates.order.entities.order
				.relations[0].target.$ref,
		).toBe("#/boundedcontexts/ordering/aggregates/order/valueobjects/money");
		expect(
			migrated.boundedcontexts.ordering_misc.services.reporting.consumes[0]
				.consumable.$ref,
		).toBe("#/boundedcontexts/ordering/aggregates/order/provides/order_placed");
	});

	it("is applied by Workspace.fromSchema", () => {
		// biome-ignore lint/suspicious/noExplicitAny: legacy document shape on purpose
		const ws = Workspace.fromSchema(legacyWorkspace as any);
		expect(
			ws.getSubdomainByRefOrThrow("#/domains/commerce/subdomains/sales").type,
		).toBe("core");
		const reporting = ws.getServiceByRefOrThrow(
			"#/boundedcontexts/ordering_misc/services/reporting",
		);
		expect(reporting.consumptions[0].consumable.name).toBe("Order Placed");
		expect(
			ws.getBoundedContextByRefOrThrow("#/boundedcontexts/ordering")
				.primarySubdomain?.name,
		).toBe("Sales");
	});
});
