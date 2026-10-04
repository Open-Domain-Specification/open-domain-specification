import { describe, expect, it } from "vitest";
import { assemble } from "./assemble";
import {
	exportSources,
	isInFolder,
	locationOfRoute,
	type ReaderFile,
	readerPayloads,
	routeOfLocation,
} from "./reader";
import { teamTexts } from "./writer.support";

const texts = teamTexts();
const assembled = assemble(
	Object.entries(texts).map(([file, text]) => ({ file, text })),
);
const filesOf = (override: Partial<ReaderFile> = {}): ReaderFile[] =>
	[...assembled.files.values()].map((f) => ({
		relativePath: f.file,
		workspace: f.workspace,
		diagnostics: assembled.diagnostics.get(f.file) ?? [],
		...override,
	}));

describe("what the app is handed", () => {
	it("is every file of the folder, as a payload of one set at its own path", () => {
		const payloads = readerPayloads("folder-key", filesOf());
		expect(payloads.map((p) => [p.path, p.fileLabel, p.set])).toEqual([
			["a.json", "a.json", "folder-key"],
			["b.json", "b.json", "folder-key"],
			["c.json", "c.json", "folder-key"],
		]);
		expect(payloads.every((p) => p.stale === undefined)).toBe(true);
	});

	it("keeps the qualified link between files, as the set writes it", () => {
		const [, b] = readerPayloads("k", filesOf());
		expect(JSON.stringify(b.schema)).toContain(
			'"$ref":"a.json#/boundedcontexts/ledger"',
		);
	});

	it("carries each file's own findings, the ones the folder's set found about it", () => {
		const doc = JSON.parse(texts["b.json"]);
		doc.boundedcontexts.claims.aggregates.account.consumes = [
			{
				consumable: {
					$ref: "a.json#/boundedcontexts/ledger/services/payments/provides/gone",
				},
			},
		];
		const broken = assemble(
			Object.entries({ ...texts, "b.json": JSON.stringify(doc) }).map(
				([file, text]) => ({ file, text }),
			),
		);
		const payloads = readerPayloads(
			"k",
			[...broken.files.values()].map((f) => ({
				relativePath: f.file,
				workspace: f.workspace,
				diagnostics: broken.diagnostics.get(f.file) ?? [],
			})),
		);
		const [a, b] = payloads;
		expect(b.diagnostics?.some((d) => d.rule === "unresolved-ref")).toBe(true);
		expect(
			a.diagnostics?.some((d) => d.rule === "unresolved-ref") ?? false,
		).toBe(false);
	});

	it("leaves out a file with no workspace to show", () => {
		const files = filesOf();
		files[1] = { ...files[1], workspace: undefined, error: "x" };
		expect(readerPayloads("k", files).map((p) => p.path)).toEqual([
			"a.json",
			"c.json",
		]);
	});

	it("labels the last good load of a file that does not load now, with why and what to do", () => {
		const files = filesOf();
		files[0] = {
			...files[0],
			stale: true,
			error: "c.json is not valid JSON (at 3)",
		};
		files[2] = { ...files[2], stale: true };
		const payloads = readerPayloads("k", files);
		expect(payloads[0].stale).toBe(
			"Its current text does not load: c.json is not valid JSON (at 3) Fix the file to see its current state.",
		);
		expect(payloads[1].stale).toBeUndefined();
		expect(payloads[2].stale).toBe(
			"Its current text does not load. Fix the file to see its current state.",
		);
	});
});

describe("routes between the extension and the app", () => {
	const members = ["a.json", "nested/b#%.json", "ü.json"];

	it("are the local ref for one file, and name the file for more than one", () => {
		expect(routeOfLocation(["a.json"], "a.json", "#/boundedcontexts/x")).toBe(
			"#/boundedcontexts/x",
		);
		expect(
			routeOfLocation(members, "nested/b#%.json", "#/boundedcontexts/x"),
		).toBe("#/workspaces/nested~1b%23%25.json/boundedcontexts/x");
		expect(routeOfLocation(members, "ü.json", "#")).toBe(
			"#/workspaces/%C3%BC.json",
		);
	});

	it("are read back to the file and the local ref, for every file name", () => {
		for (const file of members)
			for (const ref of [
				"#",
				"#/boundedcontexts/ledger",
				"#/boundedcontexts/a~1b/aggregates/c",
			])
				expect(
					locationOfRoute(members, routeOfLocation(members, file, ref)),
				).toEqual({
					file,
					ref,
				});
	});

	it("read every route as the one file's when the app holds one", () => {
		expect(locationOfRoute(["a.json"], "#/boundedcontexts/x")).toEqual({
			file: "a.json",
			ref: "#/boundedcontexts/x",
		});
	});

	it("name no file for the set's own page, an unknown file or a file not among those handed over", () => {
		expect(locationOfRoute(members, "#")).toBeUndefined();
		expect(locationOfRoute(members, "#/health")).toBeUndefined();
		expect(
			locationOfRoute(members, "#/workspaces/gone.json/boundedcontexts/x"),
		).toBeUndefined();
		expect(locationOfRoute(members, "#/boundedcontexts/x")).toBeUndefined();
	});
});

describe("what the export is handed", () => {
	it("is each file of a folder as a file of one set, at its own path, with the order the project listed", () => {
		const sources = exportSources("folder", filesOf());
		expect(sources.map((s) => [s.path, s.fileLabel, s.set])).toEqual([
			["a.json", "a.json", "folder"],
			["b.json", "b.json", "folder"],
			["c.json", "c.json", "folder"],
		]);
		expect(sources.map((s) => s.workspace)).toEqual(
			filesOf().map((f) => f.workspace),
		);
		expect(sources.every((s) => !("stale" in s))).toBe(true);
	});

	it("labels a stale file as the same words the app is told, and drops a file with nothing to show", () => {
		const files = filesOf();
		files[0] = { ...files[0], stale: true, error: "bad token" };
		files[1] = { ...files[1], stale: true };
		files[2] = { ...files[2], workspace: undefined };
		const sources = exportSources("k", files);
		expect(sources.map((s) => s.path)).toEqual(["a.json", "b.json"]);
		expect(sources[0].stale).toBe("Its current text does not load: bad token");
		expect(sources[1].stale).toBe("Its current text does not load.");
	});
});

describe("which files a selected folder holds", () => {
	it("holds itself, nested files and nothing that only shares its prefix", () => {
		expect(isInFolder("/p/app", "/p/app")).toBe(true);
		expect(isInFolder("/p/app", "/p/app/.ods/a.json")).toBe(true);
		expect(isInFolder("/p/app/", "/p/app/a/b/c.json")).toBe(true);
		expect(isInFolder("/p/app", "/p/app2/.ods/a.json")).toBe(false);
		expect(isInFolder("/p/app", "/p/a.json")).toBe(false);
		expect(isInFolder("/p/app", "/p")).toBe(false);
	});
});
