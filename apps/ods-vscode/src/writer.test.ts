import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assemble } from "./assemble";
import {
	applyIntent,
	diskTextIo,
	type Intent,
	intentProblem,
	jsonEqual,
	type TextIo,
	type WriteResult,
} from "./writer";
import { teamSet, teamTexts } from "./writer.support";

/**
 * The write port against real temp folders and real text. Nothing here mocks
 * the set, the files or the resolver: each test writes the files a host would
 * hold, applies an intent, and reads the files back. G1 to G14 are the 14
 * named requirements of the closure contract (section 2.5, group G); each is
 * a `describe` whose title starts with its number.
 */

const dirs: string[] = [];
afterEach(async () => {
	for (const dir of dirs.splice(0))
		await fs.rm(dir, { recursive: true, force: true });
});

type Project = {
	dir: string;
	io: TextIo;
	files: string[];
	read(file: string): Promise<string>;
	write(file: string, text: string): Promise<void>;
	listing(): Promise<string[]>;
};

async function project(
	edit: (texts: Record<string, string>) => void = () => {},
): Promise<Project> {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "ods-writer-"));
	dirs.push(dir);
	const texts = teamTexts();
	edit(texts);
	for (const [file, text] of Object.entries(texts))
		await fs.writeFile(path.join(dir, file), text, "utf8");
	return {
		dir,
		io: diskTextIo(dir),
		files: Object.keys(texts),
		read: (file) => fs.readFile(path.join(dir, file), "utf8"),
		write: (file, text) => fs.writeFile(path.join(dir, file), text, "utf8"),
		listing: async () => (await fs.readdir(dir)).sort(),
	};
}

const json = async (p: Project, file: string) => JSON.parse(await p.read(file));

/** Wraps an io so a test can act at the exact read-to-recheck boundary and count writes. */
function watched(io: TextIo, beforeCheck?: (call: number) => Promise<void>) {
	const log = { reads: [] as string[], checks: 0 };
	const wrapped: TextIo = {
		readText: (file) => {
			log.reads.push(file);
			return io.readText(file);
		},
		writeIfUnchanged: async (file, text, hash) => {
			log.checks++;
			await beforeCheck?.(log.checks);
			return io.writeIfUnchanged(file, text, hash);
		},
	};
	return { io: wrapped, log };
}

const T = teamSet();
const LEDGER = { ref: T.ledger.ref, kind: "context" } as const;
const POST = T.fromB(T.post);
const POST_REF = { ref: POST, kind: "consumable" } as const;

const describeLedger = (
	expected: string | undefined,
	value: string,
): Intent => ({
	op: "update",
	file: "a.json",
	target: LEDGER,
	field: "description",
	expected,
	value,
});

/** B's account consumes A's `post`: the cross-file add with a typed provider. */
const consumePost: Intent = {
	op: "add",
	file: "b.json",
	parent: { ref: T.account.ref, kind: "element" },
	collection: "consumes",
	element: { consumable: { $ref: POST } },
	providers: [POST_REF],
};

const refused = (r: WriteResult, cause: string) => {
	expect(r.ok).toBe(false);
	if (!r.ok) {
		expect(r.cause).toBe(cause);
		expect(r.action.length).toBeGreaterThan(10);
	}
	return r;
};

describe("G1 owner-only write", () => {
	it("changes the owning file and leaves every other file byte-identical", async () => {
		const p = await project();
		const before = { b: await p.read("b.json"), c: await p.read("c.json") };
		const r = await applyIntent(
			p.io,
			p.files,
			describeLedger("ledger", "ledger v2"),
		);
		expect(r).toEqual({ ok: true, file: "a.json", wrote: "disk" });
		expect((await json(p, "a.json")).boundedcontexts.ledger.description).toBe(
			"ledger v2",
		);
		expect(await p.read("b.json")).toBe(before.b);
		expect(await p.read("c.json")).toBe(before.c);
		expect(await p.listing()).toEqual(["a.json", "b.json", "c.json"]);
	});

	it("keeps the $schema key the file already had, and writes two-space JSON with a final newline", async () => {
		const p = await project();
		await applyIntent(p.io, p.files, describeLedger("ledger", "x"));
		const text = await p.read("a.json");
		expect(text.startsWith('{\n  "$schema": "./schema.json",\n')).toBe(true);
		expect(text.endsWith("}\n")).toBe(true);
	});
});

describe("G2 an unrelated file edited on disk stays byte-identical", () => {
	it("keeps another file's out-of-band edit, formatting and all, across a write elsewhere", async () => {
		const p = await project();
		const edited =
			`${JSON.stringify(await json(p, "c.json"), null, 4)}\n`.replace(
				'"Depot"',
				'"Depot",\n    "x-hand-written": true',
			);
		await p.write("c.json", edited);
		const r = await applyIntent(p.io, p.files, describeLedger("ledger", "y"));
		expect(r.ok).toBe(true);
		expect(await p.read("c.json")).toBe(edited);
	});
});

describe("G3 an unrelated edit in the same file is preserved", () => {
	it("applies by ref to fresh text, so an edit made after the form opened survives", async () => {
		const p = await project();
		const doc = await json(p, "a.json");
		doc.boundedcontexts.risk.description = "edited by someone else";
		await p.write("a.json", `${JSON.stringify(doc, null, 2)}\n`);
		const r = await applyIntent(p.io, p.files, describeLedger("ledger", "z"));
		expect(r.ok).toBe(true);
		const after = await json(p, "a.json");
		expect(after.boundedcontexts.ledger.description).toBe("z");
		expect(after.boundedcontexts.risk.description).toBe(
			"edited by someone else",
		);
	});
});

