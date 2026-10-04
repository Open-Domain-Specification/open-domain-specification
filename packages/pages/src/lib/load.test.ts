import { describe, expect, it, vi } from "vitest";
import type { WorkspacePayload } from "../protocol";
import { loadPayloads, loadSet, shapeProblem } from "./load";
import { cxPayloads } from "./set-fixture";

const ws = (name: string, extra: object = {}) => ({ name, ...extra });
const member = (
	path: string,
	schema: unknown,
	extra: Partial<WorkspacePayload> = {},
): WorkspacePayload => ({ schema, fileLabel: path, path, set: "s", ...extra });

describe("what core would throw on is found first", () => {
	it.each([
		[null, "the file is not a JSON object"],
		[[], "the file is not a JSON object"],
		[5, "the file is not a JSON object"],
		[{}, 'the workspace needs a string "name"'],
		[{ name: 3 }, 'the workspace needs a string "name"'],
		[{ name: "w", id: 3 }, '"id" must be a string'],
		[{ name: "w", description: [] }, '"description" must be a string'],
		[{ name: "w", version: 1 }, '"version" must be a string'],
		[{ name: "w", domains: [] }, '"domains" must be an object keyed by id'],
		[{ name: "w", teams: { t: 1 } }, '"teams.t" must be an object'],
		[
			{ name: "w", boundedcontexts: { x: [] } },
			'"boundedcontexts.x" must be an object',
		],
		[{ name: "w", relationships: {} }, '"relationships" must be an array'],
		[
			{ name: "w", relationships: [{}, 1] },
			'"relationships[1]" must be an object',
		],
	])("%j: %s", (value, problem) => {
		expect(shapeProblem(value)).toBe(problem);
	});

	it("finds nothing wrong with a workspace of the right shape", () => {
		expect(
			shapeProblem({
				name: "w",
				id: "w",
				description: "d",
				version: "1",
				domains: { a: {} },
				boundedcontexts: {},
				teams: {},
				relationships: [{}],
			}),
		).toBeUndefined();
		expect(shapeProblem({ name: "w" })).toBeUndefined();
	});
});

describe("workspaces handed in by a host", () => {
	it("opens a payload with no set as a workspace alone, judged as before", () => {
		const [entry] = loadPayloads([
			{ schema: ws("Solo"), fileLabel: "solo.json" },
		]);
		expect(entry.kind).toBe("workspace");
		if (entry.kind !== "workspace") return;
		expect(entry.model.workspace.set).toBeUndefined();
		expect(entry.model.fileLabel).toBe("solo.json");
		expect(entry.model.diagnostics).toEqual(entry.model.workspace.validate());
		expect(entry.model.loaded).toBeUndefined();
	});

	it("takes the diagnostics and the stale label a host supplies", () => {
		const diagnostics = [
			{ severity: "error" as const, rule: "r", message: "m", ref: "#" },
		];
		const [entry] = loadPayloads([
			{ schema: ws("Solo"), fileLabel: "s.json", diagnostics, stale: "old" },
		]);
		expect(entry.kind === "workspace" && entry.model.diagnostics).toBe(
			diagnostics,
		);
		expect(entry.kind === "workspace" && entry.model.stale).toBe("old");
	});

	it("groups the payloads that share a set into one entry, where the first of them was", () => {
		const entries = loadPayloads([
			{ schema: ws("Solo"), fileLabel: "solo.json" },
			member("a.json", ws("A")),
			{ schema: ws("Other"), fileLabel: "other.json" },
			member("b.json", ws("B")),
			member("c.json", ws("C"), { set: "second" }),
		]);
		expect(entries.map((e) => e.kind)).toEqual([
			"workspace",
			"set",
			"workspace",
			"set",
		]);
		const [, first, , second] = entries;
		expect(
			first.kind === "set" && first.loaded.files.map((f) => f.path),
		).toEqual(["a.json", "b.json"]);
		expect(
			second.kind === "set" && second.loaded.files.map((f) => f.path),
		).toEqual(["c.json"]);
	});

	it("keeps the files in the order the host gave them, never sorted", () => {
		const [entry] = loadPayloads([
			member("z.json", ws("Z")),
			member("a.json", ws("A")),
		]);
		expect(
			entry.kind === "set" && entry.loaded.set.workspaces.map((w) => w.file),
		).toEqual(["z.json", "a.json"]);
	});

	it("passes the notices a host has on to the set", () => {
		const [entry] = loadPayloads([member("a.json", ws("A"))], ["n"]);
		expect(entry.kind === "set" && entry.loaded.notices).toEqual(["n"]);
	});
});

