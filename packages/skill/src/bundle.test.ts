import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import {
	generateReferences,
	readBundle,
	skillRoot,
} from "../scripts/generate.mts";

const file = (path: string) => readFileSync(join(skillRoot, path), "utf8");

describe("SKILL.md", () => {
	const skill = file("SKILL.md");
	const frontmatter = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(skill);

	it("has a name and a description in its frontmatter", () => {
		expect(frontmatter).not.toBeNull();
		expect(frontmatter![1]).toMatch(/^name: ods-authoring$/m);
		expect(frontmatter![1]).toMatch(/^description: >/m);
	});

	it("stays short enough to load unconditionally", () => {
		expect(frontmatter![2].split("\n").length).toBeLessThan(300);
	});

	it("only points at references and examples that exist", () => {
		const paths = new Set(readBundle().map((f) => f.path));
		for (const [, ref] of skill.matchAll(
			/`((?:references|examples)\/[\w./-]+)`/g,
		))
			expect(paths, ref).toContain(ref);
	});
});

describe("generated references", () => {
	it("are committed up to date with core", () => {
		for (const generated of generateReferences())
			expect(file(generated.path), generated.path).toBe(generated.content);
	});
});

describe("dsl-api.md", () => {
	it("names only methods that exist on the core classes", () => {
		const require = createRequire(import.meta.url);
		const corePkg = dirname(
			require.resolve("@open-domain-specification/core/package.json"),
		);
		const source = readFileSync(join(corePkg, "src/workspace.ts"), "utf8");
		const doc = file("references/dsl-api.md");
		const methods = [...doc.matchAll(/\| `\.?(?:new )?(\w+)\(/g)].map(
			(m) => m[1],
		);
		expect(methods.length).toBeGreaterThan(20);
		for (const method of methods) {
			if (method === "Workspace") continue;
			expect(source, method).toMatch(new RegExp(`\\b${method}\\(`));
		}
	});
});

describe("examples", () => {
	it("minimal.ods.json loads and validates clean", () => {
		const json = JSON.parse(file("examples/minimal.ods.json"));
		const ws = Workspace.fromSchema(json);
		expect(ws.validate()).toEqual([]);
	});

	it("minimal.workspace.ts builds the same model as minimal.ods.json", async () => {
		const { workspace } = await import(
			"../skill/examples/minimal.workspace.ts"
		);
		expect(workspace.validate()).toEqual([]);
		const { $schema: _s, ...json } = JSON.parse(
			file("examples/minimal.ods.json"),
		);
		expect(workspace.toSchema()).toEqual(json);
	});
});