describe("G4 stale target", () => {
	it("refuses an update whose element is gone and leaves the file untouched", async () => {
		const p = await project();
		const doc = await json(p, "a.json");
		delete doc.boundedcontexts.ledger;
		const gone = `${JSON.stringify(doc, null, 2)}\n`;
		await p.write("a.json", gone);
		refused(
			await applyIntent(p.io, p.files, describeLedger("ledger", "q")),
			"stale-target",
		);
		expect(await p.read("a.json")).toBe(gone);
	});

	it("refuses a target that is now a different kind", async () => {
		const p = await project();
		const r = await applyIntent(p.io, p.files, {
			...describeLedger("ledger", "q"),
			target: { ref: T.post.ref, kind: "context" },
		});
		expect(refused(r, "stale-target")).toMatchObject({
			detail: expect.stringContaining("not a bounded context"),
		});
	});
});

describe("G5 stale value", () => {
	it("refuses when the fresh value differs from the one the form saw", async () => {
		const p = await project();
		const before = await p.read("a.json");
		const r = refused(
			await applyIntent(p.io, p.files, describeLedger("an older value", "q")),
			"stale-value",
		);
		expect(r).toMatchObject({ detail: expect.stringContaining('"ledger"') });
		expect(await p.read("a.json")).toBe(before);
	});

	it("is an idempotent no-op when the fresh value already equals the new one, whatever was expected", async () => {
		const p = await project();
		const before = await p.read("a.json");
		const w = watched(p.io);
		const r = await applyIntent(
			w.io,
			p.files,
			describeLedger("stale", "ledger"),
		);
		expect(r).toEqual({ ok: true, file: "a.json", wrote: "noop" });
		expect(w.log.checks).toBe(0);
		expect(await p.read("a.json")).toBe(before);
	});

	it("applying the same successful intent twice writes once", async () => {
		const p = await project();
		const w = watched(p.io);
		await applyIntent(w.io, p.files, describeLedger("ledger", "twice"));
		const r = await applyIntent(
			w.io,
			p.files,
			describeLedger("ledger", "twice"),
		);
		expect(r).toMatchObject({ ok: true, wrote: "noop" });
		expect(w.log.checks).toBe(1);
	});

	it("an unknown field is refused rather than dropped, and a defaulted field can be removed", async () => {
		const p = await project();
		const set: Intent = {
			op: "update",
			file: "a.json",
			target: LEDGER,
			field: "x-unlisted",
			expected: undefined,
			value: "v",
		};
		// Unknown fields do not survive load, so setting one is refused rather than dropped silently.
		refused(await applyIntent(p.io, p.files, set), "invalid-intent");
		const real: Intent = {
			...set,
			field: "description",
			expected: "ledger",
			value: undefined,
		};
		// Removing a field core defaults is accepted; the file then carries core's default.
		const r = await applyIntent(p.io, p.files, real);
		expect(r.ok).toBe(true);
		expect(
			(await json(p, "a.json")).boundedcontexts.ledger.description,
		).toBeUndefined();
	});
});

describe("G6 duplicate", () => {
	const addContext = (id: string): Intent => ({
		op: "add",
		file: "a.json",
		parent: { ref: "#", kind: "element" },
		collection: "boundedcontexts",
		id,
		element: {
			name: "Treasury",
			description: "new",
			subdomains: [{ $ref: "#/domains/bank/subdomains/core" }],
		},
		providers: [{ ref: "#/domains/bank/subdomains/core", kind: "subdomain" }],
	});

	it("refuses an id the parent already holds, and adds a fresh one", async () => {
		const p = await project();
		const before = await p.read("a.json");
		refused(
			await applyIntent(p.io, p.files, addContext("ledger")),
			"duplicate",
		);
		expect(await p.read("a.json")).toBe(before);
		const r = await applyIntent(p.io, p.files, addContext("treasury"));
		expect(r.ok).toBe(true);
		const doc = await json(p, "a.json");
		expect(doc.boundedcontexts.treasury.description).toBe("new");
		expect(Object.keys(doc.boundedcontexts)).toEqual([
			"ledger",
			"risk",
			"treasury",
		]);
	});

	it("refuses an element a list already holds exactly", async () => {
		const p = await project();
		expect((await applyIntent(p.io, p.files, consumePost)).ok).toBe(true);
		refused(await applyIntent(p.io, p.files, consumePost), "duplicate");
	});
});

describe("G7 the file changes between the read and the recheck: retried once", () => {
	it("re-runs from fresh text and succeeds, keeping the concurrent edit", async () => {
		const p = await project();
		const w = watched(p.io, async (call) => {
			if (call !== 1) return;
			const doc = await json(p, "a.json");
			doc.boundedcontexts.risk.description = "concurrent";
			await p.write("a.json", `${JSON.stringify(doc, null, 2)}\n`);
		});
		const r = await applyIntent(
			w.io,
			p.files,
			describeLedger("ledger", "after retry"),
		);
		expect(r).toEqual({ ok: true, file: "a.json", wrote: "disk" });
		expect(w.log.checks).toBe(2);
		const after = await json(p, "a.json");
		expect(after.boundedcontexts.ledger.description).toBe("after retry");
		expect(after.boundedcontexts.risk.description).toBe("concurrent");
	});

	it("re-reads EVERY file on the retry, not just the owner", async () => {
		const p = await project();
		const w = watched(p.io, async (call) => {
			if (call === 1) await p.write("a.json", `${await p.read("a.json")} `);
		});
		await applyIntent(w.io, p.files, describeLedger("ledger", "r"));
		expect(w.log.reads.filter((f) => f === "c.json")).toHaveLength(2);
	});
});

