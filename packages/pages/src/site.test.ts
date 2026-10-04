import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { linkAllCarriers, linkedPair, side } from "./lib/set-fixture";
import type { Bootstrap } from "./protocol";
import { exportSite, type SiteResult } from "./site";

const schema = JSON.parse(
	readFileSync(
		join(__dirname, "../../../models/petstore/.ods/petstore.json"),
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
			appDir: join(__dirname, "../app"),
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
		expect(existsSync(join(outDir, "favicon.svg"))).toBe(true);
		const html = readFileSync(join(outDir, "index.html"), "utf8");
		expect(html).toContain("window.__ODS__=");
		expect(html).toContain(`"fileLabel":"petstore.json"`);
		expect(html).toContain(workspace.name);
		expect(html).toMatch(/<script defer src="\.\/assets\//);
		expect(html).not.toContain("crossorigin");
		const script = html.match(
			/<script defer src="\.\/(assets\/[^"]+)"/,
		)?.[1] as string;
		const js = readFileSync(join(outDir, script), "utf8");
		// A strict-mode IIFE: nothing leaks onto window when it runs as a classic script.
		expect(js.startsWith('(()=>{"use strict";')).toBe(true);
		expect(js.trimEnd().endsWith("})();")).toBe(true);
		expect(js).not.toMatch(/\bimport\.meta\b/);
	});
});

