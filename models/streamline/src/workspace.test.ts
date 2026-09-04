import {
	assertDocSite,
	assertStressTestWorkspace,
} from "@open-domain-specification/model-tools";
import { describe, expect, it } from "vitest";
import { workspace } from "./workspace";

/**
 * StreamLine plants four structural problems, chosen so that it, RiverMart and
 * NorthBank together exercise every rule in the validation catalog; see the
 * DELIBERATE comments in workspace.ts and section 7 of DISCOVERY.md. The
 * partnership-backed one arrived with card 53: Playback and Devices share a
 * release train but not a two-way dependency, and the model keeps the claim
 * rather than demoting it, so the warning is the honest state.
 */
const deliberate: Array<{ rule: string; severity: "error" | "warning" }> = [
	{ rule: "internal-consumable", severity: "error" },
	{ rule: "schema-context", severity: "error" },
	{ rule: "policy-complete", severity: "warning" },
	{ rule: "partnership-backed", severity: "warning" },
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

	// Rendering every diagram through graphviz-wasm takes tens of seconds on
	// the larger models, so this one test gets a generous timeout.
	it("generates a complete docsify site with no broken links", async () => {
		await assertDocSite(workspace);
	}, 60_000);
});
