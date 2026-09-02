import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Workspace } from "@open-domain-specification/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dotToSvg } from "./graphviz";
import { exportSite, pagePath, pageRefs, type SiteResult } from "./site";

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
			svg: dotToSvg,
		});
	});
	afterAll(() => rm(outDir, { recursive: true, force: true }));

	it("writes one page per element plus assets and an index", () => {
		expect(result.pages).toBe(pageRefs(workspace).length);
		expect(existsSync(join(outDir, "index.html"))).toBe(true);
		expect(existsSync(join(outDir, "assets/page.css"))).toBe(true);
		expect(existsSync(join(outDir, "assets/site.css"))).toBe(true);
		expect(existsSync(join(outDir, "assets/codicons/codicon.ttf"))).toBe(true);
		expect(existsSync(join(outDir, "petstore/index.html"))).toBe(true);
	});

	it("rewrites ref links to files that exist", () => {
		const html = readFileSync(join(outDir, "petstore/index.html"), "utf8");
		expect(html).not.toMatch(/<a class="ref" href="#"/);
		const hrefs = [...html.matchAll(/<a class="ref" href="([^"#]+)/g)].map(
			(m) => m[1],
		);
		expect(hrefs.length).toBeGreaterThan(0);
		for (const href of hrefs)
			expect(
				existsSync(join(outDir, "petstore", decodeURIComponent(href))),
			).toBe(true);
	});

	it("points leaf refs at their owner page with a fragment", () => {
		const bc = [...workspace.boundedcontexts.values()][0];
		const a = [...bc.aggregates.values()][0];
		const entity = [...a.entities.values()][0];
		expect(pagePath("petstore.json", entity.ref)).toMatch(
			/entities\/[^/]+\.html$/,
		);
		const html = readFileSync(
			join(outDir, ...pagePath("petstore.json", a.ref).split("/")),
			"utf8",
		);
		expect(html).toContain("site-nav");
		expect(html).toContain('class="active"');
	});
});
