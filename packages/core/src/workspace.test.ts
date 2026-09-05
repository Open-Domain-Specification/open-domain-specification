import { beforeEach, describe, expect, it } from "vitest";
import {
	type Aggregate,
	type BoundedContext,
	type Domain,
	type Entity,
	type Service,
	type Subdomain,
	type ValueObject,
	Workspace,
} from "./workspace";

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
		});

		expect(domain.name).toBe("Commerce");
		expect(domain.id).toBe("commerce");
		expect(domain.description).toBe("Core commerce capabilities");
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
			"Domain with ref #/invalid/ref not found",
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
		});

		const subdomain = domain.addSubdomain("Sales", {
			type: "core",
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
			"Subdomain with ref #/invalid/ref not found",
		);
	});

	it("should convert to schema", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
			homepage: "https://example.com",
		});

		const _domain = workspace.addDomain("Commerce", {
			description: "Core commerce capabilities",
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
		});

		const subdomain = domain.addSubdomain("Sales", {
			type: "core",
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
		});

		const schema = domain.toSchema();

		expect(schema.name).toBe("Commerce");
		expect(schema.description).toBe("Core commerce capabilities");
		expect(schema).not.toHaveProperty("type");
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
		});

		const subdomain = domain.addSubdomain("Sales & Marketing", {
			type: "core",
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
		});

		const subdomain = domain.addSubdomain("Sales", {
			type: "core",
			description: "Sales functionality",
		});

		const boundedContext = subdomain.addBoundedcontext("Order Management", {
			description: "Order processing",
		});

		expect(boundedContext.name).toBe("Order Management");
		expect(boundedContext.subdomains.has(subdomain)).toBe(true);
		expect(boundedContext.primarySubdomain).toBe(subdomain);
		expect(workspace.boundedcontexts.get("order_management")).toBe(
			boundedContext,
		);
		expect(subdomain.boundedcontexts.get("order_management")).toBe(
			boundedContext,
		);
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
		});

		subdomain = domain.addSubdomain("Sales", {
			type: "core",
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

		valueObject = boundedContext.addValueObject("Money", {
			description: "Money value object",
		});
	});

	it("should find bounded context by ref", () => {
		expect(workspace.getBoundedContextByRef(boundedContext.ref)).toBe(
			boundedContext,
		);
		expect(workspace.getBoundedContextByRef("#/invalid/ref")).toBeUndefined();
	});

	it("should throw error when bounded context not found by ref", () => {
		expect(() =>
			workspace.getBoundedContextByRefOrThrow("#/invalid/ref"),
		).toThrow("Bounded Context with ref #/invalid/ref not found");
	});

	it("should find service by ref", () => {
		expect(workspace.getServiceByRef(service.ref)).toBe(service);
		expect(workspace.getServiceByRef("#/invalid/ref")).toBeUndefined();
	});

	it("should throw error when service not found by ref", () => {
		expect(() => workspace.getServiceByRefOrThrow("#/invalid/ref")).toThrow(
			"Service with ref #/invalid/ref not found",
		);
	});

	it("should find aggregate by ref", () => {
		expect(workspace.getAggregateByRef(aggregate.ref)).toBe(aggregate);
		expect(workspace.getAggregateByRef("#/invalid/ref")).toBeUndefined();
	});

	it("should throw error when aggregate not found by ref", () => {
		expect(() => workspace.getAggregateByRefOrThrow("#/invalid/ref")).toThrow(
			"Aggregate with ref #/invalid/ref not found",
		);
	});

	it("should find entity by ref", () => {
		expect(workspace.getEntityByRef(entity.ref)).toBe(entity);
		expect(workspace.getEntityByRef("#/invalid/ref")).toBeUndefined();
	});

	it("should throw error when entity not found by ref", () => {
		expect(() => workspace.getEntityByRefOrThrow("#/invalid/ref")).toThrow(
			"Entity with ref #/invalid/ref not found",
		);
	});

	it("should find value object by ref", () => {
		expect(workspace.getValueObjectByRef(valueObject.ref)).toBe(valueObject);
		expect(workspace.getValueObjectByRef("#/invalid/ref")).toBeUndefined();
	});

	it("should throw error when value object not found by ref", () => {
		expect(() => workspace.getValueObjectByRefOrThrow("#/invalid/ref")).toThrow(
			"Value Object with ref #/invalid/ref not found",
		);
	});

	it("should find entity or value object by ref", () => {
		expect(workspace.getEntityOrValueobjectByRef(entity.ref)).toBe(entity);
		expect(workspace.getEntityOrValueobjectByRef(valueObject.ref)).toBe(
			valueObject,
		);
		expect(
			workspace.getEntityOrValueobjectByRef("#/invalid/ref"),
		).toBeUndefined();
	});

	it("should throw error when entity or value object not found by ref", () => {
		expect(() =>
			workspace.getEntityOrValueobjectByRefOrThrow("#/invalid/ref"),
		).toThrow("Entity or Value Object with ref #/invalid/ref not found");
	});
});