describe("G8 the file changes again on the retry: file-changed, no write", () => {
	it("gives up after one retry and writes nothing", async () => {
		const p = await project();
		let last = "";
		const w = watched(p.io, async (call) => {
			const doc = await json(p, "a.json");
			doc.boundedcontexts.risk.description = `concurrent ${call}`;
			last = `${JSON.stringify(doc, null, 2)}\n`;
			await p.write("a.json", last);
		});
		const r = refused(
			await applyIntent(w.io, p.files, describeLedger("ledger", "never")),
			"file-changed",
		);
		expect(r).toMatchObject({
			action: expect.stringContaining("Reopen the form"),
		});
		expect(w.log.checks).toBe(2);
		expect(await p.read("a.json")).toBe(last);
		expect(await p.listing()).toEqual(["a.json", "b.json", "c.json"]);
	});
});

describe("G9 wrong owner", () => {
	it("refuses a parent that lives in another file, naming the file that owns it", async () => {
		const p = await project();
		const before = await p.read("a.json");
		const r = refused(
			await applyIntent(p.io, p.files, {
				op: "add",
				file: "a.json",
				parent: { ref: `b.json${T.claims.ref}`, kind: "context" },
				collection: "aggregates",
				id: "ledger_copy",
				element: { name: "Copy", description: "" },
			}),
			"wrong-owner",
		);
		expect(r).toMatchObject({ action: expect.stringContaining("b.json") });
		expect(await p.read("a.json")).toBe(before);
	});

	it("refuses an update target in another file", async () => {
		const p = await project();
		refused(
			await applyIntent(p.io, p.files, {
				...describeLedger("ledger", "x"),
				file: "b.json",
				target: { ref: `a.json${T.ledger.ref}`, kind: "context" },
			}),
			"wrong-owner",
		);
	});

	it("accepts a target that names the owner itself by file", async () => {
		const p = await project();
		const r = await applyIntent(p.io, p.files, {
			...describeLedger("ledger", "self-qualified"),
			target: { ref: `a.json${T.ledger.ref}`, kind: "context" },
		});
		expect(r.ok).toBe(true);
	});
});

describe("G10 stale provider", () => {
	it("refuses when the provider was removed from its file", async () => {
		const p = await project();
		const a = await json(p, "a.json");
		delete a.boundedcontexts.ledger.services.payments.provides.post;
		await p.write("a.json", `${JSON.stringify(a, null, 2)}\n`);
		const before = await p.read("b.json");
		refused(await applyIntent(p.io, p.files, consumePost), "stale-provider");
		expect(await p.read("b.json")).toBe(before);
	});

	it("refuses when the provider is now the wrong kind", async () => {
		const p = await project();
		const r = await applyIntent(p.io, p.files, {
			...consumePost,
			element: { consumable: { $ref: `a.json${T.ledger.ref}` } },
			providers: [{ ref: `a.json${T.ledger.ref}`, kind: "consumable" }],
		});
		expect(refused(r, "stale-provider")).toMatchObject({
			detail: expect.stringContaining("no longer"),
		});
	});

	it("still applies when the provider is unchanged", async () => {
		const p = await project();
		expect((await applyIntent(p.io, p.files, consumePost)).ok).toBe(true);
	});
});

describe("G11 unreadable dependency refuses only what references it; there is no last-good", () => {
	it("refuses an intent whose provider file cannot be parsed, naming that file", async () => {
		const p = await project();
		// The writer is stateless: a successful write first proves the dependency was fine, then it breaks.
		expect(
			(await applyIntent(p.io, p.files, describeLedger("ledger", "ok"))).ok,
		).toBe(true);
		await p.write("a.json", "{ not json");
		const before = await p.read("b.json");
		const r = refused(
			await applyIntent(p.io, p.files, consumePost),
			"dependency-unreadable",
		);
		expect(r).toMatchObject({ action: expect.stringContaining("a.json") });
		expect(await p.read("b.json")).toBe(before);
		expect(await p.read("a.json")).toBe("{ not json");
	});

	it("does not refuse an unrelated intent just because another file is broken", async () => {
		const p = await project();
		await p.write("c.json", "[]");
		const r = await applyIntent(p.io, p.files, {
			op: "update",
			file: "b.json",
			target: { ref: T.claims.ref, kind: "context" },
			field: "description",
			expected: "claims",
			value: "still works",
		});
		expect(r.ok).toBe(true);
		expect(await p.read("c.json")).toBe("[]");
	});

	it("refuses with owner-unparsable when the owner itself is broken, and writes nothing", async () => {
		const p = await project();
		await p.write("a.json", '{"name": 1}');
		const r = refused(
			await applyIntent(p.io, p.files, describeLedger("ledger", "x")),
			"owner-unparsable",
		);
		expect(r).toMatchObject({
			detail: expect.stringContaining("not a workspace file"),
		});
		expect(await p.read("a.json")).toBe('{"name": 1}');
	});

	it("does not resolve a deleted dependency from memory either", async () => {
		const p = await project();
		await fs.rm(path.join(p.dir, "a.json"));
		refused(
			await applyIntent(p.io, p.files, consumePost),
			"dependency-unreadable",
		);
	});

	it("a dependency absent from the file list is a stale provider, not unreadable", async () => {
		const p = await project();
		refused(
			await applyIntent(
				p.io,
				p.files.filter((f) => f !== "a.json"),
				consumePost,
			),
			"stale-provider",
		);
	});
});

