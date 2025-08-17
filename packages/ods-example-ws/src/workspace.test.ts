import { describe, expect, it } from "vitest";
import { workspace } from "./petstore/workspace";

describe("Swagger Petstore Example Workspace", () => {
	it("should create a valid workspace", () => {
		expect(workspace.name).toBe("Swagger Petstore (v3)");
		expect(workspace.odsVersion).toBe("1.0.0");
		expect(workspace.description).toContain("Swagger Petstore v3");
		expect(workspace.homepage).toBe("https://petstore.swagger.io/");
		expect(workspace.primaryColor).toBe("#0ea5e9");
		expect(workspace.logoUrl).toBeDefined();
	});

	it("should have core Petstore Commerce domain", () => {
		const commerceDomain = workspace.getDomainByRef("#/domains/petstore_commerce");
		expect(commerceDomain).toBeDefined();
		expect(commerceDomain?.name).toBe("Petstore Commerce");
		expect(commerceDomain?.type).toBe("core");
		expect(commerceDomain?.description).toContain("pet catalog, sales, and inventory");
	});

	it("should have supporting Identity & Accounts domain", () => {
		const identityDomain = workspace.getDomainByRef(
			"#/domains/identity_&_accounts",
		);
		expect(identityDomain).toBeDefined();
		expect(identityDomain?.name).toBe("Identity & Accounts");
		expect(identityDomain?.type).toBe("supporting");
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

	it("should have subdomains for Catalog, Sales, Inventory, and Users", () => {
		const commerceDomain = workspace.getDomainByRef("#/domains/petstore_commerce");
		expect(commerceDomain).toBeDefined();
		expect(commerceDomain?.subdomains.size).toBe(3); // Catalog, Sales, Inventory

		const catalogSubdomain = workspace.getSubdomainByRefOrThrow("#/domains/petstore_commerce/subdomains/catalog");
		expect(catalogSubdomain.name).toBe("Catalog");
		expect(catalogSubdomain.description).toContain("Pet definitions");

		const salesSubdomain = workspace.getSubdomainByRefOrThrow("#/domains/petstore_commerce/subdomains/sales");
		expect(salesSubdomain.name).toBe("Sales");
		expect(salesSubdomain.description).toContain("Orders");

		const inventorySubdomain = workspace.getSubdomainByRefOrThrow("#/domains/petstore_commerce/subdomains/inventory");
		expect(inventorySubdomain.name).toBe("Inventory");
		expect(inventorySubdomain.description).toContain("availability");

		const usersSubdomain = workspace.getSubdomainByRefOrThrow("#/domains/identity_&_accounts/subdomains/users");
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
		const petAggregate = workspace.getAggregateByRefOrThrow("#/domains/petstore_commerce/subdomains/catalog/boundedcontexts/catalog_bc/aggregates/pet");
		expect(petAggregate.name).toBe("Pet");
		expect(petAggregate.description).toContain("pet listed in the store");

		const orderAggregate = workspace.getAggregateByRefOrThrow("#/domains/petstore_commerce/subdomains/sales/boundedcontexts/sales_bc/aggregates/order");
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
		const petApp = workspace.getServiceByRefOrThrow("#/domains/petstore_commerce/subdomains/catalog/boundedcontexts/catalog_bc/services/pet_app");
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
		const orderApp = workspace.getServiceByRefOrThrow("#/domains/petstore_commerce/subdomains/sales/boundedcontexts/sales_bc/services/order_app");
		expect(orderApp.name).toBe("OrderApp");
		expect(orderApp.description).toContain("/store/order endpoints");
		
		// Check for key store operations
		expect(orderApp.consumables.has("place_order")).toBe(true);
		expect(orderApp.consumables.has("get_order_by_id")).toBe(true);
		expect(orderApp.consumables.has("delete_order")).toBe(true);
	});

	it("should have User application service with user operations", () => {
		const userApp = workspace.getServiceByRefOrThrow("#/domains/identity_&_accounts/subdomains/users/boundedcontexts/identity_bc/services/user_app");
		expect(userApp.name).toBe("UserApp");
		expect(userApp.description).toContain("/user endpoints");
		
		// Check for key user operations
		expect(userApp.consumables.has("create_user")).toBe(true);
		expect(userApp.consumables.has("login")).toBe(true);
		expect(userApp.consumables.has("logout")).toBe(true);
		expect(userApp.consumables.has("get_user_by_username")).toBe(true);
	});
});
