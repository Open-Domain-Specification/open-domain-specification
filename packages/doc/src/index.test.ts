import { describe, expect, it } from "vitest";
import { toDoc } from "./index";
import { Workspace } from "@open-domain-specification/core";

describe("toDoc", () => {
	it("should generate documentation for empty workspace", async () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		const docs = await toDoc(workspace);

		expect(docs).toHaveProperty("test_workspace/index.md");
		expect(docs).toHaveProperty("test_workspace/contextmap.svg");
		expect(docs).toHaveProperty("_sidebar.md");
		
		// Check that the sidebar contains the workspace
		expect(docs["_sidebar.md"]).toContain("Test Workspace");
		
		// Check that the workspace index contains basic info
		const workspaceDoc = docs["test_workspace/index.md"];
		expect(workspaceDoc).toContain("Test Workspace");
		expect(workspaceDoc).toContain("A test workspace");
	});

	it("should generate documentation for workspace with domains", async () => {
		const workspace = new Workspace("eCommerce", {
			odsVersion: "1.0.0",
			description: "eCommerce platform",
			version: "0.1.0",
		});

		const commerce = workspace.addDomain("Commerce", {
			description: "Core commerce capabilities",
			type: "core",
		});

		const sales = commerce.addSubdomain("Sales", {
			description: "Sales functionality",
		});

		const docs = await toDoc(workspace);

		// Should have workspace docs (note the actual path format)
		expect(docs).toHaveProperty("e_commerce/index.md");
		expect(docs).toHaveProperty("e_commerce/contextmap.svg");
		
		// Should have domain docs
		expect(docs).toHaveProperty("domains/commerce/index.md");
		expect(docs).toHaveProperty("domains/commerce/contextmap.svg");
		
		// Should have subdomain docs
		expect(docs).toHaveProperty("domains/commerce/subdomains/sales/index.md");
		expect(docs).toHaveProperty("domains/commerce/subdomains/sales/contextmap.svg");
		
		// Check sidebar structure
		const sidebar = docs["_sidebar.md"];
		expect(sidebar).toContain("eCommerce");
		expect(sidebar).toContain("Commerce");
		expect(sidebar).toContain("Sales");
	});

	it("should generate documentation for complex workspace structure", async () => {
		const workspace = new Workspace("Complex System", {
			odsVersion: "1.0.0",
			description: "A complex system",
			version: "0.1.0",
		});

		const commerce = workspace.addDomain("Commerce", {
			description: "Core commerce capabilities",
			type: "core",
		});

		const sales = commerce.addSubdomain("Sales", {
			description: "Sales functionality",
		});

		const ordering = sales.addBoundedcontext("Ordering", {
			description: "Order management",
		});

		const orderService = ordering.addService("OrderService", {
			description: "Order service",
			type: "domain",
		});

		const orderAggregate = ordering.addAggregate("Order", {
			description: "Order aggregate",
		});

		const docs = await toDoc(workspace);

		// Should have service docs
		expect(docs).toHaveProperty("domains/commerce/subdomains/sales/boundedcontexts/ordering/services/order_service/index.md");
		expect(docs).toHaveProperty("domains/commerce/subdomains/sales/boundedcontexts/ordering/services/order_service/consumablemap.svg");
		
		// Should have aggregate docs
		expect(docs).toHaveProperty("domains/commerce/subdomains/sales/boundedcontexts/ordering/aggregates/order/index.md");
		expect(docs).toHaveProperty("domains/commerce/subdomains/sales/boundedcontexts/ordering/aggregates/order/relationmap.svg");
		expect(docs).toHaveProperty("domains/commerce/subdomains/sales/boundedcontexts/ordering/aggregates/order/consumablemap.svg");

		// Check that the bounded context doc contains services and aggregates
		const boundedContextDoc = docs["domains/commerce/subdomains/sales/boundedcontexts/ordering/index.md"];
		expect(boundedContextDoc).toContain("OrderService");
		expect(boundedContextDoc).toContain("Order");
	});

	it("should handle workspace with options", async () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		const options = {
			breadcrumbs: true,
		};

		const docs = await toDoc(workspace, options);

		expect(docs).toHaveProperty("test_workspace/index.md");
		expect(docs).toHaveProperty("_sidebar.md");
		
		// The docs should still be generated properly with options
		const workspaceDoc = docs["test_workspace/index.md"];
		expect(workspaceDoc).toContain("Test Workspace");
	});
});