describe("G12 qualified-invalid entries are retained on an owning-file write", () => {
	const retained = {
		type: "upstream-downstream",
		upstream: { $ref: "gone.json#/boundedcontexts/x" },
		downstream: { $ref: "#/boundedcontexts/claims" },
		description: "waiting for gone.json",
		"x-keep": { note: "raw" },
	};
	const withRetained = (texts: Record<string, string>) => {
		const b = JSON.parse(texts["b.json"]);
		b.relationships.unshift(retained);
		texts["b.json"] = `${JSON.stringify(b, null, 2)}\n`;
	};
	const touchClaims: Intent = {
		op: "update",
		file: "b.json",
		target: { ref: T.claims.ref, kind: "context" },
		field: "description",
		expected: "claims",
		value: "touched",
	};

	it("writes it back raw, at its index, with its unknown key, and still diagnoses it", async () => {
		const p = await project(withRetained);
		expect((await applyIntent(p.io, p.files, touchClaims)).ok).toBe(true);
		const b = await json(p, "b.json");
		expect(b.relationships).toHaveLength(2);
		expect(b.relationships[0]).toEqual(retained);
		const again = assemble(
			await Promise.all(
				p.files.map(async (file) => ({ file, text: await p.read(file) })),
			),
		);
		expect(
			again.diagnostics.get("b.json")?.some((d) => d.rule === "unresolved-ref"),
		).toBe(true);
	});

	it("re-links once the missing file appears", async () => {
		const p = await project(withRetained);
		await applyIntent(p.io, p.files, touchClaims);
		const gone = JSON.parse(teamTexts()["c.json"]);
		gone.id = "gone";
		gone.boundedcontexts.x = gone.boundedcontexts.depot;
		await p.write("gone.json", `${JSON.stringify(gone, null, 2)}\n`);
		const files = [...p.files, "gone.json"];
		const set = assemble(
			await Promise.all(
				files.map(async (file) => ({ file, text: await p.read(file) })),
			),
		);
		const relationships = set.set.byPath("b.json")?.relationships ?? [];
		expect(relationships).toHaveLength(2);
	});

	it("is not a reason to refuse: the unresolved ref in the owner does not block the write", async () => {
		const p = await project(withRetained);
		expect((await applyIntent(p.io, p.files, touchClaims)).ok).toBe(true);
	});
});

describe("G12 (all four holders) a qualified-invalid entry survives an owning-file write at its index", () => {
	const GONE = "gone.json#/boundedcontexts/x";
	/** Parsed JSON, which the test reaches into by path. */
	type Doc = ReturnType<typeof JSON.parse>;
	type Holder = {
		name: string;
		seed: (b: Doc) => void;
		pick: (b: Doc) => unknown;
		entry: unknown;
	};
	const account = (b: Doc) => b.boundedcontexts.claims.aggregates.account;
	const holders: Holder[] = [
		{
			name: "a workspace relationship",
			entry: {
				type: "upstream-downstream",
				upstream: { $ref: `${GONE}` },
				downstream: { $ref: "#/boundedcontexts/claims" },
				description: "w",
				"x-keep": 1,
			},
			seed: (b) => b.relationships.unshift(holders[0].entry),
			pick: (b) => b.relationships[0],
		},
		{
			name: "a consumer's consumes entry",
			entry: {
				consumable: { $ref: `${GONE}/services/s/provides/p` },
				"x-keep": { deep: [1, 2] },
			},
			seed: (b) => account(b).consumes.unshift(holders[1].entry),
			pick: (b) => account(b).consumes[0],
		},
		{
			name: "an entity relation",
			entry: {
				target: { $ref: `${GONE}/aggregates/y/entities/z` },
				relation: "references",
				"x-keep": true,
			},
			seed: (b) =>
				account(b).entities.account.relations.unshift(holders[2].entry),
			pick: (b) => account(b).entities.account.relations[0],
		},
		{
			name: "a consumption's by entry",
			entry: { $ref: `${GONE}/processes/p`, "x-keep": "by" },
			seed: (b) => {
				account(b).consumes.push({
					consumable: { $ref: POST },
					by: [
						holders[3].entry,
						{ $ref: "#/boundedcontexts/claims/aggregates/account" },
					],
				});
			},
			pick: (b) => account(b).consumes[0].by[0],
		},
	];
	const touch: Intent = {
		op: "update",
		file: "b.json",
		target: { ref: T.orders.ref, kind: "context" },
		field: "description",
		expected: "orders",
		value: "unrelated",
	};

	it.each(holders.map((h) => [h.name, h] as const))(
		"%s",
		async (_name, holder) => {
			const p = await project((texts) => {
				const b = JSON.parse(texts["b.json"]);
				holder.seed(b);
				texts["b.json"] = `${JSON.stringify(b, null, 2)}\n`;
			});
			const r = await applyIntent(p.io, p.files, touch);
			expect(r.ok).toBe(true);
			const b = await json(p, "b.json");
			expect(holder.pick(b)).toEqual(holder.entry);
			expect(b.boundedcontexts.orders.description).toBe("unrelated");
		},
	);
});

