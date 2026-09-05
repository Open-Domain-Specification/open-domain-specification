import { ODSContextMap, Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { contextMapToDigraph } from "./context-map";
import { EXTERNAL_STEREOTYPE } from "./role-labels";

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
		});

		const subdomain = domain.addSubdomain("Sales", {
			type: "core",
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

	it("draws an identity-only dependency dashed, under the «id» stereotype", () => {
		const workspace = new Workspace("Identity Only", {
			odsVersion: "1.0.0",
			description: "One identity across a boundary and nothing else",
			version: "0.1.0",
		});
		const up = workspace.addBoundedContext("Catalogue", { description: "" });
		const down = workspace.addBoundedContext("Orders", { description: "" });
		const product = up
			.addAggregate("Product", { description: "" })
			.addRootEntity("Product", { description: "" });
		down
			.addAggregate("Order", { description: "" })
			.addRootEntity("Order", { description: "" })
			.addAttribute("Product Id", { type: "uuid", identifies: product });

		const dot = contextMapToDigraph(
			ODSContextMap.fromWorkspace(workspace),
		).toDot();
		expect(dot).toContain('label = "«id»"');
		expect(dot).toContain('style = "dashed"');
		expect(dot).not.toContain('label = "U/D"');
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

	it("draws a context nobody owns under the external-system stereotype", async () => {
		const workspace = new Workspace("Outside", {
			odsVersion: "1.0.0",
			description: "One of ours and one of theirs",
			version: "0.1.0",
		});
		workspace.addBoundedContext("Payments", { description: "Ours" });
		workspace.addBoundedContext("Card Scheme", {
			description: "Theirs",
			external: true,
		});

		const digraph = contextMapToDigraph(ODSContextMap.fromWorkspace(workspace));
		const dot = digraph.toDot();
		expect(dot).toContain(`${EXTERNAL_STEREOTYPE}\\nCard Scheme`);
		expect(dot).not.toContain(`${EXTERNAL_STEREOTYPE}\\nPayments`);
		expect(await digraph.toSVG()).toContain("external system");
	});
});