describe("a set of files", () => {
	it("splits the findings of the whole set by the file each is about, and counts each once", () => {
		const loaded = loadSet(cxPayloads());
		const all = loaded.set.validate();
		expect(loaded.files.map((f) => f.diagnostics.length)).toEqual(
			["a.json", "b.json"].map((p) => all.filter((d) => d.file === p).length),
		);
		expect(loaded.files.reduce((n, f) => n + f.diagnostics.length, 0)).toBe(
			all.length,
		);
	});

	it("takes each file's findings from the host when it supplies them, and judges nothing itself", () => {
		const a = [
			{ severity: "warning" as const, rule: "x", message: "hosted", ref: "#" },
		];
		const loaded = loadSet([
			member("a.json", ws("A"), { diagnostics: a }),
			member("b.json", ws("B"), { diagnostics: [] }),
		]);
		expect(loaded.files[0].diagnostics).toBe(a);
		expect(loaded.files[1].diagnostics).toEqual([]);
	});

	it("gives each file a model of its own that knows the set and shows its label", () => {
		const loaded = loadSet(cxPayloads());
		const [a, b] = loaded.files;
		expect(a.model.workspace).toBe(a.workspace);
		expect(a.model.workspace).not.toBe(b.model.workspace);
		expect(a.model.loaded).toBe(loaded);
		expect(a.model.fileLabel).toBe("a.json");
		expect(loaded.modelOf(b.workspace)).toBe(b.model);
		expect(loaded.modelOf(a.workspace)).toBe(a.model);
	});

	it("labels the last good load of a file that does not load now", () => {
		const loaded = loadSet([
			member("a.json", ws("A"), { stale: "Its current text does not load." }),
			member("b.json", ws("B")),
		]);
		expect(loaded.files[0].stale).toBe("Its current text does not load.");
		expect(loaded.files[0].model.stale).toBe("Its current text does not load.");
		expect(loaded.files[1].stale).toBeUndefined();
		expect("stale" in loaded.files[1].model).toBe(false);
	});

	it("uses the label as the path when the host gave no path", () => {
		const loaded = loadSet([
			{ schema: ws("A"), fileLabel: "a.json", set: "s" },
		]);
		expect(loaded.files[0].path).toBe("a.json");
	});

	it("leaves a file that is not a workspace out, with its own message, and keeps the others", () => {
		const loaded = loadSet([
			member("a.json", ws("A")),
			member("bad.json", [1, 2]),
			member("noname.json", {}),
		]);
		expect(loaded.files.map((f) => f.path)).toEqual(["a.json"]);
		expect(loaded.excluded.map((e) => e.path)).toEqual([
			"bad.json",
			"noname.json",
		]);
		expect(loaded.excluded[0].message).toBe(
			"bad.json is not a workspace file: the file is not a JSON object. Fix it, or leave the file out of the folder.",
		);
	});

	it("leaves a file core cannot load out, with the error and what to do", () => {
		const loaded = loadSet([
			member("a.json", ws("A")),
			member(
				"deep.json",
				ws("Deep", { boundedcontexts: { x: { aggregates: { y: 5 } } } }),
			),
		]);
		expect(loaded.files.map((f) => f.path)).toEqual(["a.json"]);
		expect(loaded.excluded).toHaveLength(1);
		expect(loaded.excluded[0].message).toMatch(
			/^deep\.json could not be loaded as a workspace \(.+\)\. Check the element it names against the schema\./,
		);
	});

	it("leaves a path the set cannot hold out, and a path given twice, each with its own message", () => {
		const loaded = loadSet([
			member("a.json", ws("A")),
			member("../up.json", ws("Up")),
			member("a.json", ws("Again")),
			member("n/schema.json", ws("Reserved")),
			member("x.txt", ws("Txt")),
		]);
		expect(loaded.files.map((f) => f.workspace.name)).toEqual(["A"]);
		expect(loaded.excluded.map((e) => e.path)).toEqual([
			"../up.json",
			"a.json",
			"n/schema.json",
			"x.txt",
		]);
		const duplicate = loaded.excluded.find((e) => e.path === "a.json");
		expect(duplicate?.message).toContain(
			"cannot be a workspace file of this set",
		);
		expect(duplicate?.message).toContain("offered twice");
		expect(duplicate?.message).toContain("Rename or move it.");
	});

	it("names a file with no path by its label when the set cannot hold it", () => {
		const loaded = loadSet([{ schema: ws("A"), fileLabel: "x.txt", set: "s" }]);
		expect(loaded.excluded.map((e) => [e.path, e.fileLabel])).toEqual([
			["x.txt", "x.txt"],
		]);
	});

	it("names a path that is not a set path with the path the host gave it", () => {
		const loaded = loadSet([
			{ schema: ws("A"), fileLabel: "label", path: "bad.txt", set: "s" },
		]);
		expect(loaded.files).toEqual([]);
		expect(loaded.excluded).toEqual([
			{
				path: "bad.txt",
				fileLabel: "label",
				message: expect.stringContaining(
					"bad.txt cannot be a workspace file of this set",
				),
			},
		]);
	});

	it("reports a ref that names a file left out as unresolved at the file that wrote it", () => {
		const payloads = cxPayloads().filter((p) => p.path === "a.json");
		const loaded = loadSet(payloads);
		const unresolved = loaded.files[0].diagnostics.filter(
			(d) => d.rule === "unresolved-ref",
		);
		expect(unresolved.length).toBeGreaterThan(0);
		expect(unresolved.every((d) => d.message.includes("b.json"))).toBe(true);
	});

	it("holds an empty set when every file was left out", () => {
		const loaded = loadSet([member("bad.json", 5)]);
		expect(loaded.files).toEqual([]);
		expect(loaded.set.workspaces).toEqual([]);
		expect(loaded.excluded).toHaveLength(1);
	});
});

describe("an error that is not an Error", () => {
	it("is still shown as the reason a file could not be loaded", async () => {
		const { WorkspaceSet } = await import("@open-domain-specification/core");
		const real = WorkspaceSet.fromSchemas.bind(WorkspaceSet);
		const spy = vi
			.spyOn(WorkspaceSet, "fromSchemas")
			.mockImplementationOnce(() => {
				throw "boom";
			});
		const loaded = loadSet([member("a.json", ws("A"))]);
		spy.mockRestore();
		expect(real).toBeTypeOf("function");
		expect(loaded.excluded[0].message).toContain("(boom)");
	});
});