describe("G12 (a consumption's agreement) a qualified-invalid relationship survives an owning-file write", () => {
	const POSTED = T.fromB(T.posted);
	const AGREEMENT = "relationships/ledger/upstream-downstream/claims";
	const BAD = {
		"missing-file": `gone.json#/${AGREEMENT}`,
		"missing-target": "a.json#/relationships/ghost/upstream-downstream/ledger",
		"wrong-kind": "a.json#/boundedcontexts/ledger",
		"invalid-path": `a.txt#/${AGREEMENT}`,
	} as const;
	const seed =
		(first: string, second: string) => (texts: Record<string, string>) => {
			const b = JSON.parse(texts["b.json"]);
			b.boundedcontexts.claims.aggregates.account.consumes = [
				{ consumable: { $ref: POST }, relationship: { $ref: first } },
				{ consumable: { $ref: POSTED }, relationship: { $ref: second } },
			];
			texts["b.json"] = `${JSON.stringify(b, null, 2)}\n`;
		};
	const touch: Intent = {
		op: "update",
		file: "b.json",
		target: { ref: T.orders.ref, kind: "context" },
		field: "description",
		expected: "orders",
		value: "unrelated",
	};
	const causes = Object.keys(BAD) as Array<keyof typeof BAD>;

	it.each(causes)(
		"%s: each consumption keeps its own ref, only the owner changes, and the diagnostic is still there",
		async (cause) => {
			const other = causes[(causes.indexOf(cause) + 1) % causes.length];
			const p = await project(seed(BAD[cause], BAD[other]));
			const before = { a: await p.read("a.json"), c: await p.read("c.json") };
			expect((await applyIntent(p.io, p.files, touch)).ok).toBe(true);

			const b = await json(p, "b.json");
			expect(
				b.boundedcontexts.claims.aggregates.account.consumes.map(
					(it: { relationship: unknown }) => it.relationship,
				),
			).toEqual([{ $ref: BAD[cause] }, { $ref: BAD[other] }]);
			expect(b.boundedcontexts.orders.description).toBe("unrelated");
			expect(await p.read("a.json")).toBe(before.a);
			expect(await p.read("c.json")).toBe(before.c);

			const again = assemble(
				await Promise.all(
					p.files.map(async (file) => ({ file, text: await p.read(file) })),
				),
			);
			const found = (again.diagnostics.get("b.json") ?? []).filter(
				(d) =>
					d.rule === "unresolved-ref" && d.message.includes('"relationship"'),
			);
			expect(found).toHaveLength(2);
			expect(found[0].message).toContain(BAD[cause]);
			expect(found[1].message).toContain(BAD[other]);
		},
	);

	it("is written back again by a second unrelated write: nothing is lost on repeat", async () => {
		const p = await project(seed(BAD["missing-file"], BAD["wrong-kind"]));
		await applyIntent(p.io, p.files, touch);
		const once = await p.read("b.json");
		await applyIntent(p.io, p.files, {
			...touch,
			expected: "unrelated",
			value: "again",
		});
		const twice = JSON.parse(await p.read("b.json"));
		const consumes = (file: typeof twice) =>
			file.boundedcontexts.claims.aggregates.account.consumes.map(
				(it: { relationship: unknown }) => it.relationship,
			);
		expect(consumes(twice)).toEqual([
			{ $ref: BAD["missing-file"] },
			{ $ref: BAD["wrong-kind"] },
		]);
		expect(consumes(JSON.parse(once))).toEqual(consumes(twice));
	});
});

describe("G13 a cross-file consumption leaves the provider byte-identical", () => {
	it("adds the consumption to the consumer's file with a qualified ref and never touches the provider", async () => {
		const p = await project();
		const provider = await p.read("a.json");
		const r = await applyIntent(p.io, p.files, consumePost);
		expect(r).toEqual({ ok: true, file: "b.json", wrote: "disk" });
		expect(await p.read("a.json")).toBe(provider);
		const b = await json(p, "b.json");
		expect(
			b.boundedcontexts.claims.aggregates.account.consumes[0].consumable,
		).toEqual({
			$ref: POST,
		});
		const loaded = assemble(
			await Promise.all(
				p.files.map(async (file) => ({ file, text: await p.read(file) })),
			),
		);
		const consumer = loaded.set.byPath("b.json");
		expect(consumer?.unresolved ?? []).toHaveLength(0);
		expect(
			loaded.diagnostics
				.get("b.json")
				?.filter((d) => d.rule === "unresolved-ref") ?? [],
		).toHaveLength(0);
	});
});

describe("G14 unknown fields are lost on an owning-file write: the named decision 29 cost", () => {
	it("characterises it: the file said so before, and the write drops the field", async () => {
		const p = await project((texts) => {
			const b = JSON.parse(texts["b.json"]);
			b.boundedcontexts.claims["x-team-note"] = "hand written";
			texts["b.json"] = `${JSON.stringify(b, null, 2)}\n`;
		});
		const before = assemble(
			await Promise.all(
				p.files.map(async (file) => ({ file, text: await p.read(file) })),
			),
		);
		expect(
			before.diagnostics.get("b.json")?.some((d) => d.rule === "unknown-field"),
		).toBe(true);
		const r = await applyIntent(p.io, p.files, {
			op: "update",
			file: "b.json",
			target: { ref: T.orders.ref, kind: "context" },
			field: "description",
			expected: "orders",
			value: "unrelated edit",
		});
		expect(r.ok).toBe(true);
		const text = await p.read("b.json");
		expect(text).not.toContain("x-team-note");
		expect(await p.read("a.json")).toBe(teamTexts()["a.json"]);
	});

	it("does not drop the field of a file the write did not own", async () => {
		const p = await project((texts) => {
			const c = JSON.parse(texts["c.json"]);
			c.boundedcontexts.depot["x-team-note"] = "kept";
			texts["c.json"] = `${JSON.stringify(c, null, 2)}\n`;
		});
		await applyIntent(p.io, p.files, describeLedger("ledger", "w"));
		expect(await p.read("c.json")).toContain("x-team-note");
	});
});

