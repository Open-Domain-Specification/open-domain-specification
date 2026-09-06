import {
	assertDocSite,
	assertStressTestWorkspace,
} from "@open-domain-specification/model-tools";
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
	// The same violated separate ways, seen from the other side: Channels calls
	// Credit Decisioning and separate ways is the declaration that they do not
	// integrate, so it accounts for nothing and `relationship-declared` still
	// asks how the two contexts stand to each other (card 70).
	{ rule: "relationship-declared", severity: "warning" },
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

	// Rendering every diagram through graphviz-wasm takes tens of seconds on
	// the larger models, so this one test gets a generous timeout.
	it("generates a complete docsify site with no broken links", async () => {
		await assertDocSite(workspace);
	}, 60_000);
});
