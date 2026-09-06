import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { PATTERNS, Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import {
	generateReferences,
	readBundle,
	skillRoot,
} from "../scripts/generate.mts";

const file = (path: string) => readFileSync(join(skillRoot, path), "utf8");

const require_ = createRequire(import.meta.url);
const corePkgRoot = dirname(
	require_.resolve("@open-domain-specification/core/package.json"),
);

/** The values an enum in core's generated JSON Schema allows. */
function schemaEnum(definition: string): string[] {
	const schema = require_(join(corePkgRoot, "dist/workspace.schema.json")) as {
		definitions: Record<string, { enum?: string[] }>;
	};
	const values = schema.definitions[definition]?.enum;
	if (!values) throw new Error(`no enum ${definition} in the workspace schema`);
	return values;
}

/** The fenced blocks of one language in a markdown file, in order. */
function fencedBlocks(markdown: string, language: string): string[] {
	return [
		...markdown.matchAll(
			new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\`\`\``, "g"),
		),
	].map((m) => m[1]);
}

/**
 * The ```json blocks of a markdown file, parsed. A block that shows fields in
 * place rather than a whole document is a fragment (`"provides": { ... }`), so
 * wrap it to parse as the object it would sit in.
 */
function jsonBlocks(markdown: string): Array<Record<string, unknown>> {
	return fencedBlocks(markdown, "json").map((block) =>
		JSON.parse(block.trimStart().startsWith("{") ? block : `{${block}}`),
	);
}

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
	const doc = file("references/dsl-api.md");

	it("names only methods that exist on the core classes", () => {
		const source = readFileSync(join(corePkgRoot, "src/workspace.ts"), "utf8");
		const methods = [...doc.matchAll(/\| `\.?(?:new )?(\w+)\(/g)].map(
			(m) => m[1],
		);
		expect(methods.length).toBeGreaterThan(20);
		for (const method of methods) {
			if (method === "Workspace") continue;
			expect(source, method).toMatch(new RegExp(`\\b${method}\\(`));
		}
	});

	it("offers the evidence pair on a relationship, a consumable and a consumption", () => {
		const rows = doc.split("\n").filter((line) => line.startsWith("| `"));
		const evidenced = (method: string) =>
			rows.find(
				(row) =>
					row.includes(`\`${method}(`) &&
					row.includes("comments?") &&
					row.includes("disposition?"),
			);
		for (const method of ["upstreamOf", "partnerOf", "provides", "consumes"])
			expect(evidenced(method), method).toBeDefined();
	});
});

describe("strategic-relationships.md", () => {
	const reference = file("references/strategic-relationships.md");

	it("explains every pattern core knows, in core's own words", () => {
		for (const [key, pattern] of Object.entries(PATTERNS)) {
			expect(reference, key).toContain(
				`### \`${key}\` — ${pattern.name} (${pattern.abbreviation})`,
			);
			expect(reference, key).toContain(pattern.summary);
			expect(reference, key).toContain(pattern.architecturalNature);
			for (const tradeOff of pattern.tradeOffs)
				expect(reference, key).toContain(`- ${tradeOff}`);
		}
	});

	it("names nothing core does not", () => {
		const documented = [...reference.matchAll(/^### `([\w-]+)`/gm)].map(
			(m) => m[1],
		);
		expect(documented.sort()).toEqual(Object.keys(PATTERNS).sort());
	});
});

describe("reconciliation.md", () => {
	const reference = file("references/reconciliation.md");

	it("gives a search recipe for every pattern core knows", () => {
		for (const key of Object.keys(PATTERNS))
			expect(reference, key).toMatch(new RegExp(`^\\| \`${key}\` \\|`, "m"));
	});

	it("names every disposition and link kind the schema allows", () => {
		for (const value of [
			...schemaEnum("Disposition"),
			...schemaEnum("CommentLinkKind"),
		])
			expect(reference, value).toContain(`\`${value}\``);
	});

	it("shows the evidence pair on a relationship, a consumable and a consumption", () => {
		const carriers = jsonBlocks(reference).flatMap((block) => [
			...(block.relationships ?? []),
			...Object.values(block.provides ?? {}),
			...(block.consumes ?? []),
		]) as Array<{ comments?: unknown[]; disposition?: string }>;
		expect(carriers).toHaveLength(3);
		for (const carrier of carriers)
			expect(carrier.comments?.length ?? 0).toBeGreaterThan(0);
		expect(
			carriers.filter((c) => c.disposition !== undefined),
		).not.toHaveLength(0);
	});

	it("writes comments the schema accepts, and never the default disposition", () => {
		const kinds = schemaEnum("CommentLinkKind");
		const dispositions = schemaEnum("Disposition");
		let seen = 0;
		const walk = (node: unknown): void => {
			if (Array.isArray(node)) return void node.forEach(walk);
			if (!node || typeof node !== "object") return;
			const record = node as Record<string, unknown>;
			if (record.disposition !== undefined) {
				expect(dispositions).toContain(record.disposition);
				expect(record.disposition).not.toBe("by-design");
			}
			for (const comment of (record.comments ?? []) as Array<
				Record<string, unknown>
			>) {
				seen++;
				expect(Object.keys(comment).sort()).toEqual(["link", "text"]);
				expect(typeof comment.text).toBe("string");
				const link = comment.link as Record<string, unknown>;
				expect(kinds).toContain(link.kind);
				expect(typeof link.url).toBe("string");
			}
			Object.values(record).forEach(walk);
		};
		jsonBlocks(reference).forEach(walk);
		expect(seen).toBeGreaterThan(0);
	});
});

describe("interview-playbook.md", () => {
	const playbook = file("references/interview-playbook.md");

	it("asks the two evidence questions once per intent, never per role", () => {
		expect(playbook).toContain("## The two evidence questions");
		expect(playbook).toContain("Once per intent, never per role");
		for (const value of schemaEnum("Disposition"))
			expect(playbook, value).toContain(`\`${value}\``);
	});
});

describe("petstore.md", () => {
	const example = file("examples/petstore.md");

	it("works the Catalog–Inventory shared kernel through to a refactor", () => {
		const section = example.slice(
			example.indexOf("## Worked reconciliation"),
			example.indexOf("## A policy reacting"),
		);
		expect(section).not.toBe("");
		expect(section).toContain("sharesKernelWith");
		expect(section).toContain('disposition: "refactor"');
		expect(fencedBlocks(section, "ts")).toHaveLength(1);
	});
});

describe("the bundle", () => {
	it("ships no reference nothing else points at", () => {
		const bundle = readBundle();
		for (const entry of bundle) {
			if (!entry.path.startsWith("references/")) continue;
			const basename = entry.path.split("/").pop() as string;
			const pointsAtIt = bundle.some(
				(other) =>
					other.path !== entry.path && other.content.includes(basename),
			);
			expect(pointsAtIt, entry.path).toBe(true);
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