describe("remove, relationships, consumptions and the other future-form shapes", () => {
	it("removes a record element and a list element, each with a stale-value guard", async () => {
		const p = await project();
		const r = await applyIntent(p.io, p.files, {
			op: "remove",
			file: "a.json",
			target: { ref: T.risk.ref, kind: "context" },
			expected: { ...(await json(p, "a.json")).boundedcontexts.risk },
		});
		expect(r.ok).toBe(true);
		expect(Object.keys((await json(p, "a.json")).boundedcontexts)).toEqual([
			"ledger",
		]);

		const rel = (await json(p, "b.json")).relationships[0];
		const relRef = T.set.byPath("b.json")?.relationships[0].ref as string;
		refused(
			await applyIntent(p.io, p.files, {
				op: "remove",
				file: "b.json",
				target: { ref: relRef, kind: "relationship" },
				expected: { ...rel, description: "something else" },
			}),
			"stale-value",
		);
		const removed = await applyIntent(p.io, p.files, {
			op: "remove",
			file: "b.json",
			target: { ref: relRef, kind: "relationship" },
			expected: rel,
		});
		expect(removed.ok).toBe(true);
		expect((await json(p, "b.json")).relationships).toEqual([]);
	});

	it("updates a field of a relationship, which is addressed inside an array", async () => {
		const p = await project();
		const relRef = T.set.byPath("b.json")?.relationships[0].ref as string;
		const r = await applyIntent(p.io, p.files, {
			op: "update",
			file: "b.json",
			target: { ref: relRef, kind: "relationship" },
			field: "description",
			expected: "claims follow the ledger",
			value: "renamed",
		});
		expect(r.ok).toBe(true);
		expect((await json(p, "b.json")).relationships[0].description).toBe(
			"renamed",
		);
	});

	it("updates a consumption, which is addressed by its consumer and consumable", async () => {
		const p = await project();
		await applyIntent(p.io, p.files, consumePost);
		const loaded = assemble(
			await Promise.all(
				p.files.map(async (file) => ({ file, text: await p.read(file) })),
			),
		);
		const ref = loaded.set.byPath("b.json")?.getAggregateByRef(T.account.ref)
			?.consumptions[0].ref as string;
		const agreement = loaded.set.byPath("b.json")?.relationships[0]
			.ref as string;
		const r = await applyIntent(p.io, p.files, {
			op: "update",
			file: "b.json",
			target: { ref, kind: "consumption" },
			field: "relationship",
			expected: undefined,
			value: { $ref: agreement },
			providers: [{ ref: agreement, kind: "relationship" }],
		});
		expect(r.ok).toBe(true);
		const b = await json(p, "b.json");
		expect(
			b.boundedcontexts.claims.aggregates.account.consumes[0].relationship,
		).toEqual({
			$ref: agreement,
		});
		// A field core does not know cannot survive, so it is refused rather than dropped.
		refused(
			await applyIntent(p.io, p.files, {
				op: "update",
				file: "b.json",
				target: { ref, kind: "consumption" },
				field: "x-flag",
				expected: undefined,
				value: true,
			}),
			"invalid-intent",
		);
	});

	it("edits the workspace itself through the # ref", async () => {
		const p = await project();
		const r = await applyIntent(p.io, p.files, {
			op: "update",
			file: "b.json",
			target: { ref: "#", kind: "element" },
			field: "description",
			expected: "B",
			value: "Team B, edited",
		});
		expect(r.ok).toBe(true);
		expect((await json(p, "b.json")).description).toBe("Team B, edited");
	});

	it("refuses to remove the workspace itself", async () => {
		const p = await project();
		refused(
			await applyIntent(p.io, p.files, {
				op: "remove",
				file: "b.json",
				target: { ref: "#", kind: "element" },
			}),
			"invalid-intent",
		);
	});

	it("refuses an add whose container shape disagrees with the id", async () => {
		const p = await project();
		refused(
			await applyIntent(p.io, p.files, {
				op: "add",
				file: "b.json",
				parent: { ref: "#", kind: "element" },
				collection: "relationships",
				id: "nope",
				element: { type: "x" },
			}),
			"invalid-intent",
		);
		refused(
			await applyIntent(p.io, p.files, {
				op: "add",
				file: "b.json",
				parent: { ref: "#", kind: "element" },
				collection: "boundedcontexts",
				element: { name: "Z", description: "" },
			}),
			"invalid-intent",
		);
	});

	it("creates a collection the parent does not have yet", async () => {
		const p = await project();
		const r = await applyIntent(p.io, p.files, {
			op: "add",
			file: "b.json",
			parent: { ref: "#", kind: "element" },
			collection: "teams",
			id: "platform",
			element: { name: "Platform" },
		});
		expect(r.ok).toBe(true);
		expect((await json(p, "b.json")).teams.platform.name).toBe("Platform");
	});

	it("refuses a change that core drops on load instead of writing less than was asked", async () => {
		const p = await project();
		const before = await p.read("b.json");
		refused(
			await applyIntent(p.io, p.files, {
				op: "add",
				file: "b.json",
				parent: { ref: T.account.ref, kind: "element" },
				collection: "consumes",
				element: { consumable: { $ref: POST }, "x-extra": 1 },
				providers: [POST_REF],
			}),
			"invalid-intent",
		);
		expect(await p.read("b.json")).toBe(before);
	});

	it("refuses an element that core cannot load at all", async () => {
		const p = await project();
		const r = await applyIntent(p.io, p.files, {
			op: "add",
			file: "b.json",
			parent: { ref: "#", kind: "element" },
			collection: "boundedcontexts",
			id: "broken",
			element: { name: "Broken", aggregates: "not an object" },
		});
		expect(refused(r, "invalid-intent")).toMatchObject({
			detail: expect.stringContaining("could not be loaded"),
		});
	});

	it("refuses an update on something that is not an object in the file", async () => {
		const p = await project();
		const r = await applyIntent(p.io, p.files, {
			op: "update",
			file: "b.json",
			target: { ref: `${T.claims.ref}/subdomains`, kind: "element" },
			field: "x",
			expected: undefined,
			value: 1,
		});
		refused(r, "stale-target");
	});
});

