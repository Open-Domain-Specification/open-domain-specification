import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Workspace } from "@open-domain-specification/core";
import { toDoc } from "@open-domain-specification/doc";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertDocSite, generate } from "./index";

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