describe("an external bounded context", () => {
	function workspaceWith(external: boolean) {
		const ws = new Workspace("W", {
			odsVersion: "1.0.0",
			description: "",
			version: "0",
		});
		return {
			ws,
			bc: ws.addBoundedContext("Card Scheme", { description: "", external }),
		};
	}

	it("is not external unless the model says so", () => {
		const { bc } = workspaceWith(false);
		expect(bc.external).toBe(false);
		expect(bc.toSchema().external).toBeUndefined();
	});

	it("carries the flag into the schema and back out again", () => {
		const { ws, bc } = workspaceWith(true);
		expect(bc.toSchema().external).toBe(true);
		const rebuilt = Workspace.fromSchema(
			JSON.parse(JSON.stringify(ws.toSchema())),
		);
		expect(rebuilt.getBoundedContextByRefOrThrow(bc.ref).external).toBe(true);
	});
});

describe("a kind of another entity or value object", () => {
	/** Account with two kinds, and a kernel value object with one. */
	function kinds() {
		const ws = new Workspace("W", {
			odsVersion: "1.0.0",
			description: "",
			version: "0",
		});
		const kernel = ws.addBoundedContext("Kernel", { description: "" });
		const shared = kernel.addValueObject("Amount", { description: "" });
		const bc = ws.addBoundedContext("Accounts", { description: "" });
		const fee = bc.addValueObject("Fee", {
			description: "",
			specialises: shared,
		});
		const agg = bc.addAggregate("Account", { description: "" });
		const account = agg.addRootEntity("Account", { description: "" });
		const id = account.addAttribute("Id", { type: "uuid", identity: true });
		const status = bc.addValueObject("Status", { description: "" });
		account.uses(status, "has-status", "1");
		const loan = agg.addEntity("Loan Account", {
			description: "",
			specialises: account,
		});
		const term = loan.addAttribute("Term", { type: "months" });
		const savings = agg.addEntity("Savings Account", {
			description: "",
			specialises: account,
		});
		return {
			ws,
			bc,
			agg,
			shared,
			fee,
			account,
			id,
			status,
			loan,
			term,
			savings,
		};
	}

	it("names what it is a kind of, and what is a kind of it", () => {
		const { account, loan, savings, shared, fee } = kinds();
		expect(loan.specialises).toBe(account);
		expect(account.kinds).toEqual([loan, savings]);
		expect(loan.kinds).toEqual([]);
		// A kernel's value object is specialised from the context that borrows
		// it, so its kinds are found across the workspace, not in its own
		// context.
		expect(shared.kinds).toEqual([fee]);
		expect(fee.ancestors).toEqual([shared]);
	});

	it("has its parent's attributes and relations as its own, its own first", () => {
		const { account, id, loan, term, status } = kinds();
		expect(loan.ancestors).toEqual([account]);
		expect(loan.allAttributes).toEqual([term, id]);
		expect(loan.inheritedAttributes).toEqual([id]);
		expect(loan.allRelations.map((r) => r.target)).toEqual([status]);
		expect(loan.relations).toEqual([]);
		// The parent gains nothing from its kinds; inheritance runs one way.
		expect(account.allAttributes).toEqual([id]);
	});

	it("stops walking a chain that returns to where it started", () => {
		const { account, loan } = kinds();
		account.specialises = loan;
		expect(loan.ancestors).toEqual([account]);
		expect(account.ancestors).toEqual([loan]);
		expect(loan.allAttributes.length).toBe(2);
	});

	it("carries what it is a kind of into the schema and back out again", () => {
		const { ws, account, loan, shared, fee } = kinds();
		expect(loan.toSchema().specialises).toEqual({ $ref: account.ref });
		expect(account.toSchema().specialises).toBeUndefined();
		expect(fee.toSchema().specialises).toEqual({ $ref: shared.ref });
		const rebuilt = Workspace.fromSchema(
			JSON.parse(JSON.stringify(ws.toSchema())),
		);
		expect(rebuilt.getEntityByRefOrThrow(loan.ref).specialises?.ref).toBe(
			account.ref,
		);
		// The kernel's value object is loaded before the context that borrows
		// it or after it, depending on declaration order; either way the link
		// is joined once every context exists.
		expect(rebuilt.getValueObjectByRefOrThrow(fee.ref).specialises?.ref).toBe(
			shared.ref,
		);
		expect(rebuilt.toSchema()).toEqual(ws.toSchema());
	});
});