describe("refusals that need no particular model", () => {
	it("an owner that is not in the file list is an invalid intent", async () => {
		const p = await project();
		refused(
			await applyIntent(p.io, ["b.json"], describeLedger("ledger", "x")),
			"invalid-intent",
		);
	});

	it("an owner that cannot be read is owner-unparsable", async () => {
		const p = await project();
		await fs.rm(path.join(p.dir, "a.json"));
		refused(
			await applyIntent(p.io, p.files, describeLedger("ledger", "x")),
			"owner-unparsable",
		);
	});

	it("a failing write is write-failed and names no stale cause", async () => {
		const p = await project();
		const failing: TextIo = {
			readText: p.io.readText,
			writeIfUnchanged: async () => ({ status: "failed", detail: "EACCES" }),
		};
		expect(
			refused(
				await applyIntent(failing, p.files, describeLedger("ledger", "x")),
				"write-failed",
			),
		).toMatchObject({ detail: expect.stringContaining("EACCES") });
	});

	it("a failing write passes on the action the io knows, when it has one", async () => {
		const p = await project();
		const failing: TextIo = {
			readText: p.io.readText,
			writeIfUnchanged: async () => ({
				status: "failed",
				detail: "locked",
				action: "Unlock it.",
			}),
		};
		const r = await applyIntent(
			failing,
			p.files,
			describeLedger("ledger", "x"),
		);
		expect(r).toMatchObject({
			ok: false,
			cause: "write-failed",
			action: "Unlock it.",
		});
	});

	it("a malformed ref in a target or a provider is an invalid intent, not a throw", async () => {
		const p = await project();
		refused(
			await applyIntent(p.io, p.files, {
				...describeLedger("ledger", "x"),
				target: { ref: "no-hash", kind: "context" },
			}),
			"invalid-intent",
		);
		refused(
			await applyIntent(p.io, p.files, {
				...describeLedger("ledger", "x"),
				target: { ref: "%zz.json#/a", kind: "context" },
			}),
			"invalid-intent",
		);
		refused(
			await applyIntent(p.io, p.files, {
				...consumePost,
				element: { consumable: { $ref: "bad" } },
				providers: [{ ref: "bad", kind: "consumable" }],
			}),
			"invalid-intent",
		);
		refused(
			await applyIntent(p.io, p.files, {
				...consumePost,
				element: { consumable: { $ref: "../../x.json#/a" } },
				providers: [{ ref: "../../x.json#/a", kind: "consumable" }],
			}),
			"invalid-intent",
		);
	});

	it("a provider in a file that was never part of the project is stale", async () => {
		const p = await project();
		refused(
			await applyIntent(p.io, p.files, {
				...consumePost,
				element: { consumable: { $ref: "zz.json#/a" } },
				providers: [{ ref: "zz.json#/a", kind: "consumable" }],
			}),
			"stale-provider",
		);
	});

	it("a text identical to the file after canonicalising is a no-op, not a write", async () => {
		const p = await project();
		const w = watched(p.io);
		// An add whose result already exists is `duplicate`; an update to the same
		// canonical text via a different expected is `noop` only when values match.
		const r = await applyIntent(
			w.io,
			p.files,
			describeLedger("ledger", "ledger"),
		);
		expect(r).toMatchObject({ ok: true, wrote: "noop" });
	});
});

describe("intentProblem: the intent is checked as a value before any file is read", () => {
	const good = describeLedger("ledger", "x");
	const cases: Array<[string, unknown, string]> = [
		["not an object", 3, "object"],
		["no file", { ...good, file: 3 }, "set path"],
		["file escapes", { ...good, file: "../x.json" }, "not a set path"],
		["file is schema.json", { ...good, file: "schema.json" }, "not a set path"],
		["unknown op", { ...good, op: "rename" }, "op must be"],
		["target not typed", { ...good, target: "x" }, "target"],
		[
			"unknown kind",
			{ ...good, target: { ref: "#", kind: "nope" } },
			"unknown kind",
		],
		["prototype field", { ...good, field: "__proto__" }, "property name"],
		["empty field", { ...good, field: "" }, "property name"],
		[
			"update without expected",
			{ ...good, expected: undefined, value: 1, ...{} } as unknown,
			"",
		],
		["providers not a list", { ...good, providers: 3 }, "list"],
		["provider not typed", { ...good, providers: [3] }, "provider"],
		[
			"expected not JSON",
			{ ...good, expected: () => 1 },
			"expected is not JSON",
		],
		["value not JSON", { ...good, value: Number.NaN }, "value is not JSON"],
		[
			"value cyclic or too deep",
			{ ...good, value: deep(80) },
			"value is not JSON",
		],
		[
			"undeclared embedded ref",
			{ ...good, value: { $ref: "#/x" } },
			"without declaring",
		],
		[
			"add without element",
			{
				op: "add",
				file: "a.json",
				parent: { ref: "#", kind: "element" },
				collection: "c",
			},
			"element",
		],
		[
			"add with bad collection",
			{
				op: "add",
				file: "a.json",
				parent: { ref: "#", kind: "element" },
				collection: "constructor",
				element: {},
			},
			"collection",
		],
		[
			"add with bad id",
			{
				op: "add",
				file: "a.json",
				parent: { ref: "#", kind: "element" },
				collection: "c",
				id: "",
				element: {},
			},
			"id",
		],
		[
			"add with bad parent",
			{ op: "add", file: "a.json", parent: 1, collection: "c", element: {} },
			"parent",
		],
		[
			"remove with bad target",
			{ op: "remove", file: "a.json", target: 1 },
			"target",
		],
		[
			"remove with bad expected",
			{
				op: "remove",
				file: "a.json",
				target: { ref: "#", kind: "element" },
				expected: Number.POSITIVE_INFINITY,
			},
			"expected",
		],
	];
	function deep(n: number): unknown {
		let v: unknown = 1;
		for (let i = 0; i < n; i++) v = [v];
		return v;
	}
	it.each(cases.filter(([, , m]) => m !== ""))(
		"%s",
		(_name, intent, message) => {
			expect(intentProblem(intent)).toContain(message);
		},
	);

	it("update must state both expected and value", () => {
		const { expected: _e, ...noExpected } = good as Extract<
			Intent,
			{ op: "update" }
		>;
		expect(intentProblem(noExpected)).toContain("both expected and value");
	});

	it("a well-formed intent passes", () => {
		expect(intentProblem(good)).toBeUndefined();
		expect(intentProblem(consumePost)).toBeUndefined();
		expect(
			intentProblem({
				op: "remove",
				file: "a.json",
				target: LEDGER,
				expected: { a: [1, null] },
			}),
		).toBeUndefined();
	});

	it("applyIntent turns a bad intent into a refusal, never a throw", async () => {
		const p = await project();
		const r = await applyIntent(p.io, p.files, {
			op: "wat",
		} as unknown as Intent);
		expect(refused(r, "invalid-intent").ok).toBe(false);
	});
});

