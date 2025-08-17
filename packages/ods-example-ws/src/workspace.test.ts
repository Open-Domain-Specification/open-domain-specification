import { describe, expect, it } from "vitest";
import { workspace } from "./eshop/workspace";

describe("eShop Example Workspace", () => {
	it("should create a valid workspace", () => {
		expect(workspace.name).toBe("eShop");
		expect(workspace.odsVersion).toBe("1.0.0");
		expect(workspace.description).toContain("eShop reference app");
		expect(workspace.homepage).toBe("https://github.com/dotnet/eShop");
		expect(workspace.primaryColor).toBe("#2563eb");
		expect(workspace.logoUrl).toBeDefined();
	});

	it("should have core commerce domain", () => {
		const commerceDomain = workspace.getDomainByRef("#/domains/commerce");
		expect(commerceDomain).toBeDefined();
		expect(commerceDomain?.name).toBe("Commerce");
		expect(commerceDomain?.type).toBe("core");
		expect(commerceDomain?.description).toContain("e-commerce capabilities");
	});

	it("should have supporting domains", () => {
		const identityDomain = workspace.getDomainByRef("#/domains/identity_&_access");
		expect(identityDomain).toBeDefined();
		expect(identityDomain?.type).toBe("supporting");

		const apiDomain = workspace.getDomainByRef("#/domains/api_integration");
		expect(apiDomain).toBeDefined();
		expect(apiDomain?.type).toBe("supporting");

		const paymentDomain = workspace.getDomainByRef("#/domains/payment_processing");
		expect(paymentDomain).toBeDefined();
		expect(paymentDomain?.type).toBe("supporting");
	});

	it("should have proper domain structure", () => {
		expect(workspace.domains.size).toBeGreaterThan(3);
		
		// Check that all domains have descriptions
		for (const [_, domain] of workspace.domains) {
			expect(domain.description).toBeTruthy();
			expect(domain.description.length).toBeGreaterThan(10);
		}
	});

	it("should generate valid schema", () => {
		const schema = workspace.toSchema();
		
		expect(schema.name).toBe("eShop");
		expect(schema.odsVersion).toBe("1.0.0");
		expect(schema.domains).toBeDefined();
		expect(Object.keys(schema.domains).length).toBeGreaterThan(3);
	});

	it("should have subdomains in commerce domain", () => {
		const commerceDomain = workspace.getDomainByRef("#/domains/commerce");
		expect(commerceDomain).toBeDefined();
		expect(commerceDomain?.subdomains.size).toBeGreaterThan(0);
		
		// Check that subdomains have proper structure
		for (const [_, subdomain] of commerceDomain?.subdomains || new Map()) {
			expect(subdomain.name).toBeTruthy();
			expect(subdomain.description).toBeTruthy();
			expect(subdomain.path).toContain("domains/commerce/subdomains");
		}
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
		expect(consumableCount).toBeGreaterThan(5); // Should have multiple consumables
		expect(foundConsumption).toBe(true);
		expect(consumptionCount).toBeGreaterThan(5); // Should have multiple consumptions
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
});