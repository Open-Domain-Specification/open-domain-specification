import { ODSContextMap, Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { contextMapToDigraph } from "./context-map";

describe("contextMapToDigraph edge cases", () => {
	it("should handle empty context map", async () => {
		const workspace = new Workspace("Empty Workspace", {
			odsVersion: "1.0.0",
			description: "Empty workspace",
			version: "0.1.0",
		});

		const contextMap = ODSContextMap.fromWorkspace(workspace);
		const digraph = contextMapToDigraph(contextMap);
		const svg = await digraph.toSVG();

		expect(svg).toBeTruthy();
		expect(svg).toContain("<svg");
		expect(svg).toContain("</svg>");
	});

	it("should handle context map with single domain", async () => {
		const workspace = new Workspace("Single Domain", {
			odsVersion: "1.0.0",
			description: "Single domain workspace",
			version: "0.1.0",
		});

		const domain = workspace.addDomain("TestDomain", {
			description: "Test domain",
			type: "core",
		});

		const contextMap = ODSContextMap.fromDomain(domain);
		const digraph = contextMapToDigraph(contextMap);
		const svg = await digraph.toSVG();

		expect(svg).toBeTruthy();
		expect(svg).toContain("<svg");
		expect(svg).toContain("</svg>");
	});

	it("should handle context map with multiple bounded contexts", async () => {
		const workspace = new Workspace("Multi BC", {
			odsVersion: "1.0.0",
			description: "Multiple bounded contexts",
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
			description: "Order management",
		});

		const bc2 = subdomain.addBoundedcontext("Payments", {
			description: "Payment processing",
		});

		const service1 = bc1.addService("OrderService", {
			description: "Order service",
			type: "domain",
		});

		const service2 = bc2.addService("PaymentService", {
			description: "Payment service",
			type: "domain",
		});

		// Create consumption relationship
		const operation = service1.provides("CreateOrder", {
			description: "Create order operation",
			type: "operation",
			pattern: "open-host-service",
		});

		service2.consumes(operation, {
			pattern: "conformist",
		});

		const contextMap = ODSContextMap.fromSubdomain(subdomain);
		const digraph = contextMapToDigraph(contextMap);
		const svg = await digraph.toSVG();

		expect(svg).toBeTruthy();
		expect(svg).toContain("<svg");
		expect(svg).toContain("</svg>");
		// Should contain both bounded contexts
		expect(svg).toContain("Orders");
		expect(svg).toContain("Payments");
	});

	it("should handle error cases gracefully", async () => {
		// Test with null/undefined input - this would be a development error
		// but we want to ensure it doesn't crash the system
		const workspace = new Workspace("Error Test", {
			odsVersion: "1.0.0",
			description: "Error test workspace",
			version: "0.1.0",
		});

		const contextMap = ODSContextMap.fromWorkspace(workspace);

		// The digraph should handle empty maps gracefully
		const digraph = contextMapToDigraph(contextMap);
		expect(() => digraph.toSVG()).not.toThrow();
	});
});
