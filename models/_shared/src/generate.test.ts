import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import { toDoc, toDocSet } from "@open-domain-specification/doc";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	assertDocSite,
	assertDocSiteSet,
	checkDocSiteSet,
	generate,
	generateSetDocs,
	readSetFolder,
} from "./index";

/** Every file under `dir`, as sorted paths relative to it with `/` separators. */
function filesUnder(dir: string): string[] {
	return fs
		.readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) =>
			path
				.relative(dir, path.join(entry.parentPath, entry.name))
				.split(path.sep)
				.join("/"),
		)
		.sort();
}

function smallWorkspace(): Workspace {
	const workspace = new Workspace("Tiny Shop", {
		description: "A shop.",
		version: "0.1.0",
	});
	workspace.addBoundedContext("Orders", { description: "Taking orders." });
	return workspace;
}

describe("generate", () => {
	let root: string;

	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), "ods-generate-"));
		vi.spyOn(console, "log").mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		fs.rmSync(root, { recursive: true, force: true });
	});

	it("leaves on disk exactly the files toDoc returns, and no orphan from an earlier build", async () => {
		const workspace = smallWorkspace();
		const orphan = path.join(
			root,
			"docs/tiny_shop/orders/services/gone/index.md",
		);
		fs.mkdirSync(path.dirname(orphan), { recursive: true });
		fs.writeFileSync(orphan, "# A service the model no longer has\n");
		fs.writeFileSync(path.join(root, "docs/gone.svg"), "<svg/>");
		fs.writeFileSync(path.join(root, "DISCOVERY.md"), "hand-written");

		await generate(workspace, { file: "tiny", root });

		const docs = await toDoc(workspace);
		expect(filesUnder(path.join(root, "docs"))).toEqual(
			Object.keys(docs).sort(),
		);
		expect(fs.existsSync(orphan)).toBe(false);
		for (const [file, content] of Object.entries(docs)) {
			expect(fs.readFileSync(path.join(root, "docs", file), "utf-8")).toBe(
				content,
			);
		}
		expect(fs.existsSync(path.join(root, "docs.next"))).toBe(false);
		expect(fs.readFileSync(path.join(root, "DISCOVERY.md"), "utf-8")).toBe(
			"hand-written",
		);
		expect(filesUnder(path.join(root, ".ods"))).toEqual([
			"schema.json",
			"tiny.json",
		]);
	});

	it("is stable across a second run", async () => {
		const workspace = smallWorkspace();
		await generate(workspace, { file: "tiny", root });
		const first = filesUnder(path.join(root, "docs"));
		await generate(workspace, { file: "tiny", root });
		expect(filesUnder(path.join(root, "docs"))).toEqual(first);
	});

	it("keeps the old docs when generation fails before the swap", async () => {
		const workspace = smallWorkspace();
		await generate(workspace, { file: "tiny", root });
		const before = filesUnder(path.join(root, "docs"));
		vi.spyOn(workspace, "validate").mockImplementation(() => {
			throw new Error("boom");
		});
		await expect(generate(workspace, { file: "tiny", root })).rejects.toThrow(
			"boom",
		);
		expect(filesUnder(path.join(root, "docs"))).toEqual(before);
	});
});

describe("assertDocSite", () => {
	it("checks projected pages, links, and sidebar entries for hostile identities", async () => {
		const workspace = new Workspace("Identity paths", {
			description: "Portable Markdown path coverage.",
			id: "identity_paths",
			version: "0.1.0",
		});
		workspace.addDomain("Slash", { description: "", id: "a/b" });
		workspace.addDomain("Literal escape", {
			description: "",
			id: "a~1b",
		});
		workspace.addDomain("Percent", { description: "", id: "%2F" });
		workspace.addDomain("Empty", { description: "", id: "" });
		workspace.addDomain("Long tilde", {
			description: "",
			id: "~".repeat(70),
		});

		const docs = await assertDocSite(workspace);
		const domainPages = Object.keys(docs).filter(
			(file) => file.startsWith("domains/") && file.endsWith("/index.md"),
		);
		expect(domainPages).toHaveLength(5);

		// Keep one spelling pinned independently of assertDocSite's use of the
		// public projection helpers: slash data is pointer-escaped before the
		// unsafe physical component is encoded as UTF-16 code units.
		expect(docs["domains/_ods_0061007e00310062/index.md"]).toBeTruthy();
	}, 60_000);
});

