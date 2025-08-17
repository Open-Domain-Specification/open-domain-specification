import { describe, expect, it, beforeEach } from "vitest";
import { Workspace, Domain, Subdomain, BoundedContext, Service, Aggregate, Entity, ValueObject } from "./workspace";

describe("Workspace", () => {
	it("should create a workspace with basic attributes", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		expect(workspace.name).toBe("Test Workspace");
		expect(workspace.id).toBe("test_workspace");
		expect(workspace.odsVersion).toBe("1.0.0");
		expect(workspace.description).toBe("A test workspace");
		expect(workspace.version).toBe("0.1.0");
		expect(workspace.path).toBe("test_workspace");
	});

	it("should create a workspace with custom id", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
			id: "custom-id",
		});

		expect(workspace.id).toBe("custom-id");
		expect(workspace.path).toBe("custom-id");
	});

	it("should create a workspace with optional attributes", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
			homepage: "https://example.com",
			logoUrl: "https://example.com/logo.png",
			primaryColor: "#ff0000",
		});

		expect(workspace.homepage).toBe("https://example.com");
		expect(workspace.logoUrl).toBe("https://example.com/logo.png");
		expect(workspace.primaryColor).toBe("#ff0000");
	});

	it("should add a domain and retrieve it", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace", 
			version: "0.1.0",
		});

		const domain = workspace.addDomain("Commerce", {
			description: "Core commerce capabilities",
			type: "core",
		});

		expect(domain.name).toBe("Commerce");
		expect(domain.id).toBe("commerce");
		expect(domain.description).toBe("Core commerce capabilities");
		expect(domain.type).toBe("core");
		expect(domain.workspace).toBe(workspace);
		expect(workspace.domains.get("commerce")).toBe(domain);
	});

	it("should find domain by ref", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		const domain = workspace.addDomain("Commerce", {
			description: "Core commerce capabilities",
			type: "core",
		});

		expect(workspace.getDomainByRef(domain.ref)).toBe(domain);
		expect(workspace.getDomainByRef("#/invalid/ref")).toBeUndefined();
	});

	it("should throw error when domain not found by ref", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		expect(() => workspace.getDomainByRefOrThrow("#/invalid/ref")).toThrow(
			"Domain with ref #/invalid/ref not found"
		);
	});

	it("should find subdomain by ref", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		const domain = workspace.addDomain("Commerce", {
			description: "Core commerce capabilities",
			type: "core",
		});

		const subdomain = domain.addSubdomain("Sales", {
			description: "Sales functionality",
		});

		expect(workspace.getSubdomainByRef(subdomain.ref)).toBe(subdomain);
		expect(workspace.getSubdomainByRef("#/invalid/ref")).toBeUndefined();
	});

	it("should throw error when subdomain not found by ref", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		expect(() => workspace.getSubdomainByRefOrThrow("#/invalid/ref")).toThrow(
			"Subdomain with ref #/invalid/ref not found"
		);
	});

	it("should convert to schema", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
			homepage: "https://example.com",
		});

		const domain = workspace.addDomain("Commerce", {
			description: "Core commerce capabilities",
			type: "core",
		});

		const schema = workspace.toSchema();

		expect(schema.name).toBe("Test Workspace");
		expect(schema.odsVersion).toBe("1.0.0");
		expect(schema.description).toBe("A test workspace");
		expect(schema.version).toBe("0.1.0");
		expect(schema.homepage).toBe("https://example.com");
		expect(schema.domains).toHaveProperty("commerce");
		expect(schema.domains.commerce.name).toBe("Commerce");
	});
});

describe("Domain", () => {
	it("should create a domain with correct path and ref", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		const domain = workspace.addDomain("Commerce Domain", {
			description: "Core commerce capabilities",
			type: "core",
			id: "custom-commerce",
		});

		expect(domain.path).toBe("domains/custom-commerce");
		expect(domain.ref).toBe("#/domains/custom-commerce");
	});

	it("should add subdomains", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		const domain = workspace.addDomain("Commerce", {
			description: "Core commerce capabilities",
			type: "core",
		});

		const subdomain = domain.addSubdomain("Sales", {
			description: "Sales functionality",
		});

		expect(subdomain.name).toBe("Sales");
		expect(subdomain.domain).toBe(domain);
		expect(domain.subdomains.get("sales")).toBe(subdomain);
	});

	it("should convert to schema", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		const domain = workspace.addDomain("Commerce", {
			description: "Core commerce capabilities", 
			type: "supporting",
		});

		const schema = domain.toSchema();

		expect(schema.name).toBe("Commerce");
		expect(schema.description).toBe("Core commerce capabilities");
		expect(schema.type).toBe("supporting");
		expect(schema.subdomains).toEqual({});
	});
});

