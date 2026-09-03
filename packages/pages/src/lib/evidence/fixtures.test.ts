import { describe, expect, it } from "vitest";
import {
	PATTERN_SUMMARIES,
	PETSTORE_SHEETS,
	petstoreEvidence,
	relationshipKey,
	sheetForRef,
	sheetForRelationship,
	strategicPositionFixture,
} from "./fixtures";

describe("evidence fixtures", () => {
	it("keys a relationship by its two contexts and its type", () => {
		const { model } = petstoreEvidence();
		const [first] = model.workspace.relationships;
		expect(relationshipKey(first)).toBe(
			`${first.source.id}~${first.type}~${first.target.id}`,
		);
	});

	it("gives four of the five petstore relationships a sheet and leaves one bare", () => {
		const { model, sheets, context } = petstoreEvidence();
		expect(context.id).toBe("sales_bc");
		const found = model.workspace.relationships.map((r) =>
			sheetForRelationship(sheets, r),
		);
		expect(found.filter(Boolean)).toHaveLength(4);
		const bare = model.workspace.relationships.find(
			(r) => r.type === "separate-ways",
		);
		expect(sheetForRelationship(sheets, bare!)).toBeUndefined();
	});

	it("gives the shared kernel a refactor sheet saying what it should become", () => {
		const sheet = PETSTORE_SHEETS["catalog_bc~shared-kernel~inventory_bc"];
		expect(sheet.disposition).toBe("refactor");
		expect(sheet.facts.map((f) => f.link?.kind)).toContain("adr");
	});

	it("looks an element sheet up by its ref", () => {
		const ref =
			"#/boundedcontexts/catalog_bc/aggregates/pet/provides/reserve_pet";
		expect(sheetForRef(PETSTORE_SHEETS, ref)?.disposition).toBe("refactor");
		expect(sheetForRef(PETSTORE_SHEETS, "#/nothing")).toBeUndefined();
	});

	it("summarises every relationship type and role the petstore uses", () => {
		const { model } = petstoreEvidence();
		for (const r of model.workspace.relationships) {
			expect(PATTERN_SUMMARIES[r.type]).toBeTruthy();
			for (const role of [...r.upstreamRoles, ...r.downstreamRoles])
				expect(PATTERN_SUMMARIES[role]).toBeTruthy();
		}
	});

	it("builds a hub with exactly the requested number of relationships", () => {
		for (const n of [1, 3, 8]) {
			const { model, context } = strategicPositionFixture(n);
			expect(model.workspace.relationships).toHaveLength(n);
			expect(model.fileLabel).toBe("density.json");
			for (const r of model.workspace.relationships)
				expect([r.source, r.target]).toContain(context);
		}
	});

	it("covers every disposition, including a relationship with no sheet, at eight", () => {
		const { model, sheets } = strategicPositionFixture(8);
		const found = model.workspace.relationships.map(
			(r) => sheetForRelationship(sheets, r)?.disposition,
		);
		expect(new Set(found)).toEqual(
			new Set(["by-design", "tolerated", "refactor", undefined]),
		);
	});

	it("puts one relationship in each group by the third counterpart", () => {
		const { model, context } = strategicPositionFixture(3);
		const types = model.workspace.relationships.map((r) => r.type);
		expect(types).toEqual([
			"customer-supplier",
			"upstream-downstream",
			"shared-kernel",
		]);
		// The hub is downstream of the first and upstream of the second.
		expect(model.workspace.relationships[0].target).toBe(context);
		expect(model.workspace.relationships[1].source).toBe(context);
	});
});