/** Writes `schemas` as the files of a `.ods` folder under `root`, with a schema.json beside them. */
function writeOds(root: string, schemas: Record<string, unknown>) {
	for (const [file, schema] of Object.entries(schemas)) {
		const target = path.join(root, ".ods", file);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(
			target,
			JSON.stringify({ $schema: "./schema.json", ...(schema as object) }),
		);
	}
	fs.writeFileSync(path.join(root, ".ods", "schema.json"), "{}");
}

function twoWorkspaces() {
	const a = new Workspace("Alpha", { description: "A.", version: "1.0.0" });
	a.addBoundedContext("Orders", { description: "Taking orders." });
	const b = new Workspace("Beta", { description: "B.", version: "1.0.0" });
	b.addBoundedContext("Orders", { description: "Other orders." });
	return { a, b };
}

describe("readSetFolder", () => {
	let root: string;

	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), "ods-read-set-"));
	});

	afterEach(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	it("reads every workspace file at any depth in code point order, and neither schema.json nor $schema", () => {
		const { a, b } = twoWorkspaces();
		const c = new Workspace("Gamma", { description: "C.", version: "1.0.0" });
		writeOds(root, {
			"b.json": b.toSchema(),
			"a/ü.json": a.toSchema(),
			"Z.json": c.toSchema(),
		});
		const set = readSetFolder(path.join(root, ".ods"));
		// "Z" (U+005A) sorts before "a" (U+0061), and "a/" before "b".
		expect(set.workspaces.map((it) => it.file)).toEqual([
			"Z.json",
			"a/ü.json",
			"b.json",
		]);
		expect(set.rejected).toEqual([]);
		expect(set.byPath("a/ü.json")?.name).toBe("Alpha");
	});
});

describe("generateSetDocs", () => {
	let root: string;

	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), "ods-generate-set-"));
	});

	afterEach(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	it("leaves on disk exactly the files toDocSet returns for the folder, and no orphan from an earlier build", async () => {
		const { a, b } = twoWorkspaces();
		writeOds(root, { "a.json": a.toSchema(), "b.json": b.toSchema() });
		const orphan = path.join(root, "docs/boundedcontexts/gone/index.md");
		fs.mkdirSync(path.dirname(orphan), { recursive: true });
		fs.writeFileSync(orphan, "# A context the model no longer has\n");
		fs.writeFileSync(path.join(root, "DISCOVERY.md"), "hand-written");

		const set = await generateSetDocs({ root });

		const docs = await toDocSet(set);
		expect(filesUnder(path.join(root, "docs"))).toEqual(
			Object.keys(docs).sort(),
		);
		expect(fs.existsSync(orphan)).toBe(false);
		for (const [file, content] of Object.entries(docs))
			expect(fs.readFileSync(path.join(root, "docs", file), "utf-8")).toBe(
				content,
			);
		expect(fs.existsSync(path.join(root, "docs.next"))).toBe(false);
		expect(fs.readFileSync(path.join(root, "DISCOVERY.md"), "utf-8")).toBe(
			"hand-written",
		);
		expect(fs.existsSync(path.join(root, "docs/a.json/alpha/index.md"))).toBe(
			true,
		);
		expect(fs.existsSync(path.join(root, "docs/b.json/beta/index.md"))).toBe(
			true,
		);
	});

	it("keeps the old docs when the folder cannot be read", async () => {
		const { a, b } = twoWorkspaces();
		writeOds(root, { "a.json": a.toSchema(), "b.json": b.toSchema() });
		await generateSetDocs({ root });
		const before = filesUnder(path.join(root, "docs"));
		fs.writeFileSync(path.join(root, ".ods", "c.json"), "{ not json");
		await expect(generateSetDocs({ root })).rejects.toThrow();
		expect(filesUnder(path.join(root, "docs"))).toEqual(before);
	});
});

