import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Workspace } from "@open-domain-specification/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { exportSite, type SiteResult } from "./site";

const schema = JSON.parse(
	readFileSync(
		join(__dirname, "../../ods-example-ws/.ods/petstore.json"),
		"utf8",
	),
);
const workspace = Workspace.fromSchema(schema);

describe("static site export", () => {
	let outDir: string;
	let result: SiteResult;
	beforeAll(async () => {
		outDir = await mkdtemp(join(tmpdir(), "ods-site-"));
		result = await exportSite({
			sources: [
				{
					workspace,
					fileLabel: "petstore.json",
					diagnostics: workspace.validate(),
				},
			],
			outDir,
		});
	});
	afterAll(() => rm(outDir, { recursive: true, force: true }));

	it("writes the bundle, its assets and an index with the workspace inlined", () => {
		expect(result.workspaces).toBe(1);
		expect(existsSync(join(outDir, "assets"))).toBe(true);
		const html = readFileSync(join(outDir, "index.html"), "utf8");
		expect(html).toContain("window.__ODS__=");
		expect(html).toContain(`"fileLabel":"petstore.json"`);
		expect(html).toContain(workspace.name);
		expect(html).toMatch(/<script type="module"[^>]*src="\.\/assets\//);
	});
});
