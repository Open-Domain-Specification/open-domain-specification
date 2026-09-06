import { Workspace } from "@open-domain-specification/core";
import { assertDocSite } from "@open-domain-specification/model-tools";
import { describe, expect, it } from "vitest";
import { workspace } from "./workspace.ts";

/**
 * Pins this workspace's diagnostics at zero. Card 117 in
 * `boards/project-backlog/` is the full journal of what this model met and
 * fixed on the way; card 122 removed the one deliberate diagnostic
 * (`domain-service-consumes-inside`) once the debate on decision 17's
 * reopening condition found it was the record's own shape chosen wrongly,
 * not the honest one — the nurse's real check is a precondition on `Accept
 * Referral` reading the summary its front (`Referral Intake`) fetched, not a
 * domain service calling out on its own. See `models/clinic/DISCOVERY.md`
 * and `models/clinic/src/workspace.ts`.
 */
const DELIBERATE: Array<{ rule: string; severity: "error" | "warning" }> = [];

describe("the outpatient clinic workspace", () => {
	it("is named and versioned", () => {
		expect(workspace.id).toBe("outpatient_clinic");
		expect(workspace.name).toBe("Outpatient Clinic");
	});

	it("names exactly one external context per outside system", () => {
		const external = [...workspace.boundedcontexts.values()].filter(
			(bc) => bc.external,
		);
		expect(external.map((bc) => bc.name).sort()).toEqual([
			"Clinical Coding Regulator",
			"GP Practice System",
			"Laboratory",
		]);
	});

	it("gives every context the enterprise owns a team", () => {
		for (const bc of workspace.boundedcontexts.values()) {
			if (bc.external) continue;
			expect(bc.team, `${bc.name} has no team`).not.toBeUndefined();
		}
	});

	it("keeps a glossary, at least one process, and several policies", () => {
		const contexts = [...workspace.boundedcontexts.values()];
		expect(contexts.some((bc) => bc.glossary.size > 0)).toBe(true);
		expect(contexts.reduce((n, bc) => n + bc.processes.size, 0)).toBeGreaterThan(0);
		expect(contexts.reduce((n, bc) => n + bc.policies.size, 0)).toBeGreaterThan(3);
	});

	it("validates with exactly the diagnostics this card records on purpose", () => {
		const diagnostics = workspace
			.validate()
			.map(({ rule, severity }) => ({ rule, severity }))
			.sort((a, b) => a.rule.localeCompare(b.rule));
		expect(diagnostics).toEqual(
			[...DELIBERATE].sort((a, b) => a.rule.localeCompare(b.rule)),
		);
	});

	it("round-trips through Workspace.fromSchema", () => {
		const schema = workspace.toSchema();
		const rebuilt = Workspace.fromSchema(JSON.parse(JSON.stringify(schema)));
		expect(rebuilt.toSchema()).toEqual(schema);
		expect(rebuilt.validate()).toEqual(workspace.validate());
	});

	it("generates a complete, internally consistent doc site", async () => {
		await assertDocSite(workspace);
	});
});