describe("assertDocSiteSet", () => {
	it("checks the pages, links and sidebar of the actual NorthBank set", async () => {
		const set = readSetFolder(path.join(__dirname, "../../northbank/.ods"));
		expect(set.workspaces).toHaveLength(12);
		const docs = await assertDocSiteSet(set);
		expect(Object.keys(docs)).toContain("index.md");
	}, 60_000);

	const small = async () => {
		const { a, b } = twoWorkspaces();
		const set = WorkspaceSet.fromWorkspaces([
			["a.json", a],
			["b.json", b],
		]);
		return { set, docs: await toDocSet(set) };
	};

	it("passes a site generated for two same-id workspaces", async () => {
		const { set, docs } = await small();
		expect(() => checkDocSiteSet(set, docs)).not.toThrow();
		expect(Object.keys(docs)).toContain(
			"a.json/boundedcontexts/orders/index.md",
		);
		expect(Object.keys(docs)).toContain(
			"b.json/boundedcontexts/orders/index.md",
		);
	});

	it("fails on a page the site is missing", async () => {
		const { set, docs } = await small();
		delete docs["b.json/boundedcontexts/orders/index.md"];
		expect(() => checkDocSiteSet(set, docs)).toThrow(/missing/);
	});

	it("fails on a link that resolves to nothing", async () => {
		const { set, docs } = await small();
		docs["index.md"] += "\n[gone](c.json/alpha/index.md)\n";
		expect(() => checkDocSiteSet(set, docs)).toThrow(/broken links/);
	});

	it("fails on a sidebar that leaves out a file", async () => {
		const { set, docs } = await small();
		docs["_sidebar.md"] = docs["_sidebar.md"]
			.split("\n")
			.filter((it) => !it.includes("Beta"))
			.join("\n");
		expect(() => checkDocSiteSet(set, docs)).toThrow(/sidebar/);
	});
});

/**
 * What the actual NorthBank generator path produces, measured in a fresh plain
 * node process. Inside Vitest the linked workspace packages are loaded as a
 * second instance of core, which draws a partial context map (18 nodes and 30
 * edges instead of 19 and 37), so the content claim is made where the normal
 * package entries resolve: `readSetFolder` and `toDocSet`, as `generate.ts`
 * calls them, and `ODSContextMap.fromSet`, as `toDocSet` does for the root map.
 * One process per generation, because repeated generation in one process
 * advances SVG tooltip counters.
 */
type NorthbankRun = {
	files: string[];
	/** Generated files whose bytes differ from the committed docs/ folder. */
	differing: string[];
	/** Committed docs/ files the generator did not produce. */
	missing: string[];
	nodes: string[];
	edges: { source: string; target: string; type: string; implied: string }[];
	svgNodes: number;
	svgEdges: number;
	/** Markdown links from a page of one file's folder into another file's folder. */
	crossFileLinks: { from: string; to: string }[];
};

const CHILD = `
import fs from "node:fs";
import path from "node:path";
const [shared, odsDir, docsDir] = process.argv.slice(1);
const { ODSContextMap } = await import("@open-domain-specification/core");
const { toDocSet } = await import("@open-domain-specification/doc");
const { readSetFolder } = await import(shared);
const walk = (d, base = d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
	e.isDirectory() ? walk(path.join(d, e.name), base) : [path.relative(base, path.join(d, e.name)).split(path.sep).join("/")]);
const set = readSetFolder(odsDir);
const docs = await toDocSet(set);
const disk = walk(docsDir).sort();
const files = Object.keys(docs).sort();
const differing = files.filter((f) => disk.includes(f) && docs[f] !== fs.readFileSync(path.join(docsDir, f), "utf-8"));
const map = ODSContextMap.fromSet(set);
const svg = docs["contextmap.svg"];
const crossFileLinks = [];
for (const [f, c] of Object.entries(docs)) {
	if (!f.endsWith(".md")) continue;
	for (const m of c.matchAll(/\\]\\(([^)\\s]+)\\)/g)) {
		if (/^[a-z]+:/i.test(m[1]) || m[1].startsWith("#")) continue;
		const target = path.posix.normalize(path.posix.join(path.posix.dirname(f), decodeURI(m[1].split("#")[0])));
		const a = f.split("/")[0], b = target.split("/")[0];
		if (a.endsWith(".json") && b.endsWith(".json") && a !== b) crossFileLinks.push({ from: f, to: target });
	}
}
console.log(JSON.stringify({
	files, differing, missing: disk.filter((f) => !(f in docs)),
	nodes: [...map.nodes.keys()].sort(),
	edges: [...map.edges.values()].map((e) => ({ source: e.source.id, target: e.target.id, type: e.type, implied: String(e.implied) })),
	svgNodes: (svg.match(/class="node"/g) ?? []).length,
	svgEdges: (svg.match(/class="edge"/g) ?? []).length,
	crossFileLinks,
}));
`;

