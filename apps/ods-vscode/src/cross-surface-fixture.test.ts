import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { EXPECTED, FIXTURE_FILE } from "./test/fixtures/cross-surface/expected";

/**
 * The fixture the four surfaces are compared on (issue #75). The viewer, the
 * static export, the real VS Code webview and generated Markdown all read the
 * committed `.ods/cross_surface.json`, so it must be what `generate.ts` writes
 * today, and it must carry exactly the diagnostics `expected.ts` says it
 * carries on purpose.
 */
const fixture = join(__dirname, "test/fixtures/cross-surface");
const committed = readFileSync(join(fixture, ".ods", FIXTURE_FILE), "utf8");
const workspace = Workspace.fromSchema(JSON.parse(committed));

describe("the cross-surface fixture", () => {
	it("is what its generator writes", () => {
		const out = mkdtempSync(join(tmpdir(), "ods-cross-surface-"));
		try {
			execFileSync(process.execPath, [join(fixture, "generate.ts"), out], {
				stdio: "pipe",
			});
			expect(
				readFileSync(join(out, FIXTURE_FILE), "utf8"),
				"the committed fixture is stale: run `node apps/ods-vscode/src/test/fixtures/cross-surface/generate.ts` from the repository root and commit its output",
			).toBe(committed);
		} finally {
			rmSync(out, { recursive: true, force: true });
		}
	});

	it("carries exactly the diagnostics it means to", () => {
		expect(
			workspace.validate().map(({ severity, rule, ref }) => ({
				severity,
				rule,
				ref,
			})),
		).toEqual(EXPECTED.diagnostics);
	});

	it("carries its one warning on the consumption that names no agreement", () => {
		const unnamed = EXPECTED.agreements.consumptions.filter(
			(c) => c.agreement === null,
		);
		const warnings = EXPECTED.diagnostics.filter(
			(d) => d.rule === "consumption-agreement",
		);
		expect(unnamed).toHaveLength(1);
		expect(warnings).toHaveLength(1);

		const consumption = workspace
			.getServiceByRefOrThrow(EXPECTED.refs.warehouseApi)
			.consumptions.find((c) => c.ref === warnings[0].ref);
		expect(consumption?.consumable.name).toBe(unnamed[0].consumable);
		expect(consumption?.relationship).toBeUndefined();
	});
});
