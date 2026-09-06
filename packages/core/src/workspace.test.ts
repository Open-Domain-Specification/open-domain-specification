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
import { getWorkspaceFromSchema } from "./workspace-from-schema";

describe("Workspace", () => {
	it("should create a workspace with basic attributes", () => {
		const workspace = new Workspace("Test Workspace", {
			description: "A test workspace",
			version: "0.1.0",
		});

		expect(workspace.name).toBe("Test Workspace");
		expect(workspace.id).toBe("test_workspace");
		expect(workspace.odsVersion).toBe("2.0.0");
		expect(workspace.description).toBe("A test workspace");
		expect(workspace.version).toBe("0.1.0");
		expect(workspace.path).toBe("test_workspace");
	});

	it("should create a workspace with custom id", () => {
		const workspace = new Workspace("Test Workspace", {
			description: "A test workspace",
			version: "0.1.0",
			id: "custom-id",
		});

		expect(workspace.id).toBe("custom-id");
		expect(workspace.path).toBe("custom-id");
	});

	it("should create a workspace with optional attributes", () => {
		const workspace = new Workspace("Test Workspace", {
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
			description: "A test workspace",
			version: "0.1.0",
		});

		expect(() => workspace.getDomainByRefOrThrow("#/invalid/ref")).toThrow(
			"Domain with ref #/invalid/ref not found",
		);
	});

	it("should find subdomain by ref", () => {
		const workspace = new Workspace("Test Workspace", {
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
			description: "A test workspace",
			version: "0.1.0",
		});

		expect(() => workspace.getSubdomainByRefOrThrow("#/invalid/ref")).toThrow(
			"Subdomain with ref #/invalid/ref not found",
		);
	});

	it("should convert to schema", () => {
		const workspace = new Workspace("Test Workspace", {
			description: "A test workspace",
			version: "0.1.0",
			homepage: "https://example.com",
		});

		const _domain = workspace.addDomain("Commerce", {
			description: "Core commerce capabilities",
		});

		const schema = workspace.toSchema();

		expect(schema.name).toBe("Test Workspace");
		expect(schema.odsVersion).toBe("2.0.0");
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

describe("a process", () => {
	/** A context with the four consumables one lifecycle needs. */
	function lifecycle() {
		const ws = new Workspace("W", {
			description: "",
			version: "0",
		});
		const bc = ws.addBoundedContext("Orders", { description: "" });
		const app = bc.addService("App", { description: "", type: "application" });
		return {
			ws,
			bc,
			placed: app.provides("Placed", { description: "", type: "event" }),
			paid: app.provides("Paid", { description: "", type: "event" }),
			ship: app.provides("Ship", { description: "", type: "operation" }),
			shipped: app.provides("Shipped", { description: "", type: "event" }),
		};
	}

	it("takes its lifecycle as attributes or by chaining, and keeps each list distinct", () => {
		const { bc, placed, paid, ship, shipped } = lifecycle();
		const declared = bc.addProcess("Order to shipment", {
			description: "Waits for payment before it ships",
			starts: [placed],
			on: [paid],
			issues: [ship],
			ends: [shipped],
		});
		const chained = bc
			.addProcess("The same, chained", { description: "" })
			.starts(placed)
			.on(paid)
			.issues(ship)
			.ends(shipped);
		for (const process of [declared, chained]) {
			expect(process.startEvents).toEqual([placed]);
			expect(process.events).toEqual([paid]);
			expect(process.commands).toEqual([ship]);
			expect(process.endEvents).toEqual([shipped]);
		}
		// Naming the same consumable twice is the same statement, so it is kept once.
		declared.starts(placed).on(paid).issues(ship).ends(shipped);
		expect(declared.startEvents).toEqual([placed]);
		expect(declared.endEvents).toEqual([shipped]);
		expect(declared.ref).toBe(
			"#/boundedcontexts/orders/processes/order_to_shipment",
		);
	});

	it("round-trips its lifecycle, its comments and its disposition", () => {
		const { ws, bc, placed, paid, ship, shipped } = lifecycle();
		const process = bc
			.addProcess("Order to shipment", {
				description: "Waits for payment before it ships",
				comments: [{ text: "Implemented as a saga in orders/process/." }],
				disposition: "tolerated",
			})
			.starts(placed)
			.on(paid)
			.issues(ship)
			.ends(shipped);
		const rebuilt = Workspace.fromSchema(
			JSON.parse(JSON.stringify(ws.toSchema())),
		).getProcessByRefOrThrow(process.ref);
		expect(rebuilt.toSchema()).toEqual(process.toSchema());
		expect(rebuilt.disposition).toBe("tolerated");
		expect(rebuilt.comments).toHaveLength(1);
	});

	it("writes no comments key and no disposition when nothing was said", () => {
		const { bc, placed } = lifecycle();
		const schema = bc
			.addProcess("Bare", { description: "", starts: [placed] })
			.toSchema();
		expect(schema.comments).toBeUndefined();
		// by-design is what an absent disposition means, so it is never written.
		expect(
			bc.addProcess("By design", { description: "", disposition: "by-design" })
				.disposition,
		).toBeUndefined();
		expect(schema.on).toEqual([]);
	});
});

describe("a kind of another entity or value object", () => {
	/** Account with two kinds, and a kernel value object with one. */
	function kinds() {
		const ws = new Workspace("W", {
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

describe("an operation that answers with many of a shape", () => {
	/**
	 * A search answering with its matches: the answer is a list of the shape,
	 * which is a different thing from an object holding one (decision 13,
	 * amended).
	 */
	function searching() {
		const ws = new Workspace("Catalog", {
			description: "",
			version: "0.1.0",
		});
		const bc = ws.addBoundedContext("Catalog BC", { description: "" });
		const summary = bc.addSchema("Pet Summary", { description: "" });
		summary.addAttribute("petId", { type: "int64", identity: true });
		const one = bc.addSchema("Pet", { description: "" });
		const search = bc
			.addService("Pet App", { description: "", type: "application" })
			.provides("Find Pets By Status", {
				description: "",
				type: "operation",
				returns: { schema: summary, many: true },
			});
		const byId = bc.services.get("pet_app")?.provides("Get Pet By Id", {
			description: "",
			type: "operation",
			returns: one,
		});
		if (!byId) throw new Error("the service is the one just added");
		return { ws, search, byId };
	}

	it("names the shape and says the answer is a list of it", () => {
		const { search } = searching();
		expect(search.returns?.name).toBe("Pet Summary");
		expect(search.returnsMany).toBe(true);
		expect(search.returned().many).toBe(true);
		expect(search.returned().origin).toBe(
			"Find Pets By Status returns many Pet Summary",
		);
	});

	it("answers with one of the shape unless the model says many", () => {
		const { byId } = searching();
		expect(byId.returnsMany).toBe(false);
		expect(byId.returned().many).toBe(false);
		expect(byId.returned().origin).toBe("Get Pet By Id returns Pet");
		// Nothing to say is left unsaid, so a single answer carries no flag.
		expect(byId.toSchema().returns).toEqual({
			$ref: "#/boundedcontexts/catalog_bc/schemas/pet",
		});
	});

	it("carries many through the schema and back", () => {
		const { ws, search } = searching();
		expect(search.toSchema().returns).toEqual({
			$ref: "#/boundedcontexts/catalog_bc/schemas/pet_summary",
			many: true,
		});
		const rebuilt = getWorkspaceFromSchema(ws.toSchema());
		const reloaded = rebuilt.getConsumableByRefOrThrow(search.ref);
		expect(reloaded.returns?.ref).toBe(search.returns?.ref);
		expect(reloaded.returnsMany).toBe(true);
	});
});

describe("an operation whose request is many of a shape", () => {
	/**
	 * A bulk create taking a root array: the request is a list of the shape,
	 * which is a different thing from an object holding one, exactly as an
	 * answer is (decision 13, amended; card 114).
	 */
	function importing() {
		const ws = new Workspace("Identity", {
			description: "",
			version: "0.1.0",
		});
		const bc = ws.addBoundedContext("Identity BC", { description: "" });
		const user = bc.addSchema("User", { description: "" });
		user.addAttribute("username", { type: "string", identity: true });
		const app = bc.addService("User App", {
			description: "",
			type: "application",
		});
		const many = app.provides("Create Users With List", {
			description: "",
			type: "operation",
			schema: { of: user, many: true },
		});
		const one = app.provides("Create User", {
			description: "",
			type: "operation",
			schema: user,
		});
		return { ws, many, one };
	}

	it("names the shape and says the request is a list of it", () => {
		const { many } = importing();
		expect(many.schema?.name).toBe("User");
		expect(many.schemaMany).toBe(true);
	});

	it("takes one of the shape unless the model says many", () => {
		const { one } = importing();
		expect(one.schemaMany).toBe(false);
		// Nothing to say is left unsaid, so a single request carries no flag.
		expect(one.toSchema().schema).toEqual({
			$ref: "#/boundedcontexts/identity_bc/schemas/user",
		});
	});

	it("carries many through the schema and back", () => {
		const { ws, many } = importing();
		expect(many.toSchema().schema).toEqual({
			$ref: "#/boundedcontexts/identity_bc/schemas/user",
			many: true,
		});
		const rebuilt = getWorkspaceFromSchema(ws.toSchema());
		const reloaded = rebuilt.getConsumableByRefOrThrow(many.ref);
		expect(reloaded.schema?.ref).toBe(many.schema?.ref);
		expect(reloaded.schemaMany).toBe(true);
		expect(rebuilt.toSchema()).toEqual(ws.toSchema());
	});
});

describe("a refusal that enumerates the outcomes it carries", () => {
	/**
	 * An acquirer refusing a hold with one shape and its own response code:
	 * each code is an answer of its own, beside the shape-level answer that
	 * hears them all (decision 25, amended; card 114).
	 */
	function acquirer() {
		const ws = new Workspace("Payments", {
			description: "",
			version: "0.1.0",
		});
		const bc = ws.addBoundedContext("Payments BC", { description: "" });
		const declined = bc.addSchema("Provider Decline", { description: "" });
		const hold = bc
			.addService("Payments API", { description: "", type: "application" })
			.provides("Hold Funds", {
				description: "",
				type: "operation",
				rejects: [
					{ schema: declined, reasons: ["insufficient_funds", "issuer_down"] },
				],
			});
		return { ws, declined, hold };
	}

	it("keeps the shapes it refuses with, and what each of them may say", () => {
		const { declined, hold } = acquirer();
		expect(hold.rejects).toEqual([declined]);
		expect(hold.rejectsWith(declined)?.reasons).toEqual([
			"insufficient_funds",
			"issuer_down",
		]);
	});

	it("names one outcome by its own ref, beside the answer that hears them all", () => {
		const { declined, hold } = acquirer();
		const one = hold.rejected(declined, "issuer_down");
		const any = hold.rejected(declined);
		expect(one.ref).toBe(`${hold.ref}/rejects/provider_decline/issuer_down`);
		expect(any.ref).toBe(`${hold.ref}/rejects/provider_decline`);
		expect(one.name).toBe("Provider Decline (issuer_down)");
		expect(one.origin).toBe(
			"Hold Funds rejects with Provider Decline (issuer_down)",
		);
		expect(any.origin).toBe("Hold Funds rejects with Provider Decline");
		// Naming one twice names one object, which is what the walk keys on.
		expect(hold.rejected(declined, "issuer_down")).toBe(one);
		expect(one).not.toBe(any);
	});

	it("answers in as many ways as it enumerates, plus the shape and the completion", () => {
		const { hold } = acquirer();
		expect(hold.answers.map((it) => it.ref)).toEqual([
			`${hold.ref}/completed`,
			`${hold.ref}/rejects/provider_decline`,
			`${hold.ref}/rejects/provider_decline/insufficient_funds`,
			`${hold.ref}/rejects/provider_decline/issuer_down`,
		]);
	});

	it("declares the outcomes it lists and no others", () => {
		const { declined, hold } = acquirer();
		expect(hold.rejected(declined).declared).toBe(true);
		expect(hold.rejected(declined, "issuer_down").declared).toBe(true);
		expect(hold.rejected(declined, "no_such_code").declared).toBe(false);
	});

	it("resolves a reason ref, and nothing for one the contract does not state", () => {
		const { ws, hold } = acquirer();
		const reasonRef = `${hold.ref}/rejects/provider_decline/issuer_down`;
		expect(ws.getAnswerByRef(reasonRef)?.ref).toBe(reasonRef);
		// Reached the same way through the one place ref shapes are read.
		expect(ws.getByRef(reasonRef)?.ref).toBe(reasonRef);
		expect(
			ws.getAnswerByRef(`${hold.ref}/rejects/provider_decline/nope`),
		).toBeUndefined();
		expect(
			ws.getAnswerByRef(`${hold.ref}/rejects/no_such_shape/issuer_down`),
		).toBeUndefined();
	});

	it("carries the reasons through the schema and back", () => {
		const { ws, hold } = acquirer();
		expect(hold.toSchema().rejects).toEqual([
			{
				$ref: "#/boundedcontexts/payments_bc/schemas/provider_decline",
				reasons: ["insufficient_funds", "issuer_down"],
			},
		]);
		const rebuilt = getWorkspaceFromSchema(
			JSON.parse(JSON.stringify(ws.toSchema())),
		);
		const reloaded = rebuilt.getConsumableByRefOrThrow(hold.ref);
		expect(reloaded.rejections[0].reasons).toEqual([
			"insufficient_funds",
			"issuer_down",
		]);
		expect(rebuilt.toSchema()).toEqual(ws.toSchema());
	});

	it("leaves reasons unwritten where the contract enumerates none", () => {
		const { ws, declined } = acquirer();
		const bc = ws.getBoundedContextByRefOrThrow(
			"#/boundedcontexts/payments_bc",
		);
		const plain = bc.services.get("payments_api")?.provides("Take Funds", {
			description: "",
			type: "operation",
			rejects: [declined],
		});
		if (!plain) throw new Error("the service is the one just added");
		expect(plain.toSchema().rejects).toEqual([
			{ $ref: "#/boundedcontexts/payments_bc/schemas/provider_decline" },
		]);
		expect(plain.rejected(declined, "issuer_down").declared).toBe(false);
	});
});