const NORTHBANK = path.join(__dirname, "../../northbank");
const SYMMETRIC = new Set(["shared-kernel", "partnership", "separate-ways"]);

function runNorthbankInFreshProcess(): NorthbankRun {
	const out = execFileSync(
		process.execPath,
		[
			"--input-type=module",
			"-e",
			CHILD,
			pathToFileURL(path.join(__dirname, "index.ts")).href,
			path.join(NORTHBANK, ".ods"),
			path.join(NORTHBANK, "docs"),
		],
		{
			cwd: path.join(__dirname, ".."),
			encoding: "utf-8",
			maxBuffer: 256 * 1024 * 1024,
			stdio: ["ignore", "pipe", "ignore"],
		},
	);
	return JSON.parse(out) as NorthbankRun;
}

/**
 * What the committed workspace files say the root map must hold, read from the
 * JSON directly and not from any core class: a node for every bounded context
 * of every file, owned by the file that declares it, and an edge for every
 * declared relationship, its `$ref`s resolved against the declaring file.
 */
function northbankExpectation() {
	const odsDir = path.join(NORTHBANK, ".ods");
	const nodes: string[] = [];
	const declared: { source: string; target: string; type: string }[] = [];
	const resolve = (file: string, ref: string) =>
		ref.startsWith("#") ? `${file}${ref}` : ref;
	const workspaceFiles = fs
		.readdirSync(odsDir)
		.filter((it) => it.endsWith(".json") && it !== "schema.json")
		.sort();
	for (const file of workspaceFiles) {
		const json = JSON.parse(fs.readFileSync(path.join(odsDir, file), "utf-8"));
		for (const id of Object.keys(json.boundedcontexts ?? {}))
			nodes.push(`${file}#/boundedcontexts/${id}`);
		for (const rel of json.relationships ?? []) {
			const ends: { $ref: string }[] = rel.participants ?? [
				rel.upstream,
				rel.downstream,
			];
			declared.push({
				source: resolve(file, ends[0].$ref),
				target: resolve(file, ends[1].$ref),
				type: rel.type,
			});
		}
	}
	return { workspaceFiles, nodes: nodes.sort(), declared };
}

/**
 * Thrown (as an AssertionError) when the run's maps or files lose content
 * against the committed model. Counts are pinned as well as identities.
 */
