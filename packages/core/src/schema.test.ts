import { describe, expect, it, vi } from "vitest";
import { Workspace } from "./workspace";

describe("Workspace Schema Validation", () => {
	it("should create workspace from valid schema", () => {
		const schema = {
			id: "test_workspace",
			name: "Test Workspace",
			odsVersion: "1.0.0" as const,
			description: "A test workspace",
			version: "0.1.0",
			domains: {
				commerce: {
					name: "Commerce",
					description: "Commerce domain",
					type: "core" as const,
					subdomains: {},
				},
			},
		};

		const workspace = Workspace.fromSchema(schema);

		expect(workspace.name).toBe("Test Workspace");
		expect(workspace.odsVersion).toBe("1.0.0");
		expect(workspace.domains.size).toBe(1);
		expect(workspace.domains.get("commerce")?.name).toBe("Commerce");
	});

	it("should handle edge cases in schema conversion", () => {
		const schema = {
			id: "edge_case_workspace",
			name: "Edge Case Workspace",
			odsVersion: "2.1.0" as const,
			description: "Testing edge cases",
			version: "1.0.0",
			homepage: "https://example.com",
			logoUrl: "https://example.com/logo.png",
			primaryColor: "#123456",
			domains: {},
		};

		const workspace = Workspace.fromSchema(schema);

		expect(workspace.name).toBe("Edge Case Workspace");
		expect(workspace.homepage).toBe("https://example.com");
		expect(workspace.logoUrl).toBe("https://example.com/logo.png");
		expect(workspace.primaryColor).toBe("#123456");
		expect(workspace.domains.size).toBe(0);
	});

	it("should handle empty workspace schema", () => {
		const schema = {
			id: "empty_workspace",
			name: "Empty Workspace",
			odsVersion: "1.0.0" as const,
			description: "Empty workspace for testing",
			version: "0.1.0",
			domains: {},
		};

		const workspace = Workspace.fromSchema(schema);

		expect(workspace.name).toBe("Empty Workspace");
		expect(workspace.domains.size).toBe(0);
	});
});

describe("Workspace Edge Cases", () => {
	it("should handle special characters in names", () => {
		const workspace = new Workspace("Test & Special Characters!", {
			odsVersion: "1.0.0",
			description: "Testing special characters",
			version: "0.1.0",
		});

		expect(workspace.name).toBe("Test & Special Characters!");
		expect(workspace.id).toBe("test_&_special_characters!");
	});

	it("should handle empty search results gracefully", () => {
		const workspace = new Workspace("Empty Workspace", {
			odsVersion: "1.0.0",
			description: "Empty workspace",
			version: "0.1.0",
		});

		// Test all search methods return undefined for empty workspace
		expect(workspace.getDomainByRef("#/domains/nonexistent")).toBeUndefined();
		expect(
			workspace.getSubdomainByRef("#/domains/nonexistent/subdomains/test"),
		).toBeUndefined();
		expect(
			workspace.getBoundedContextByRef(
				"#/domains/nonexistent/subdomains/test/boundedcontexts/test",
			),
		).toBeUndefined();
		expect(
			workspace.getServiceByRef(
				"#/domains/nonexistent/subdomains/test/boundedcontexts/test/services/test",
			),
		).toBeUndefined();
		expect(
			workspace.getAggregateByRef(
				"#/domains/nonexistent/subdomains/test/boundedcontexts/test/aggregates/test",
			),
		).toBeUndefined();
		expect(
			workspace.getEntityByRef(
				"#/domains/nonexistent/subdomains/test/boundedcontexts/test/aggregates/test/entities/test",
			),
		).toBeUndefined();
		expect(
			workspace.getValueObjectByRef(
				"#/domains/nonexistent/subdomains/test/boundedcontexts/test/aggregates/test/valueobjects/test",
			),
		).toBeUndefined();
		expect(
			workspace.getEntityOrValueobjectByRef("#/invalid/ref"),
		).toBeUndefined();
	});

	it("should handle malformed refs in entity/value object search", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "Test workspace",
			version: "0.1.0",
		});

		// Test with refs that don't match entity or value object patterns
		expect(
			workspace.getEntityOrValueobjectByRef("#/domains/test"),
		).toBeUndefined();
		expect(
			workspace.getEntityOrValueobjectByRef("#/invalid/format"),
		).toBeUndefined();
		expect(workspace.getEntityOrValueobjectByRef("not-a-ref")).toBeUndefined();
	});

	it("should provide proper visitor interface", () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "Test workspace",
			version: "0.1.0",
		});

		const mockVisitor = {
			visitWorkspace: vi.fn(),
			visitDomain: vi.fn(),
			visitSubdomain: vi.fn(),
			visitBoundedContext: vi.fn(),
			visitService: vi.fn(),
			visitAggregate: vi.fn(),
			visitEntity: vi.fn(),
			visitValueObject: vi.fn(),
			visitEntityRelation: vi.fn(),
			visitConsumption: vi.fn(),
			visitConsumable: vi.fn(),
			visitInvariant: vi.fn(),
		};

		workspace.accept(mockVisitor);
		expect(mockVisitor.visitWorkspace).toHaveBeenCalledWith(workspace);
	});
});
