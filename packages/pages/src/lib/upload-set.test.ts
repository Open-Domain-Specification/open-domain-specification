import { describe, expect, it } from "vitest";
import { readUpload, uploadPath } from "./upload-set";

/** A picked file as a browser hands it: a name, and for a folder pick the path under the folder chosen. */
function picked(name: string, body: string, relative?: string): File {
	const file = new File([body], name, { type: "application/json" });
	if (relative !== undefined)
		Object.defineProperty(file, "webkitRelativePath", { value: relative });
	return file;
}

describe("the path of a picked file", () => {
	it("is the name of a file picked on its own", () => {
		expect(uploadPath(picked("a.json", "{}"))).toBe("a.json");
	});

	it("takes the chosen folder's own name off a folder pick", () => {
		expect(uploadPath(picked("a.json", "{}", ".ods/sub/a.json"))).toBe(
			"sub/a.json",
		);
		expect(uploadPath(picked("a.json", "{}", "a.json"))).toBe("a.json");
	});

	it.each(["my team.json", "a#%.json", "ü/é.json", "a%41.json", "😀/x.json"])(
		"keeps %s exactly as it is, raw and unencoded",
		(path) => {
			const name = path.split("/").at(-1) as string;
			expect(uploadPath(picked(name, "{}", `folder/${path}`))).toBe(path);
		},
	);
});

describe("reading what was picked", () => {
	it("keeps each workspace file at its raw path, in code-point order, as one set", async () => {
		const upload = await readUpload([
			picked("z.json", '{"name":"z"}', "f/z.json"),
			picked("é.json", '{"name":"e"}', "f/ü/é.json"),
			picked("my team.json", '{"name":"m"}', "f/my team.json"),
			picked("a#%.json", '{"name":"h"}', "f/a#%.json"),
		]);
		expect(upload.payloads.map((p) => [p.path, p.fileLabel, p.set])).toEqual([
			["a#%.json", "a#%.json", "upload"],
			["my team.json", "my team.json", "upload"],
			["z.json", "z.json", "upload"],
			["ü/é.json", "ü/é.json", "upload"],
		]);
		expect(upload.payloads.map((p) => p.schema)).toEqual([
			{ name: "h" },
			{ name: "m" },
			{ name: "z" },
			{ name: "e" },
		]);
		expect(upload.skipped).toEqual([]);
		expect(upload.problems).toEqual([]);
	});

	it("leaves out what is not a workspace file, and says so", async () => {
		const upload = await readUpload([
			picked("a.json", "{}", ".ods/a.json"),
			picked("schema.json", "{}", ".ods/schema.json"),
			picked("schema.json", "{}", ".ods/n/schema.json"),
			picked("notes.md", "x", ".ods/notes.md"),
			picked("UPPER.JSON", "{}", ".ods/UPPER.JSON"),
		]);
		expect(upload.payloads.map((p) => p.path)).toEqual(["a.json"]);
		expect(upload.skipped).toEqual([
			"UPPER.JSON",
			"n/schema.json",
			"notes.md",
			"schema.json",
		]);
	});

	it("keeps a file named schema.json that is not the folder's own schema out, but one named like it inside a name in", async () => {
		const upload = await readUpload([
			picked("my-schema.json", "{}", "f/my-schema.json"),
		]);
		expect(upload.payloads.map((p) => p.path)).toEqual(["my-schema.json"]);
	});

	it("says which workspace file is not JSON and what to do, and keeps the rest", async () => {
		const upload = await readUpload([
			picked("a.json", "{}", "f/a.json"),
			picked("bad.json", "not json", "f/bad.json"),
		]);
		expect(upload.payloads.map((p) => p.path)).toEqual(["a.json"]);
		expect(upload.problems).toEqual([
			"bad.json is not valid JSON, so it was left out. Fix the file, or leave it out of the folder, then choose it again.",
		]);
	});
});

describe("two picked files with one path", () => {
	it("keeps both in the result, in the order picked, for the set to refuse the second", async () => {
		const upload = await readUpload([
			picked("a.json", '{"name":"first"}', "one/a.json"),
			picked("a.json", '{"name":"second"}', "two/a.json"),
		]);
		expect(upload.payloads.map((p) => p.path)).toEqual(["a.json", "a.json"]);
		expect(
			upload.payloads.map((p) => (p.schema as { name: string }).name),
		).toEqual(["first", "second"]);
	});
});