function checkNorthbankAgreement(
	run: NorthbankRun,
	expected: ReturnType<typeof northbankExpectation>,
) {
	// Every context, and only those, owned by the file that declares it.
	assert.deepStrictEqual(run.nodes, expected.nodes, "context map nodes");

	// Every declared relationship is an edge of its declared type, with a
	// directed type keeping its upstream as the source.
	const sameEdge = (
		e: { source: string; target: string; type: string },
		d: { source: string; target: string; type: string },
	) =>
		e.type === d.type &&
		((e.source === d.source && e.target === d.target) ||
			(SYMMETRIC.has(d.type) &&
				e.source === d.target &&
				e.target === d.source));
	for (const d of expected.declared)
		assert.ok(
			run.edges.some((e) => e.implied === "false" && sameEdge(e, d)),
			`declared ${d.type} edge ${d.source} -> ${d.target} is missing`,
		);
	// Nothing is drawn that no declaration and no identity crossing explains.
	const undeclared = run.edges.filter(
		(e) => !expected.declared.some((d) => sameEdge(e, d)),
	);
	assert.deepStrictEqual(
		undeclared
			.map((e) => `${e.implied}: ${e.source} -> ${e.target} ${e.type}`)
			.sort(),
		[
			"identity: accounts.json#/boundedcontexts/accounts -> lending.json#/boundedcontexts/lending upstream-downstream",
			"identity: customer_platform.json#/boundedcontexts/customer_&_kyc -> digital_platform.json#/boundedcontexts/identity_&_access upstream-downstream",
			"identity: customer_platform.json#/boundedcontexts/customer_&_kyc -> financial_crime.json#/boundedcontexts/fraud upstream-downstream",
		],
		"edges no relationship declares",
	);
	assert.equal(run.edges.length, 37, "context map edges");
	assert.equal(run.nodes.length, 19, "context map nodes");

	// The drawn root map is the map: one SVG node and edge for each.
	assert.equal(run.svgNodes, run.nodes.length, "contextmap.svg nodes");
	assert.equal(run.svgEdges, run.edges.length, "contextmap.svg edges");

	// The site holds a folder for each file and agrees with the committed one.
	assert.equal(run.files.length, 214, "generated files");
	assert.deepStrictEqual(run.missing, [], "committed files not generated");
	assert.deepStrictEqual(run.differing, [], "files differing from docs/");
	for (const file of expected.workspaceFiles)
		assert.ok(
			run.files.some((f) => f.startsWith(`${file}/`)),
			`no pages for ${file}`,
		);
	assert.equal(run.crossFileLinks.length, 420, "cross-file links");
}

describe("the actual NorthBank generator path", () => {
	let run: NorthbankRun;
	const expected = northbankExpectation();

	beforeAll(() => {
		run = runNorthbankInFreshProcess();
	}, 180_000);

	it("draws every context, declared relationship and identity crossing, and writes the committed docs", () => {
		expect(expected.nodes).toHaveLength(19);
		expect(expected.declared).toHaveLength(34);
		checkNorthbankAgreement(run, expected);
	});

	it("fails when a context is missing from the map", () => {
		const lost = run.nodes[0];
		expect(() =>
			checkNorthbankAgreement(
				{ ...run, nodes: run.nodes.slice(1), svgNodes: run.svgNodes - 1 },
				expected,
			),
		).toThrow(/context map nodes/);
		expect(lost).toBeTruthy();
	});

	it("fails when a declared edge is missing from the map", () => {
		const dropped = run.edges.find((e) => e.implied === "false");
		expect(dropped).toBeTruthy();
		expect(() =>
			checkNorthbankAgreement(
				{ ...run, edges: run.edges.filter((e) => e !== dropped) },
				expected,
			),
		).toThrow(/is missing/);
	});

	it("fails when an implied edge or the drawn svg loses content", () => {
		const implied = run.edges.find((e) => e.implied !== "false");
		expect(() =>
			checkNorthbankAgreement(
				{ ...run, edges: run.edges.filter((e) => e !== implied) },
				expected,
			),
		).toThrow(/no relationship declares/);
		expect(() =>
			checkNorthbankAgreement({ ...run, svgEdges: run.svgEdges - 7 }, expected),
		).toThrow(/contextmap\.svg edges/);
	});

	it("fails when a node is owned by the wrong file", () => {
		const nodes = [...run.nodes];
		nodes[0] = nodes[0].replace(/^[^#]+/, "other.json");
		expect(() => checkNorthbankAgreement({ ...run, nodes }, expected)).toThrow(
			/context map nodes/,
		);
	});

	it("fails when generated files drift from the committed docs or go missing", () => {
		expect(() =>
			checkNorthbankAgreement(
				{ ...run, differing: ["contextmap.svg"] },
				expected,
			),
		).toThrow(/differing/);
		expect(() =>
			checkNorthbankAgreement(
				{ ...run, files: run.files.slice(1), missing: ["index.md"] },
				expected,
			),
		).toThrow();
	});
});
