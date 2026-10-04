import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkspaceSet } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { assemble } from "./assemble";

/**
 * The folder the real-host reader test opens: three team files with names that
 * need encoding, the same local ids in each, and a ring of file-qualified
 * consumptions. It must be what `generate.ts` writes today, and read as the
 * set it means to be.
 */
const fixture = join(__dirname, "test/fixtures/multi");
const FILES = ["a#%.json", "my team.json", "ü/é.json"];
const read = (root: string, file: string) =>
	readFileSync(join(root, ...file.split("/")), "utf8");

describe("the multi-file fixture", () => {
	it("is what its generator writes", () => {
		const out = mkdtempSync(join(tmpdir(), "ods-multi-"));
		try {
			execFileSync(process.execPath, [join(fixture, "generate.ts"), out], {
				stdio: "pipe",
			});
			for (const file of FILES)
				expect(
					read(out, file),
					"the committed fixture is stale: run `node apps/ods-vscode/src/test/fixtures/multi/generate.ts` from the repository root and commit its output",
				).toBe(read(join(fixture, ".ods"), file));
			expect(readdirSync(out).sort()).toEqual(
				readdirSync(join(fixture, ".ods"))
					.filter((n) => n !== "schema.json")
					.sort(),
			);
		} finally {
			rmSync(out, { recursive: true, force: true });
		}
	});

	it("loads as one set of three files with nothing left out, and carries the same six findings in each file", () => {
		const assembled = assemble(
			FILES.map((file) => ({ file, text: read(join(fixture, ".ods"), file) })),
		);
		expect([...assembled.files.values()].every((f) => !f.excluded)).toBe(true);
		expect(assembled.set.workspaces.map((w) => w.file)).toEqual(FILES);
		// Every file holds a consumer of the next file's Post and no more than a bare
		// aggregate, so each carries the same findings, attributed to its own file:
		// what the per-file Problems rows are held to in the real host.
		for (const file of FILES)
			expect(
				(assembled.diagnostics.get(file) ?? []).map((d) => d.rule).sort(),
			).toEqual([
				"aggregate-consumes-inside",
				"consumption-by-required",
				"relationship-declared",
				"role-coherence",
				"role-coherence",
				"root-identity",
			]);
		expect(assembled.set.validate()).toHaveLength(18);
	});

	it("has the same local ids in every file and a consumption through each into the next", () => {
		const assembled = assemble(
			FILES.map((file) => ({ file, text: read(join(fixture, ".ods"), file) })),
		);
		const { set } = assembled;
		const ledgers = set.workspaces.map((w) => w.boundedcontexts.get("ledger"));
		expect(ledgers.every((l) => l?.ref === "#/boundedcontexts/ledger")).toBe(
			true,
		);
		expect(new Set(ledgers).size).toBe(3);
		const into = set.workspaces.map((w) => {
			const account = w.boundedcontexts
				.get("ledger")
				?.aggregates.get("account");
			return account?.consumptions[0].consumable.provider.boundedcontext
				.workspace.file;
		});
		expect(into).toEqual(["my team.json", "ü/é.json", "a#%.json"]);
		expect(set).toBeInstanceOf(WorkspaceSet);
	});
});