describe("jsonEqual", () => {
	it("compares by value regardless of key order", () => {
		expect(
			jsonEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 }),
		).toBe(true);
		expect(jsonEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
		expect(jsonEqual({ a: 1 }, { b: 1 })).toBe(false);
		expect(jsonEqual([1, 2], [1, 2, 3])).toBe(false);
		expect(jsonEqual([1], { 0: 1 })).toBe(false);
		expect(jsonEqual(null, undefined)).toBe(false);
		expect(jsonEqual({ a: 1 }, null)).toBe(false);
	});
});

describe("diskTextIo", () => {
	it("reports a missing file instead of throwing, and refuses a path that is not a set path", async () => {
		const p = await project();
		expect((await p.io.readText("missing.json")).ok).toBe(false);
		expect((await p.io.readText("../escape.json")).ok).toBe(false);
		expect(await p.io.writeIfUnchanged("../escape.json", "x", "h")).toEqual({
			status: "failed",
			detail: "not a set path",
		});
	});

	it("says changed when the file vanished before the write", async () => {
		const p = await project();
		await fs.rm(path.join(p.dir, "a.json"));
		expect(await p.io.writeIfUnchanged("a.json", "x", "h")).toEqual({
			status: "changed",
		});
	});

	it("reports a write error and leaves no temp file behind", async () => {
		const p = await project();
		const read = await p.io.readText("a.json");
		if (!read.ok) throw new Error("setup");
		await fs.rm(path.join(p.dir, "a.json"));
		await fs.mkdir(path.join(p.dir, "a.json"));
		// The path is now a directory, so the pre-check read fails: changed, no write.
		expect(await p.io.writeIfUnchanged("a.json", "x", read.hash)).toEqual({
			status: "changed",
		});
		expect((await p.listing()).filter((f) => f.endsWith(".tmp"))).toEqual([]);
	});

	it("cleans its temp file when the rename fails", async () => {
		const p = await project();
		const read = await p.io.readText("b.json");
		if (!read.ok) throw new Error("setup");
		await fs.chmod(p.dir, 0o500);
		try {
			const out = await p.io.writeIfUnchanged("b.json", "x", read.hash);
			expect(out.status).toBe("failed");
		} finally {
			await fs.chmod(p.dir, 0o700);
		}
		expect((await p.listing()).filter((f) => f.endsWith(".tmp"))).toEqual([]);
	});
});

describe("coverage of the refusals around the edges of an edit", () => {
	it("an escaping path in a target is an invalid intent, not a wrong owner", async () => {
		const p = await project();
		refused(
			await applyIntent(p.io, p.files, {
				...describeLedger("ledger", "x"),
				target: {
					ref: "../../x.json#/boundedcontexts/ledger",
					kind: "context",
				},
			}),
			"invalid-intent",
		);
	});

	it("an element that is in the model but not a place in the file cannot be edited", async () => {
		const p = await project();
		const r = await applyIntent(p.io, p.files, {
			op: "update",
			file: "a.json",
			target: { ref: T.answer.ref, kind: "answer" },
			field: "description",
			expected: undefined,
			value: "x",
		});
		expect(refused(r, "invalid-intent")).toMatchObject({
			detail: expect.stringContaining("cannot be edited in place"),
		});
	});

	it("a change core would write identically is a no-op, not a write", async () => {
		const p = await project();
		const before = await p.read("b.json");
		const w = watched(p.io);
		// Removing the version stamp: core stamps its own on write, so the file is byte-for-byte what it was.
		const r = await applyIntent(w.io, p.files, {
			op: "update",
			file: "b.json",
			target: { ref: "#", kind: "element" },
			field: "odsVersion",
			expected: "3.0.0",
			value: undefined,
		});
		expect(r).toMatchObject({ ok: true, wrote: "noop" });
		expect(w.log.checks).toBe(0);
		expect(await p.read("b.json")).toBe(before);
	});

	it("a property the parent never had is created, then refused because the schema would drop it", async () => {
		const p = await project();
		const before = await p.read("b.json");
		refused(
			await applyIntent(p.io, p.files, {
				op: "add",
				file: "b.json",
				parent: { ref: "#", kind: "element" },
				collection: "brand-new",
				id: "x",
				element: { name: "X" },
			}),
			"invalid-intent",
		);
		refused(
			await applyIntent(p.io, p.files, {
				op: "add",
				file: "b.json",
				parent: { ref: "#", kind: "element" },
				collection: "brand-new-list",
				element: { name: "X" },
			}),
			"invalid-intent",
		);
		expect(await p.read("b.json")).toBe(before);
	});

	it("says what the form saw when the field is absent now, and shortens a long value", async () => {
		const p = await project();
		const absent = refused(
			await applyIntent(p.io, p.files, {
				op: "update",
				file: "b.json",
				target: { ref: T.claims.ref, kind: "context" },
				field: "description",
				expected: "was something",
				value: "new",
			}),
			"stale-value",
		);
		expect(absent).toMatchObject({
			detail: expect.stringContaining('"claims"'),
		});
		const long = "x".repeat(300);
		const a = await json(p, "a.json");
		a.boundedcontexts.ledger.description = long;
		await p.write("a.json", `${JSON.stringify(a, null, 2)}\n`);
		const r = refused(
			await applyIntent(p.io, p.files, describeLedger("short", "new")),
			"stale-value",
		);
		expect(r).toMatchObject({ detail: expect.stringContaining("...") });
		const none = refused(
			await applyIntent(p.io, p.files, {
				op: "update",
				file: "a.json",
				target: { ref: T.risk.ref, kind: "context" },
				field: "x-none",
				expected: "was",
				value: "now",
			}),
			"stale-value",
		);
		expect(none).toMatchObject({ detail: expect.stringContaining("(absent)") });
	});
});