describe("Subdomain", () => {
	it("should create a subdomain with correct path and ref", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		const domain = workspace.addDomain("Commerce", {
			description: "Core commerce capabilities",
			type: "core",
		});

		const subdomain = domain.addSubdomain("Sales & Marketing", {
			description: "Sales functionality",
			id: "sales-marketing",
		});

		expect(subdomain.path).toBe("domains/commerce/subdomains/sales-marketing");
		expect(subdomain.ref).toBe("#/domains/commerce/subdomains/sales-marketing");
	});

	it("should add bounded contexts", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		const domain = workspace.addDomain("Commerce", {
			description: "Core commerce capabilities",
			type: "core",
		});

		const subdomain = domain.addSubdomain("Sales", {
			description: "Sales functionality",
		});

		const boundedContext = subdomain.addBoundedcontext("Order Management", {
			description: "Order processing",
		});

		expect(boundedContext.name).toBe("Order Management");
		expect(boundedContext.subdomain).toBe(subdomain);
		expect(subdomain.boundedcontexts.get("order_management")).toBe(boundedContext);
	});
});

describe("Workspace lookup methods", () => {
	let workspace: Workspace;
	let domain: Domain;
	let subdomain: Subdomain;
	let boundedContext: BoundedContext;
	let service: Service;
	let aggregate: Aggregate;
	let entity: Entity;
	let valueObject: ValueObject;

	beforeEach(() => {
		workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		domain = workspace.addDomain("Commerce", {
			description: "Core commerce capabilities",
			type: "core",
		});

		subdomain = domain.addSubdomain("Sales", {
			description: "Sales functionality",
		});

		boundedContext = subdomain.addBoundedcontext("Order Management", {
			description: "Order processing",
		});

		service = boundedContext.addService("OrderService", {
			description: "Service for managing orders",
			type: "domain",
		});

		aggregate = boundedContext.addAggregate("Order", {
			description: "Order aggregate",
		});

		entity = aggregate.addRootEntity("Order", {
			description: "Order entity",
		});

		valueObject = aggregate.addValueObject("Money", {
			description: "Money value object",
		});
	});

	it("should find bounded context by ref", () => {
		expect(workspace.getBoundedContextByRef(boundedContext.ref)).toBe(boundedContext);
		expect(workspace.getBoundedContextByRef("#/invalid/ref")).toBeUndefined();
	});

	it("should throw error when bounded context not found by ref", () => {
		expect(() => workspace.getBoundedContextByRefOrThrow("#/invalid/ref")).toThrow(
			"Bounded Context with ref #/invalid/ref not found"
		);
	});

	it("should find service by ref", () => {
		expect(workspace.getServiceByRef(service.ref)).toBe(service);
		expect(workspace.getServiceByRef("#/invalid/ref")).toBeUndefined();
	});

	it("should throw error when service not found by ref", () => {
		expect(() => workspace.getServiceByRefOrThrow("#/invalid/ref")).toThrow(
			"Service with ref #/invalid/ref not found"
		);
	});

	it("should find aggregate by ref", () => {
		expect(workspace.getAggregateByRef(aggregate.ref)).toBe(aggregate);
		expect(workspace.getAggregateByRef("#/invalid/ref")).toBeUndefined();
	});

	it("should throw error when aggregate not found by ref", () => {
		expect(() => workspace.getAggregateByRefOrThrow("#/invalid/ref")).toThrow(
			"Aggregate with ref #/invalid/ref not found"
		);
	});

	it("should find entity by ref", () => {
		expect(workspace.getEntityByRef(entity.ref)).toBe(entity);
		expect(workspace.getEntityByRef("#/invalid/ref")).toBeUndefined();
	});

	it("should throw error when entity not found by ref", () => {
		expect(() => workspace.getEntityByRefOrThrow("#/invalid/ref")).toThrow(
			"Entity with ref #/invalid/ref not found"
		);
	});

	it("should find value object by ref", () => {
		expect(workspace.getValueObjectByRef(valueObject.ref)).toBe(valueObject);
		expect(workspace.getValueObjectByRef("#/invalid/ref")).toBeUndefined();
	});

	it("should throw error when value object not found by ref", () => {
		expect(() => workspace.getValueObjectByRefOrThrow("#/invalid/ref")).toThrow(
			"Value Object with ref #/invalid/ref not found"
		);
	});

	it("should find entity or value object by ref", () => {
		expect(workspace.getEntityOrValueobjectByRef(entity.ref)).toBe(entity);
		expect(workspace.getEntityOrValueobjectByRef(valueObject.ref)).toBe(valueObject);
		expect(workspace.getEntityOrValueobjectByRef("#/invalid/ref")).toBeUndefined();
	});

	it("should throw error when entity or value object not found by ref", () => {
		expect(() => workspace.getEntityOrValueobjectByRefOrThrow("#/invalid/ref")).toThrow(
			"Entity or Value Object with ref #/invalid/ref not found"
		);
	});
});