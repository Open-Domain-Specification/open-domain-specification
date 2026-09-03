import { assertStressTestWorkspace } from "@open-domain-specification/model-tools";
import { describe, expect, it } from "vitest";
import { workspace } from "./workspace";

/**
 * StreamLine plants exactly three structural problems, chosen so that it,
 * RiverMart and NorthBank together exercise every rule in the validation
 * catalog; see the DELIBERATE comments in workspace.ts and section 7 of
 * DISCOVERY.md.
 */
const deliberate: Array<{ rule: string; severity: "error" | "warning" }> = [
	{ rule: "internal-consumable", severity: "error" },
	{ rule: "schema-context", severity: "error" },
	{ rule: "policy-complete", severity: "warning" },
];

describe("StreamLine reference workspace", () => {
	it("builds with its id and enough contexts to stress the pages", () => {
		expect(workspace.id).toBe("streamline");
		expect(workspace.boundedcontexts.size).toBeGreaterThanOrEqual(12);
		expect(workspace.relationships.length).toBeGreaterThan(12);
	});

	it("passes the shared stress-test assertions", () => {
		assertStressTestWorkspace(workspace, deliberate);
	});
});
