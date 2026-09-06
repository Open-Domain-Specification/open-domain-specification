import { describe, expect, it } from "vitest";
import { isSymmetricRelationship, relationshipTitle } from "./relationship";
import { Workspace } from "./workspace";

function makeWs() {
	const ws = new Workspace("WS", {
		description: "",
		version: "test",
	});
	const subdomain = ws
		.addDomain("Shop", { description: "" })
		.addSubdomain("Selling", { type: "core", description: "" });
	const catalog = subdomain.addBoundedcontext("Catalog", { description: "" });
	const sales = subdomain.addBoundedcontext("Sales", { description: "" });
	return { ws, catalog, sales };
}

describe("isSymmetricRelationship", () => {
	it("is true for the three relationship types with no upstream or downstream side", () => {
		expect(isSymmetricRelationship("partnership")).toBe(true);
		expect(isSymmetricRelationship("shared-kernel")).toBe(true);
		expect(isSymmetricRelationship("separate-ways")).toBe(true);
	});

	it("is false for directed relationship types", () => {
		expect(isSymmetricRelationship("upstream-downstream")).toBe(false);
		expect(isSymmetricRelationship("customer-supplier")).toBe(false);
	});
});

describe("relationshipTitle", () => {
	it("uses a directed arrow for an upstream/downstream relationship", () => {
		const { catalog, sales } = makeWs();
		const r = catalog.upstreamOf(sales, {});
		expect(relationshipTitle(r)).toBe("Catalog → Sales");
	});

	it("uses a double arrow for a symmetric relationship", () => {
		const { ws, catalog, sales } = makeWs();
		const r = ws.addRelationship({
			type: "separate-ways",
			participants: [catalog, sales],
		});
		expect(relationshipTitle(r)).toBe("Catalog ↔ Sales");
	});
});