describe("static site export of a set", () => {
	const dirs: string[] = [];
	afterAll(() =>
		Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true }))),
	);
	const exported = async (
		sources: Parameters<typeof exportSite>[0]["sources"],
	) => {
		const outDir = await mkdtemp(join(tmpdir(), "ods-site-set-"));
		dirs.push(outDir);
		const result = await exportSite({
			appDir: join(__dirname, "../app"),
			sources,
			outDir,
		});
		const html = readFileSync(join(outDir, "index.html"), "utf8");
		const boot = JSON.parse(
			(html.match(/window\.__ODS__=(.*?);<\/script>/s)?.[1] as string).replace(
				/\\u003c/g,
				"<",
			),
		) as Bootstrap;
		return { outDir, result, boot };
	};
	const pair = linkedPair();
	const sourcesOf = (set = pair.set, extra: object = {}) =>
		set.workspaces.map((w) => ({
			workspace: w,
			fileLabel: w.file as string,
			path: w.file as string,
			set: "folder",
			diagnostics: [],
			...extra,
		}));

	it("exports every file as a file of one set, at its own path, with the qualified refs it has", async () => {
		const { boot, result } = await exported(sourcesOf());
		expect(result.workspaces).toBe(2);
		expect(boot.workspaces?.map((w) => [w.path, w.fileLabel, w.set])).toEqual([
			["a.json", "a.json", "folder"],
			["b.json", "b.json", "folder"],
		]);
		// The qualified links survive: a's file still names b's.
		expect(JSON.stringify(boot.workspaces?.[0].schema)).toContain(
			'"$ref":"b.json#/',
		);
		expect(JSON.stringify(boot.workspaces?.[1].schema)).toContain(
			'"$ref":"a.json#/',
		);
	});

	it("writes each file again as plain JSON under workspaces/, nested paths kept, so the folder can be read by URL too", async () => {
		const a = side("Team A");
		const b = side("Team B");
		const set = WorkspaceSet.fromWorkspaces([
			["a#%.json", a.ws],
			["ü/my team.json", b.ws],
		]);
		linkAllCarriers(a, b);
		const { outDir, result } = await exported(sourcesOf(set));
		expect(result.files.map((f) => f.slice(outDir.length + 1))).toEqual([
			join("workspaces", "a#%.json"),
			join("workspaces", "ü", "my team.json"),
		]);
		const written = JSON.parse(
			readFileSync(join(outDir, "workspaces", "a#%.json"), "utf8"),
		);
		expect(written).toEqual(
			JSON.parse(JSON.stringify(set.byPath("a#%.json")?.toSchema())),
		);
		expect(JSON.stringify(written)).toContain(
			'"$ref":"%C3%BC/my%20team.json#/',
		);
	});

	it("lists the files of a set by code point of their paths, whatever order the host gave them in", async () => {
		const { boot } = await exported([...sourcesOf()].reverse());
		expect(boot.workspaces?.map((w) => w.path)).toEqual(["a.json", "b.json"]);
	});

	it("leaves a workspace opened alone where it was among the files of a set", async () => {
		const [a, b] = sourcesOf();
		const alone = { workspace, fileLabel: "alone.json", diagnostics: [] };
		const { boot } = await exported([b, alone, a]);
		expect(boot.workspaces?.map((w) => w.fileLabel)).toEqual([
			"a.json",
			"alone.json",
			"b.json",
		]);
	});

	it("labels a file that is the last good load of one that does not load", async () => {
		const sources = sourcesOf(pair.set, {});
		(sources[0] as { stale?: string }).stale =
			"Its current text does not load.";
		const { boot } = await exported(sources);
		expect(boot.workspaces?.[0].stale).toBe("Its current text does not load.");
		expect("stale" in (boot.workspaces?.[1] as object)).toBe(false);
	});

	it("takes the label as the path when a source gives none", async () => {
		const sources = sourcesOf().map(({ path: _, ...s }) => s);
		const { boot } = await exported(sources);
		expect(boot.workspaces?.map((w) => w.path)).toEqual(["a.json", "b.json"]);
	});

	it("refuses a file that cannot be a path of the set, writing nothing", async () => {
		const outDir = await mkdtemp(join(tmpdir(), "ods-site-bad-"));
		dirs.push(outDir);
		await expect(
			exportSite({
				appDir: join(__dirname, "../app"),
				sources: [{ ...sourcesOf()[0], path: "../escape.json" }],
				outDir,
			}),
		).rejects.toThrow(
			/"..\/escape.json" cannot be a file of an exported set: escapes-root/,
		);
		expect(existsSync(join(outDir, "index.html"))).toBe(false);
	});

	it("leaves exactly the current copies under workspaces/ on a re-export, and touches nothing else in outDir", async () => {
		const a = side("Team A");
		const b = side("Team B");
		const first = WorkspaceSet.fromWorkspaces([
			["old/gone.json", a.ws],
			["keep.json", b.ws],
		]);
		linkAllCarriers(a, b);
		const { outDir } = await exported(sourcesOf(first));
		await writeFile(join(outDir, "user-notes.txt"), "mine", "utf8");
		await mkdir(join(outDir, "assets-extra"));
		await writeFile(join(outDir, "assets-extra", "x.txt"), "mine", "utf8");
		expect(existsSync(join(outDir, "workspaces", "old", "gone.json"))).toBe(
			true,
		);

		const c = side("Team A");
		const d = side("Team B");
		const second = WorkspaceSet.fromWorkspaces([
			["renamed/new.json", c.ws],
			["keep.json", d.ws],
		]);
		linkAllCarriers(c, d);
		const result = await exportSite({
			appDir: join(__dirname, "../app"),
			sources: sourcesOf(second),
			outDir,
		});
		expect(existsSync(join(outDir, "workspaces", "old"))).toBe(false);
		expect(existsSync(join(outDir, "workspaces", "renamed", "new.json"))).toBe(
			true,
		);
		expect(existsSync(join(outDir, "workspaces", "keep.json"))).toBe(true);
		expect(result.files.map((f) => f.slice(outDir.length + 1))).toEqual([
			join("workspaces", "keep.json"),
			join("workspaces", "renamed", "new.json"),
		]);
		expect(readFileSync(join(outDir, "user-notes.txt"), "utf8")).toBe("mine");
		expect(readFileSync(join(outDir, "assets-extra", "x.txt"), "utf8")).toBe(
			"mine",
		);
		expect(readFileSync(join(outDir, "index.html"), "utf8")).toContain(
			"renamed/new.json",
		);
	});

	it("refuses two sources whose copies would land on one file, before any write or removal", async () => {
		const { outDir } = await exported(sourcesOf());
		const before = readFileSync(join(outDir, "workspaces", "a.json"), "utf8");
		const html = readFileSync(join(outDir, "index.html"), "utf8");
		const [a, b] = sourcesOf();
		await expect(
			exportSite({
				appDir: join(__dirname, "../app"),
				sources: [
					{ ...a, set: "one", path: "same.json", fileLabel: "one/same.json" },
					{ ...b, set: "two", path: "same.json", fileLabel: "two/same.json" },
				],
				outDir,
			}),
		).rejects.toThrow(/one\/same\.json.*two\/same\.json.*same\.json/s);
		expect(readFileSync(join(outDir, "workspaces", "a.json"), "utf8")).toBe(
			before,
		);
		expect(existsSync(join(outDir, "workspaces", "b.json"))).toBe(true);
		expect(existsSync(join(outDir, "workspaces", "same.json"))).toBe(false);
		expect(readFileSync(join(outDir, "index.html"), "utf8")).toBe(html);
	});

	it("leaves a workspace opened alone as it was: no set, no path, no copy of its JSON", async () => {
		const { boot, result, outDir } = await exported([
			{ workspace, fileLabel: "petstore.json", diagnostics: [] },
		]);
		expect(boot.workspaces?.[0]).not.toHaveProperty("set");
		expect(boot.workspaces?.[0]).not.toHaveProperty("path");
		expect(result.files).toEqual([]);
		expect(existsSync(join(outDir, "workspaces"))).toBe(false);
	});
});
