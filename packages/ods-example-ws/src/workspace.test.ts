import { Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { workspace as northbank } from "./northbank/workspace";
import { workspace } from "./petstore/workspace";
import { workspace as rivermart } from "./rivermart/workspace";
import { workspace as streamline } from "./streamline/workspace";

describe("Swagger Petstore Example Workspace", () => {
	it("should create a valid workspace", () => {
		expect(workspace.name).toBe("Swagger Petstore (v3)");
		expect(workspace.odsVersion).toBe("1.0.0");
		expect(workspace.description).toContain("Swagger Petstore v3");
		expect(workspace.homepage).toBe("https://petstore.swagger.io/");
		expect(workspace.primaryColor).toBe("#0ea5e9");
		expect(workspace.logoUrl).toBeDefined();
	});

	it("should classify Petstore Commerce subdomains", () => {
		const commerceDomain = workspace.getDomainByRef(
			"#/domains/petstore_commerce",
		);
		expect(commerceDomain).toBeDefined();
		expect(commerceDomain?.name).toBe("Petstore Commerce");
		expect(commerceDomain?.subdomains.get("catalog")?.type).toBe("core");
		expect(commerceDomain?.subdomains.get("inventory")?.type).toBe(
			"supporting",
		);
		expect(commerceDomain?.description).toContain(
			"pet catalog, sales, and inventory",
		);
	});

	it("should classify the Identity & Accounts subdomain as generic", () => {
		const identityDomain = workspace.getDomainByRef(
			"#/domains/identity_&_accounts",
		);
		expect(identityDomain).toBeDefined();
		expect(identityDomain?.name).toBe("Identity & Accounts");
		expect(identityDomain?.subdomains.get("users")?.type).toBe("generic");
		expect(identityDomain?.description).toContain("Users and sessions");
	});

	it("should have proper domain structure", () => {
		expect(workspace.domains.size).toBe(2);

		// Check that all domains have descriptions
		for (const [_, domain] of workspace.domains) {
			expect(domain.description).toBeTruthy();
			expect(domain.description.length).toBeGreaterThan(10);
		}
	});

	it("should generate valid schema", () => {
		const schema = workspace.toSchema();

		expect(schema.name).toBe("Swagger Petstore (v3)");
		expect(schema.odsVersion).toBe("1.0.0");
		expect(schema.domains).toBeDefined();
		expect(Object.keys(schema.domains).length).toBe(2);
	});

	it("should have subdomains for Catalog, Sales, Inventory, Fulfilment and Users", () => {
		const commerceDomain = workspace.getDomainByRef(
			"#/domains/petstore_commerce",
		);
		expect(commerceDomain).toBeDefined();
		expect(commerceDomain?.subdomains.size).toBe(4); // Catalog, Sales, Inventory, Fulfilment

		const catalogSubdomain = workspace.getSubdomainByRefOrThrow(
			"#/domains/petstore_commerce/subdomains/catalog",
		);
		expect(catalogSubdomain.name).toBe("Catalog");
		expect(catalogSubdomain.description).toContain("Pet definitions");

		const salesSubdomain = workspace.getSubdomainByRefOrThrow(
			"#/domains/petstore_commerce/subdomains/sales",
		);
		expect(salesSubdomain.name).toBe("Sales");
		expect(salesSubdomain.description).toContain("Orders");

		const inventorySubdomain = workspace.getSubdomainByRefOrThrow(
			"#/domains/petstore_commerce/subdomains/inventory",
		);
		expect(inventorySubdomain.name).toBe("Inventory");
		expect(inventorySubdomain.description).toContain("availability");

		const usersSubdomain = workspace.getSubdomainByRefOrThrow(
			"#/domains/identity_&_accounts/subdomains/users",
		);
		expect(usersSubdomain.name).toBe("Users");
		expect(usersSubdomain.description).toContain("User records");
	});

	it("should have bounded contexts with services and aggregates", () => {
		let foundBoundedContext = false;
		let foundService = false;
		let foundAggregate = false;

		for (const [_, domain] of workspace.domains) {
			for (const [_, subdomain] of domain.subdomains) {
				if (subdomain.boundedcontexts.size > 0) {
					foundBoundedContext = true;

					for (const [_, bc] of subdomain.boundedcontexts) {
						if (bc.services.size > 0) {
							foundService = true;
						}
						if (bc.aggregates.size > 0) {
							foundAggregate = true;
						}
					}
				}
			}
		}

		expect(foundBoundedContext).toBe(true);
		expect(foundService).toBe(true);
		expect(foundAggregate).toBe(true);
	});

	it("should have Pet and Order aggregates", () => {
		const petAggregate = workspace.getAggregateByRefOrThrow(
			"#/boundedcontexts/catalog_bc/aggregates/pet",
		);
		expect(petAggregate.name).toBe("Pet");
		expect(petAggregate.description).toContain("pet listed in the store");

		const orderAggregate = workspace.getAggregateByRefOrThrow(
			"#/boundedcontexts/sales_bc/aggregates/order",
		);
		expect(orderAggregate.name).toBe("Order");
		expect(orderAggregate.description).toContain("Order for a single pet");
	});

	it("should have consumable and consumption relationships", () => {
		let foundConsumable = false;
		let foundConsumption = false;
		let consumableCount = 0;
		let consumptionCount = 0;

		for (const [_, domain] of workspace.domains) {
			for (const [_, subdomain] of domain.subdomains) {
				for (const [_, bc] of subdomain.boundedcontexts) {
					// Check services for consumables and consumptions
					for (const [_, service] of bc.services) {
						if (service.consumables.size > 0) {
							foundConsumable = true;
							consumableCount += service.consumables.size;
						}
						if (service.consumptions.length > 0) {
							foundConsumption = true;
							consumptionCount += service.consumptions.length;
						}
					}

					// Check aggregates for consumables and consumptions
					for (const [_, aggregate] of bc.aggregates) {
						if (aggregate.consumables.size > 0) {
							foundConsumable = true;
							consumableCount += aggregate.consumables.size;
						}
						if (aggregate.consumptions.length > 0) {
							foundConsumption = true;
							consumptionCount += aggregate.consumptions.length;
						}
					}
				}
			}
		}

		// The example should demonstrate both providing and consuming
		expect(foundConsumable).toBe(true);
		expect(consumableCount).toBeGreaterThan(10); // Should have many operations and events
		expect(foundConsumption).toBe(true);
		expect(consumptionCount).toBeGreaterThan(5); // Should have several consumptions for projections and ACL
	});

	it("should demonstrate DDD patterns correctly", () => {
		let foundEntity = false;
		let foundValueObject = false;
		let foundInvariant = false;

		for (const [_, domain] of workspace.domains) {
			for (const [_, subdomain] of domain.subdomains) {
				for (const [_, bc] of subdomain.boundedcontexts) {
					for (const [_, aggregate] of bc.aggregates) {
						if (aggregate.entities.size > 0) {
							foundEntity = true;
						}
						if (aggregate.valueobjects.size > 0) {
							foundValueObject = true;
						}
						if (aggregate.invariants.size > 0) {
							foundInvariant = true;
						}
					}
				}
			}
		}

		// The example should demonstrate core DDD concepts
		expect(foundEntity).toBe(true);
		expect(foundValueObject).toBe(true);
		expect(foundInvariant).toBe(true);
	});

	it("should have Pet application service with Swagger API operations", () => {
		const petApp = workspace.getServiceByRefOrThrow(
			"#/boundedcontexts/catalog_bc/services/pet_app",
		);
		expect(petApp.name).toBe("PetApp");
		expect(petApp.description).toContain("/pet endpoints");

		// Check for key Swagger Petstore operations
		expect(petApp.consumables.has("add_pet")).toBe(true);
		expect(petApp.consumables.has("update_pet")).toBe(true);
		expect(petApp.consumables.has("find_pets_by_status")).toBe(true);
		expect(petApp.consumables.has("get_pet_by_id")).toBe(true);
		expect(petApp.consumables.has("delete_pet")).toBe(true);
	});

	it("should have Order application service with store operations", () => {
		const orderApp = workspace.getServiceByRefOrThrow(
			"#/boundedcontexts/sales_bc/services/order_app",
		);
		expect(orderApp.name).toBe("OrderApp");
		expect(orderApp.description).toContain("/store/order endpoints");

		// Check for key store operations
		expect(orderApp.consumables.has("place_order")).toBe(true);
		expect(orderApp.consumables.has("get_order_by_id")).toBe(true);
		expect(orderApp.consumables.has("delete_order")).toBe(true);
	});

	it("should have User application service with user operations", () => {
		const userApp = workspace.getServiceByRefOrThrow(
			"#/boundedcontexts/identity_bc/services/user_app",
		);
		expect(userApp.name).toBe("UserApp");
		expect(userApp.description).toContain("/user endpoints");

		// Check for key user operations
		expect(userApp.consumables.has("create_user")).toBe(true);
		expect(userApp.consumables.has("login")).toBe(true);
		expect(userApp.consumables.has("logout")).toBe(true);
		expect(userApp.consumables.has("get_user_by_username")).toBe(true);
	});

	it("demonstrates every relationship type exactly once", () => {
		const types = workspace.relationships.map((r) => r.type).sort();
		expect(types).toEqual([
			"customer-supplier",
			"partnership",
			"separate-ways",
			"shared-kernel",
			"upstream-downstream",
		]);
	});

	it("demonstrates both service kinds and every relation kind", () => {
		const serviceTypes = new Set<string>();
		const relationTypes = new Set<string>();
		for (const bc of workspace.boundedcontexts.values()) {
			for (const service of bc.services.values())
				serviceTypes.add(service.type);
			for (const aggregate of bc.aggregates.values()) {
				for (const entity of aggregate.entities.values()) {
					for (const relation of entity.relations)
						relationTypes.add(relation.relation);
				}
			}
		}
		expect([...serviceTypes].sort()).toEqual(["application", "domain"]);
		expect([...relationTypes].sort()).toEqual([
			"includes",
			"references",
			"uses",
		]);
	});

	it("validates clean: the demonstration reference has no diagnostics", () => {
		expect(workspace.validate()).toEqual([]);
	});
});

describe("Swagger Petstore schema round-trip", () => {
	it("rebuilds an identical schema from its own JSON output", () => {
		const schema = workspace.toSchema();
		const rebuilt = Workspace.fromSchema(JSON.parse(JSON.stringify(schema)));
		expect(rebuilt.toSchema()).toEqual(schema);
	});
});

/**
 * The fake-organisation stress models. Each plants exactly three structural
 * problems, chosen so that the three workspaces together exercise every rule
 * in the catalog; see the DELIBERATE comments in each workspace file and
 * section 7 of its DISCOVERY.md.
 */
const referenceModels: Array<{
	workspace: Workspace;
	id: string;
	name: string;
	minContexts: number;
	deliberate: Array<{ rule: string; severity: "error" | "warning" }>;
}> = [
	{
		workspace: rivermart,
		id: "rivermart",
		name: "RiverMart",
		minContexts: 12,
		deliberate: [
			{ rule: "aggregate-root", severity: "error" },
			{ rule: "cross-aggregate-reference", severity: "error" },
			{ rule: "role-coherence", severity: "warning" },
		],
	},
	{
		workspace: streamline,
		id: "streamline",
		name: "StreamLine",
		minContexts: 12,
		deliberate: [
			{ rule: "internal-consumable", severity: "error" },
			{ rule: "schema-context", severity: "error" },
			{ rule: "policy-complete", severity: "warning" },
		],
	},
	{
		workspace: northbank,
		id: "northbank",
		name: "NorthBank",
		minContexts: 12,
		deliberate: [
			{ rule: "separate-ways", severity: "error" },
			{ rule: "consumable-kind", severity: "error" },
			{ rule: "context-serves-subdomain", severity: "warning" },
		],
	},
];

describe.each(referenceModels)(
	"$name reference workspace",
	({ workspace: ws, id, minContexts, deliberate }) => {
		it("builds with its id and enough contexts to stress the pages", () => {
			expect(ws.id).toBe(id);
			expect(ws.boundedcontexts.size).toBeGreaterThanOrEqual(minContexts);
			expect(ws.relationships.length).toBeGreaterThan(minContexts);
		});

		it("uses every relationship type and has one big ball of mud", () => {
			const types = new Set(ws.relationships.map((r) => r.type));
			expect([...types].sort()).toEqual([
				"customer-supplier",
				"partnership",
				"separate-ways",
				"shared-kernel",
				"upstream-downstream",
			]);
			const legacy = [...ws.boundedcontexts.values()].filter(
				(bc) => bc.bigBallOfMud,
			);
			expect(legacy).toHaveLength(1);
		});

		it("gives every context a team", () => {
			for (const bc of ws.boundedcontexts.values()) {
				expect(bc.team, `${bc.name} has no team`).toBeDefined();
			}
		});

		it("has a glossary, policies and schemas on cross-context events", () => {
			const contexts = [...ws.boundedcontexts.values()];
			expect(contexts.some((bc) => bc.glossary.size > 0)).toBe(true);
			expect(
				contexts.reduce((n, bc) => n + bc.policies.size, 0),
			).toBeGreaterThan(5);
			for (const bc of contexts) {
				for (const provider of [
					...bc.aggregates.values(),
					...bc.services.values(),
				]) {
					for (const c of provider.consumables.values()) {
						const consumedElsewhere = c.consumptions.some(
							(it) => it.consumer.boundedcontext !== bc,
						);
						if (c.type === "event" && consumedElsewhere && !c.internal) {
							expect(c.schema, `${c.name} has no schema`).toBeDefined();
						}
					}
				}
			}
		});

		it("validate() returns exactly the deliberate problems", () => {
			const diagnostics = ws
				.validate()
				.map(({ rule, severity }) => ({ rule, severity }))
				.sort((a, b) => a.rule.localeCompare(b.rule));
			expect(diagnostics).toEqual(
				[...deliberate].sort((a, b) => a.rule.localeCompare(b.rule)),
			);
		});

		it("round-trips through Workspace.fromSchema", () => {
			const schema = ws.toSchema();
			const rebuilt = Workspace.fromSchema(JSON.parse(JSON.stringify(schema)));
			expect(rebuilt.toSchema()).toEqual(schema);
			expect(rebuilt.validate()).toEqual(ws.validate());
		});
	},
);

describe("reference workspaces together", () => {
	it("cover every validation rule between them", () => {
		const rules = new Set(
			referenceModels.flatMap((m) => m.deliberate.map((d) => d.rule)),
		);
		expect([...rules].sort()).toEqual([
			"aggregate-root",
			"consumable-kind",
			"context-serves-subdomain",
			"cross-aggregate-reference",
			"internal-consumable",
			"policy-complete",
			"role-coherence",
			"schema-context",
			"separate-ways",
		]);
	});

	it("have distinct ids", () => {
		const ids = [workspace, rivermart, streamline, northbank].map((w) => w.id);
		expect(new Set(ids).size).toBe(4);
	});
});
