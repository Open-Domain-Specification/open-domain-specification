import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
	addFamiliesUnder,
	FAMILIES,
	familyOfRef,
	NOT_AUTHORED,
	OPERATION_COUNT,
	SUPPORT_PROPERTIES,
} from "./families";

type Def = {
	properties?: Record<
		string,
		{ $ref?: string; items?: { $ref?: string } | unknown[] }
	>;
	enum?: string[];
};
type Schema = Def & { definitions: Record<string, Def> };

const schema = JSON.parse(
	readFileSync(path.resolve(__dirname, "../../schema.json"), "utf8"),
) as Schema;

const defOf = (name: string): Def =>
	name === "WorkspaceSchema" ? schema : schema.definitions[name];

/** The enumeration a property is one of, read through its $ref or its items. */
function enumOf(prop: {
	$ref?: string;
	items?: unknown;
}): string[] | undefined {
	const ref = prop.$ref ?? (prop.items as { $ref?: string } | undefined)?.$ref;
	return ref
		? schema.definitions[ref.split("/").pop() as string]?.enum
		: undefined;
}

describe("F1 the descriptor table is the schema", () => {
	it("holds exactly 39 operations in 20 families", () => {
		expect(FAMILIES).toHaveLength(20);
		expect(OPERATION_COUNT).toBe(39);
		const ids = FAMILIES.flatMap((f) =>
			[f.add?.id, f.update?.id].filter((id) => id),
		);
		expect(new Set(ids).size).toBe(39);
		expect(FAMILIES.filter((f) => !f.add).map((f) => f.id)).toEqual([
			"workspace",
		]);
		expect(FAMILIES.filter((f) => !f.update)).toEqual([]);
	});

	it("classifies every schema property of every family definition, and invents none", () => {
		const supportKeys = new Set(Object.keys(SUPPORT_PROPERTIES));
		for (const family of FAMILIES) {
			const properties = new Set(
				family.schemaDefs.flatMap((d) =>
					Object.keys(defOf(d).properties ?? {}),
				),
			);
			const editable = new Set(
				[family.add, family.update].flatMap((op) =>
					(op?.fields ?? []).flatMap((f) => f.writesJson),
				),
			);
			const readOnly = new Set(
				(family.update?.readOnly ?? []).map((r) => r.property),
			);
			const collections = new Set(family.collections.map((c) => c.property));
			const accounted = new Set([
				...editable,
				...readOnly,
				...collections,
				"key",
			]);
			// every property is a field, a read-only row, or a child collection
			for (const p of properties)
				expect(
					accounted.has(p) || p === "$schema",
					`${family.id}.${p} is unclassified`,
				).toBe(true);
			// and nothing is classified that the schema does not have
			for (const p of [...editable, ...readOnly, ...collections])
				if (p !== "key")
					expect(
						properties.has(p),
						`${family.id}.${p} is not in the schema`,
					).toBe(true);
			// a read-only row states its reason and its source
			for (const row of family.update?.readOnly ?? []) {
				expect(row.reason.length).toBeGreaterThan(40);
				expect(row.source.length).toBeGreaterThan(5);
			}
			// nothing mutable is offered only on one side
			const names = (op: typeof family.add) =>
				new Set((op?.fields ?? []).map((f) => f.name));
			if (
				family.add &&
				family.update &&
				family.id !== "consumption" &&
				family.id !== "relationship"
			)
				expect(
					[...names(family.update)].filter((n) => !names(family.add).has(n)),
				).toEqual([]);
		}
		// the supporting definitions are accounted for too
		for (const [name, def] of Object.entries(schema.definitions))
			for (const p of Object.keys(def.properties ?? {}))
				if (
					/^(Comment|CommentLink|RefSchema|RejectionRefSchema|ShapeRefSchema|WorkspaceOptionsSchema|RuleOptionsSchema)$/.test(
						name,
					)
				)
					expect(supportKeys.has(`${name}.${p}`), `${name}.${p}`).toBe(true);
		expect(NOT_AUTHORED.length).toBeGreaterThan(2);
	});

	it("matches every enumeration to the schema, states the audited identity rows and finds a family by ref", () => {
		for (const family of FAMILIES)
			for (const op of [family.add, family.update])
				for (const f of op?.fields ?? [])
					if (f.enum && f.codec !== "systemKind" && f.codec !== "timing") {
						// a property of two definitions (relationship type) is the union of both
						const values = family.schemaDefs.flatMap((d) => {
							const prop = defOf(d).properties?.[f.writesJson[0]];
							return (prop && enumOf(prop)) ?? [];
						});
						expect([...f.enum].sort(), `${op?.id}.${f.name}`).toEqual(
							[...new Set(values)].sort(),
						);
					}
		const update = (id: string) => FAMILIES.find((f) => f.id === id)?.update;
		// consumable type is editable (not identity); a consumption's consumable is not
		expect(update("consumable")?.fields.map((f) => f.name)).toContain("type");
		expect(update("consumable")?.readOnly.map((r) => r.property)).toEqual([
			"key",
		]);
		expect(update("consumption")?.fields.map((f) => f.name)).toContain("by");
		expect(update("consumption")?.readOnly.map((r) => r.property)).toEqual([
			"consumable",
		]);
		expect(update("relationship")?.readOnly.map((r) => r.property)).toEqual([
			"type",
			"name",
			"upstream",
			"downstream",
			"participants",
		]);
		expect(update("workspace")?.readOnly.map((r) => r.property)).toEqual([
			"id",
			"odsVersion",
			"$schema",
		]);
		// a family is found by its ref, and what can be added under an element is its family's business

		expect(familyOfRef("#")).toBe("workspace");
		expect(familyOfRef("#/boundedcontexts/ledger")).toBe("context");
		expect(
			familyOfRef("#/boundedcontexts/l/aggregates/a/entities/e/attributes/x"),
		).toBe("attribute");
		expect(familyOfRef("#/boundedcontexts/l/services/s/provides/p")).toBe(
			"consumable",
		);
		expect(addFamiliesUnder("#")).toEqual([
			"domain",
			"team",
			"context",
			"relationship",
		]);
		expect(addFamiliesUnder("#/boundedcontexts/ledger")).toContain("aggregate");
		expect(addFamiliesUnder("#/boundedcontexts/l/aggregates/a")).toEqual([
			"entity",
			"invariant",
			"consumable",
			"consumption",
		]);
	});
});
