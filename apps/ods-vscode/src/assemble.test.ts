import { WorkspaceSet } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { assemble, shapeProblem } from "./assemble";
import { teamTexts } from "./writer.support";

const texts = teamTexts();
const sources = (override: Record<string, string> = {}) =>
	Object.entries({ ...texts, ...override }).map(([file, text]) => ({
		file,
		text,
	}));

describe("assemble", () => {
	it("builds one set of all the files in the order given and groups diagnostics by file", () => {
		const reversed = sources().reverse();
		const a = assemble(reversed);
		expect([...a.files.keys()]).toEqual(["c.json", "b.json", "a.json"]);
		expect(a.set.workspaces.map((w) => w.file)).toEqual([
			"c.json",
			"b.json",
			"a.json",
		]);
		for (const [file, entry] of a.files) {
			expect(entry.workspace).toBe(a.set.byPath(file));
			expect(entry.excluded).toBeUndefined();
		}
		expect(a.validationError).toBeUndefined();
	});

	it("attributes findings to the file that owns the element, not to the file that was read first", () => {
		const doc = JSON.parse(texts["b.json"]);
		doc.boundedcontexts.claims.aggregates.account.consumes.push({
			consumable: {
				$ref: "a.json#/boundedcontexts/ledger/services/payments/provides/gone",
			},
		});
		const a = assemble(sources({ "b.json": JSON.stringify(doc) }));
		const found = a.diagnostics.get("b.json") ?? [];
		expect(found.some((d) => d.rule === "unresolved-ref")).toBe(true);
		expect(found.every((d) => d.file === "b.json")).toBe(true);
		expect(a.diagnostics.get("a.json") ?? []).toEqual(
			(a.diagnostics.get("a.json") ?? []).filter((d) => d.file === "a.json"),
		);
	});

	it("leaves an unparsable file out with its own actionable error and the offset, and still builds the rest", () => {
		const a = assemble(sources({ "c.json": '{ "name": ' }));
		const bad = a.files.get("c.json");
		expect(bad?.excluded?.cause).toBe("syntax");
		expect(bad?.excluded?.message).toContain("c.json is not valid JSON");
		expect(bad?.excluded?.message).toContain("Fix the syntax");
		expect(typeof bad?.excluded?.offset).toBe("number");
		expect(bad?.workspace).toBeUndefined();
		expect(a.set.byPath("a.json")).toBeDefined();
		expect(a.set.byPath("c.json")).toBeUndefined();
	});

	it("finds the offset of a syntax error that the engine reports without a position", () => {
		const a = assemble(sources({ "c.json": '{"a": 1,}' }));
		expect(typeof a.files.get("c.json")?.excluded?.offset).toBe("number");
		const empty = assemble(sources({ "c.json": "" }));
		expect(empty.files.get("c.json")?.excluded?.cause).toBe("syntax");
	});

	it("leaves out a file that is JSON but not a workspace", () => {
		for (const text of ["[]", "3", "null", '{"name": 3}']) {
			const a = assemble(sources({ "c.json": text }));
			expect(a.files.get("c.json")?.excluded?.cause).toBe("shape");
			expect(a.files.get("c.json")?.excluded?.message).toContain(
				"not a workspace file",
			);
		}
	});

	it("leaves out a file whose depth core cannot load, instead of letting it throw out of the set", () => {
		const deep = JSON.parse(texts["c.json"]);
		deep.boundedcontexts.depot.aggregates = "no";
		const a = assemble(sources({ "c.json": JSON.stringify(deep) }));
		expect(a.files.get("c.json")?.excluded?.cause).toBe("load");
		expect(a.files.get("c.json")?.excluded?.message).toContain(
			"could not be loaded",
		);
		expect(a.set.byPath("a.json")).toBeDefined();
	});

	it("reports a path the set cannot take as file-path-invalid on that file", () => {
		const a = assemble([
			...sources(),
			{ file: "x\\y.json", text: texts["c.json"] },
		]);
		expect(a.files.get("x\\y.json")?.excluded?.cause).toBe("path");
		expect(a.diagnostics.get("x\\y.json")?.map((d) => d.rule)).toContain(
			"file-path-invalid",
		);
		expect(a.set.byPath("a.json")).toBeDefined();
	});

	it("reports two files with one workspace id", () => {
		const a = assemble(sources({ "d.json": texts["c.json"] }));
		const rules = [...a.diagnostics.values()].flat().map((d) => d.rule);
		expect(rules).toContain("workspace-id-unique");
	});

	it("falls back to an empty set, saying why on every member, when the set cannot be built together", () => {
		const a = assemble(sources(), () => {
			throw new Error("boom");
		});
		for (const entry of a.files.values()) {
			expect(entry.excluded?.cause).toBe("load");
			expect(entry.excluded?.message).toContain("boom");
		}
		expect(a.set.workspaces).toHaveLength(0);
	});

	it("falls back when something that is not an Error is thrown", () => {
		const a = assemble(sources(), () => {
			throw "plain";
		});
		expect(a.files.get("a.json")?.excluded?.message).toContain("plain");
	});

	it("shows a rule that throws instead of swallowing it", () => {
		const a = assemble(sources(), (entries) => {
			const set = WorkspaceSet.fromSchemas(entries);
			return Object.assign(Object.create(set), {
				validate() {
					throw new Error("rule defect");
				},
			});
		});
		expect(a.validationError).toBe("rule defect");
		expect(a.diagnostics.size).toBe(0);
		const b = assemble(sources(), (entries) => {
			const set = WorkspaceSet.fromSchemas(entries);
			return Object.assign(Object.create(set), {
				validate() {
					throw 7;
				},
			});
		});
		expect(b.validationError).toBe("7");
	});

	it("never mutates the text it was given or shares state between calls", () => {
		const first = assemble(sources());
		const second = assemble(sources({ "c.json": "[]" }));
		expect(first.files.get("c.json")?.excluded).toBeUndefined();
		expect(second.files.get("c.json")?.excluded?.cause).toBe("shape");
	});
});

describe("shapeProblem", () => {
	const ok = { name: "x" };
	it.each([
		[ok, undefined],
		[{ ...ok, id: "x", description: "d", version: "1" }, undefined],
		[3, "not a JSON object"],
		[[], "not a JSON object"],
		[{}, '"name"'],
		[{ ...ok, id: 3 }, '"id" must be a string'],
		[{ ...ok, description: 3 }, '"description" must be a string'],
		[{ ...ok, version: 3 }, '"version" must be a string'],
		[{ ...ok, domains: [] }, '"domains" must be an object'],
		[
			{ ...ok, boundedcontexts: { x: 3 } },
			'"boundedcontexts.x" must be an object',
		],
		[{ ...ok, teams: { t: null } }, '"teams.t" must be an object'],
		[{ ...ok, relationships: {} }, '"relationships" must be an array'],
		[{ ...ok, relationships: [3] }, '"relationships[0]" must be an object'],
	])("%j", (value, problem) => {
		const found = shapeProblem(value);
		if (problem === undefined) expect(found).toBeUndefined();
		else expect(found).toContain(problem);
	});
});
