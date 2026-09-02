import { assertStressTestWorkspace } from "@open-domain-specification/model-tools";
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

	it("passes the shared stress-test assertions", () => {
		assertStressTestWorkspace(workspace, deliberate);
	});
});
