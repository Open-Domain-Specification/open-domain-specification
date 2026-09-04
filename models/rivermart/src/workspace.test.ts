import {
	assertDocSite,
	assertStressTestWorkspace,
} from "@open-domain-specification/model-tools";
import { describe, expect, it } from "vitest";
import { workspace } from "./workspace";

/**
 * RiverMart plants structural problems on purpose; see the DELIBERATE
 * comments in workspace.ts and section 7 of DISCOVERY.md. The role-coherence
 * one was retired on card 47: it sat on a consumption between Warehouse and
 * Last Mile, and those two share a kernel, so neither end has a role to
 * declare and the rule is right to stay quiet. Rule coverage itself is the
 * completeness fixture's job in packages/core/src/rule-catalog.test.ts.
 */
const deliberate: Array<{ rule: string; severity: "error" | "warning" }> = [
	{ rule: "aggregate-root", severity: "error" },
	{ rule: "cross-aggregate-reference", severity: "error" },
];

describe("RiverMart reference workspace", () => {
	it("builds with its id and enough contexts to stress the pages", () => {
		expect(workspace.id).toBe("rivermart");
		expect(workspace.boundedcontexts.size).toBeGreaterThanOrEqual(12);
		expect(workspace.relationships.length).toBeGreaterThan(12);
	});

	it("passes the shared stress-test assertions", () => {
		assertStressTestWorkspace(workspace, deliberate);
	});

	// Rendering every diagram through graphviz-wasm takes tens of seconds on
	// the larger models, so this one test gets a generous timeout.
	it("generates a complete docsify site with no broken links", async () => {
		await assertDocSite(workspace);
	}, 60_000);
});
