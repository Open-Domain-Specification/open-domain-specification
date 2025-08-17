import { describe, expect, it } from "vitest";
import { relationMapToDigraph } from "./relation-map";
import { consumableMapToDigraph } from "./consumable-map";
import { ODSRelationMap, ODSConsumableMap, Workspace } from "@open-domain-specification/core";

describe("relationMapToDigraph edge cases", () => {
	it("should handle empty relation map", async () => {
		const workspace = new Workspace("Test", {
			odsVersion: "1.0.0",
			description: "Test",
			version: "0.1.0",
		});

		const domain = workspace.addDomain("Test", {
			description: "Test domain",
			type: "core",
		});

		const subdomain = domain.addSubdomain("Test", {
			description: "Test subdomain",
		});

		const bc = subdomain.addBoundedcontext("Test", {
			description: "Test BC",
		});

		const aggregate = bc.addAggregate("Test", {
			description: "Test aggregate",
		});

		const relationMap = ODSRelationMap.fromAggregate(aggregate);
		const digraph = relationMapToDigraph(relationMap);
		const svg = await digraph.toSVG();

		expect(svg).toBeTruthy();
		expect(svg).toContain("<svg");
		expect(svg).toContain("</svg>");
	});

	it("should handle relation map with entities and value objects", async () => {
		const workspace = new Workspace("Test", {
			odsVersion: "1.0.0",
			description: "Test",
			version: "0.1.0",
		});

		const domain = workspace.addDomain("Commerce", {
			description: "Commerce domain",
			type: "core",
		});

		const subdomain = domain.addSubdomain("Sales", {
			description: "Sales subdomain",
		});

		const bc = subdomain.addBoundedcontext("Orders", {
			description: "Orders BC",
		});

		const aggregate = bc.addAggregate("Order", {
			description: "Order aggregate",
		});

		const order = aggregate.addRootEntity("Order", {
			description: "Order entity",
		});

		const money = aggregate.addValueObject("Money", {
			description: "Money value object",
		});

		order.uses(money, "has price");

		const relationMap = ODSRelationMap.fromAggregate(aggregate);
		const digraph = relationMapToDigraph(relationMap);
		const svg = await digraph.toSVG();

		expect(svg).toBeTruthy();
		expect(svg).toContain("<svg");
		expect(svg).toContain("</svg>");
		expect(svg).toContain("Order");
		expect(svg).toContain("Money");
	});
});

describe("consumableMapToDigraph edge cases", () => {
	it("should handle empty consumable map", async () => {
		const workspace = new Workspace("Test", {
			odsVersion: "1.0.0",
			description: "Test",
			version: "0.1.0",
		});

		const domain = workspace.addDomain("Test", {
			description: "Test domain",
			type: "core",
		});

		const subdomain = domain.addSubdomain("Test", {
			description: "Test subdomain",
		});

		const bc = subdomain.addBoundedcontext("Test", {
			description: "Test BC",
		});

		const service = bc.addService("TestService", {
			description: "Test service",
			type: "domain",
		});

		const consumableMap = ODSConsumableMap.fromService(service);
		const digraph = consumableMapToDigraph(consumableMap);
		const svg = await digraph.toSVG();

		expect(svg).toBeTruthy();
		expect(svg).toContain("<svg");
		expect(svg).toContain("</svg>");
	});

	it("should handle consumable map with provides and consumes", async () => {
		const workspace = new Workspace("Test", {
			odsVersion: "1.0.0",
			description: "Test",
			version: "0.1.0",
		});

		const domain = workspace.addDomain("Commerce", {
			description: "Commerce domain",
			type: "core",
		});

		const subdomain = domain.addSubdomain("Sales", {
			description: "Sales subdomain",
		});

		const bc1 = subdomain.addBoundedcontext("Orders", {
			description: "Orders BC",
		});

		const bc2 = subdomain.addBoundedcontext("Payments", {
			description: "Payments BC",
		});

		const orderService = bc1.addService("OrderService", {
			description: "Order service",
			type: "domain",
		});

		const paymentService = bc2.addService("PaymentService", {
			description: "Payment service",
			type: "domain",
		});

		const orderOperation = orderService.provides("CreateOrder", {
			description: "Create order operation",
			type: "operation",
			pattern: "open-host-service",
		});

		const paymentOperation = paymentService.provides("ProcessPayment", {
			description: "Process payment operation",
			type: "operation",
			pattern: "open-host-service",
		});

		orderService.consumes(paymentOperation, {
			pattern: "conformist",
		});

		const consumableMap = ODSConsumableMap.fromService(orderService);
		const digraph = consumableMapToDigraph(consumableMap);
		const svg = await digraph.toSVG();

		expect(svg).toBeTruthy();
		expect(svg).toContain("<svg");
		expect(svg).toContain("</svg>");
	});

	it("should handle aggregate with consumables", async () => {
		const workspace = new Workspace("Test", {
			odsVersion: "1.0.0",
			description: "Test",
			version: "0.1.0",
		});

		const domain = workspace.addDomain("Commerce", {
			description: "Commerce domain",
			type: "core",
		});

		const subdomain = domain.addSubdomain("Sales", {
			description: "Sales subdomain",
		});

		const bc = subdomain.addBoundedcontext("Orders", {
			description: "Orders BC",
		});

		const aggregate = bc.addAggregate("Order", {
			description: "Order aggregate",
		});

		const operation = aggregate.provides("CreateOrder", {
			description: "Create order operation",
			type: "operation",
			pattern: "open-host-service",
		});

		const consumableMap = ODSConsumableMap.fromAggregate(aggregate);
		const digraph = consumableMapToDigraph(consumableMap);
		const svg = await digraph.toSVG();

		expect(svg).toBeTruthy();
		expect(svg).toContain("<svg");
		expect(svg).toContain("</svg>");
	});
});

describe("Graphviz error handling", () => {
	it("should handle SVG generation failures gracefully", async () => {
		const workspace = new Workspace("Error Test", {
			odsVersion: "1.0.0",
			description: "Error test",
			version: "0.1.0",
		});

		const domain = workspace.addDomain("Test", {
			description: "Test domain",
			type: "core",
		});

		const relationMap = ODSRelationMap.fromDomain(domain);
		const digraph = relationMapToDigraph(relationMap);
		
		// This should not throw even if the map is empty or has issues
		expect(() => digraph.toSVG()).not.toThrow();
	});
});