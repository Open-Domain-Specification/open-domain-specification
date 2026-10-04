import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assemble } from "./assemble";
import { createWorkspaceFile, readFreshSet } from "./create";
import { type EditorHost, editorFirstIo, type OpenDocument } from "./editor-io";
import { diskTextIo } from "./writer";

/**
 * Safe creation on real temp folders. The .ods folder is `<tmp>/outer/.ods`,
 * so a name that escapes it would land in `outer` where the tests look.
 */

const made: string[] = [];
afterEach(async () => {
	for (const dir of made.splice(0))
		await fs.rm(dir, { recursive: true, force: true });
});

async function folder() {
	const outer = await fs.mkdtemp(path.join(tmpdir(), "ods-create-"));
	made.push(outer);
	const root = path.join(outer, ".ods");
	await fs.mkdir(root);
	return { outer, root };
}

async function listJson(root: string, dir = ""): Promise<string[]> {
	const out: string[] = [];
	for (const e of await fs.readdir(path.join(root, dir), {
		withFileTypes: true,
	})) {
		const rel = dir ? `${dir}/${e.name}` : e.name;
		if (e.isDirectory()) out.push(...(await listJson(root, rel)));
		else if (e.name.endsWith(".json")) out.push(rel);
	}
	return out.sort();
}

const create = async (root: string, name: string, hooks = {}) =>
	createWorkspaceFile(
		root,
		diskTextIo(root),
		await listJson(root),
		name,
		"A test workspace",
		hooks,
	);

const everything = async (dir: string): Promise<string[]> =>
	(await fs.readdir(dir, { recursive: true })).sort();

describe("safe workspace creation", () => {
	it("leaves an existing valid file byte for byte and names it", async () => {
		const { root } = await folder();
		const bytes = '{"name":"Orders","description":"mine","version":"9"}\n';
		await fs.writeFile(path.join(root, "orders.json"), bytes);
		const result = await create(root, "Orders");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toContain("orders.json");
		expect(await fs.readFile(path.join(root, "orders.json"), "utf8")).toBe(
			bytes,
		);
		expect(await everything(root)).toEqual(["orders.json"]);
	});

	it("leaves an unloadable file byte for byte", async () => {
		const { root } = await folder();
		const bytes = "{ this is not json,,";
		await fs.writeFile(path.join(root, "orders.json"), bytes);
		const result = await create(root, "Orders");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toContain("orders.json");
		expect(await fs.readFile(path.join(root, "orders.json"), "utf8")).toBe(
			bytes,
		);
	});

	it("refuses a workspace id a nested member already declares", async () => {
		const { root } = await folder();
		await fs.mkdir(path.join(root, "teams"));
		const bytes = '{"name":"Orders","description":"","version":"1"}\n';
		await fs.writeFile(path.join(root, "teams", "x.json"), bytes);
		const result = await create(root, "Orders");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.cause).toBe("duplicate-id");
			expect(result.message).toContain("teams/x.json");
		}
		expect(await listJson(root)).toEqual(["teams/x.json"]);
	});

	it("refuses names that escape the folder or are reserved, writing nothing", async () => {
		const { outer, root } = await folder();
		for (const name of [
			"../evil",
			"a/b",
			"a\\b",
			"/abs/path",
			"..",
			"schema",
			"Schema",
			"   ",
		]) {
			const result = await create(root, name);
			expect(result.ok, name).toBe(false);
			if (!result.ok) expect(result.cause).toBe("name");
		}
		expect(await everything(outer)).toEqual([".ods"]);
	});

	it("refuses Windows reserved device names, also with an extension, writing nothing", async () => {
		const { outer, root } = await folder();
		for (const name of ["con", "NUL", "Com1", "lpt9", "aux.txt", "Con.v2"]) {
			const result = await create(root, name);
			expect(result.ok, name).toBe(false);
			if (!result.ok) {
				expect(result.cause).toBe("name");
				expect(result.message).toContain("reserved device name");
				expect(result.message).toContain("Nothing was created");
			}
		}
		expect((await create(root, "console")).ok).toBe(true);
		expect(await listJson(root)).toEqual(["console.json"]);
		expect(await everything(outer)).toEqual([".ods", ".ods/console.json"]);
	});

	it("writes a loadable file with a relative $schema and no temp file left", async () => {
		const { root } = await folder();
		const result = await create(root, "Order Management");
		expect(result.ok).toBe(true);
		expect(await everything(root)).toEqual(["order_management.json"]);
		const text = await fs.readFile(
			path.join(root, "order_management.json"),
			"utf8",
		);
		const assembled = assemble([{ file: "order_management.json", text }]);
		expect(assembled.files.get("order_management.json")?.workspace?.id).toBe(
			"order_management",
		);
		expect(JSON.parse(text).$schema).toBe("./schema.json");
	});

	it("never replaces a file that appears after the checks", async () => {
		const { root } = await folder();
		const bytes = "someone else wrote this first";
		const result = await create(root, "Orders", {
			afterChecks: () => fs.writeFile(path.join(root, "orders.json"), bytes),
		});
		expect(result.ok).toBe(false);
		expect(await fs.readFile(path.join(root, "orders.json"), "utf8")).toBe(
			bytes,
		);
		expect(await everything(root)).toEqual(["orders.json"]);
	});
});

describe("fresh read", () => {
	it("takes the open editor's text over the disk, and says which files are members", async () => {
		const { root } = await folder();
		const onDisk = '{"name":"Old","description":"","version":"1"}\n';
		await fs.writeFile(path.join(root, "a.json"), onDisk);
		await fs.writeFile(path.join(root, "b.json"), "not json");
		const unsaved = '{"name":"New","description":"","version":"1"}\n';
		const doc: OpenDocument = {
			version: 3,
			isDirty: true,
			getText: () => unsaved,
			save: async () => true,
		};
		const host: EditorHost = {
			openDocument: (file) => (file === "a.json" ? doc : undefined),
			replaceAll: async () => true,
		};
		const io = editorFirstIo(diskTextIo(root), host);
		const fresh = await readFreshSet(io, ["a.json", "b.json"]);
		expect(fresh.texts.get("a.json")).toBe(unsaved);
		expect(fresh.set.byPath("a.json")?.name).toBe("New");
		expect(fresh.members).toEqual(["a.json"]);
	});
});
