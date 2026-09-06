import { Workspace } from "@open-domain-specification/core";
import { assertDocSite } from "@open-domain-specification/model-tools";
import { describe, expect, it } from "vitest";
import { workspace } from "./workspace.ts";

/**
 * Pins this workspace's diagnostics: the one rule this model met on purpose,
 * and the tally of everything else met and fixed on the way. Card 117 in
 * `boards/project-backlog/` is the full journal; this is the part of it a
 * test can hold still.
 *
 * `domain-service-consumes-inside` is left standing deliberately: the triage
 * nurse's own account is that the assessment logic itself calls out to
 * Records, not an application service fronting the call, and the card
 * (decision 17's reopening condition) asks that the model be honest about who
 * calls rather than invent a front to satisfy the rule. See
 * `models/clinic/DISCOVERY.md` and `models/clinic/src/workspace.ts`.
 *
 * `rejection-raised` is the new warning card 123 adds: `Offer Slot` rejects
 * with `Patient Waitlisted` and also raises it as an event, which is exactly
 * the shape decision 18's 2026-09-10 note (after card 117) flagged as a model
 * telling on itself. Card 122 is the one that resolves it on this model; this
 * fixture pins the diagnostic as it stands until then.
 */
const DELIBERATE: Array<{ rule: string; severity: "error" | "warning" }> = [
	{ rule: "domain-service-consumes-inside", severity: "error" },
	{ rule: "rejection-raised", severity: "warning" },
];

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
