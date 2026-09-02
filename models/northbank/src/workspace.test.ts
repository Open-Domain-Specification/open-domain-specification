import { Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { workspace } from "./workspace";

/**
 * NorthBank plants exactly three structural problems, chosen so that it,
 * RiverMart and StreamLine together exercise every rule in the validation
 * catalog; see the DELIBERATE comments in workspace.ts and section 7 of
 * DISCOVERY.md.
 */
const deliberate: Array<{ rule: string; severity: "error" | "warning" }> = [
	{ rule: "separate-ways", severity: "error" },
	{ rule: "consumable-kind", severity: "error" },
	{ rule: "context-serves-subdomain", severity: "warning" },
];

describe("NorthBank reference workspace", () => {
	it("builds with its id and enough contexts to stress the pages", () => {
		expect(workspace.id).toBe("northbank");
		expect(workspace.boundedcontexts.size).toBeGreaterThanOrEqual(12);
		expect(workspace.relationships.length).toBeGreaterThan(12);
	});

	it("uses every relationship type and has one big ball of mud", () => {
		const types = new Set(workspace.relationships.map((r) => r.type));
		expect([...types].sort()).toEqual([
			"customer-supplier",
			"partnership",
			"separate-ways",
			"shared-kernel",
			"upstream-downstream",
		]);
		const legacy = [...workspace.boundedcontexts.values()].filter(
			(bc) => bc.bigBallOfMud,
		);
		expect(legacy).toHaveLength(1);
	});

	it("gives every context a team", () => {
		for (const bc of workspace.boundedcontexts.values()) {
			expect(bc.team, `${bc.name} has no team`).toBeDefined();
		}
	});

	it("has a glossary, policies and schemas on cross-context events", () => {
		const contexts = [...workspace.boundedcontexts.values()];
		expect(contexts.some((bc) => bc.glossary.size > 0)).toBe(true);
		expect(contexts.reduce((n, bc) => n + bc.policies.size, 0)).toBeGreaterThan(
			5,
		);
		for (const bc of contexts) {
			for (const provider of [
				...bc.aggregates.values(),
				...bc.services.values(),
			]) {
				for (const c of provider.consumables.values()) {
					const consumedElsewhere = c.consumptions.some(
						(it) => it.consumer.boundedcontext !== bc,
					);
					if (c.type === "event" && consumedElsewhere && !c.internal) {
						expect(c.schema, `${c.name} has no schema`).toBeDefined();
					}
				}
			}
		}
	});

	it("validate() returns exactly the deliberate problems", () => {
		const diagnostics = workspace
			.validate()
			.map(({ rule, severity }) => ({ rule, severity }))
			.sort((a, b) => a.rule.localeCompare(b.rule));
		expect(diagnostics).toEqual(
			[...deliberate].sort((a, b) => a.rule.localeCompare(b.rule)),
		);
	});

	it("round-trips through Workspace.fromSchema", () => {
		const schema = workspace.toSchema();
		const rebuilt = Workspace.fromSchema(JSON.parse(JSON.stringify(schema)));
		expect(rebuilt.toSchema()).toEqual(schema);
		expect(rebuilt.validate()).toEqual(workspace.validate());
	});
});
