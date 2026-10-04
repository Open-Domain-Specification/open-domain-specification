import { describe, expect, it } from "vitest";
import { filesOf, linkedPair } from "./linked-fixture";
import type { WorkspaceSchema } from "./schema";
import { Workspace } from "./workspace";
import { WorkspaceSet } from "./workspace-set";

const LEDGER = "boundedcontexts/ledger";
const ACCOUNT = `${LEDGER}/aggregates/account`;

/** A written `$ref` that may carry keys this metamodel does not know. */
type Entry = Record<string, unknown>;

type Cause = "missing-file" | "missing-target" | "wrong-kind" | "invalid-path";
const CAUSES: Cause[] = [
	"missing-file",
	"missing-target",
	"wrong-kind",
	"invalid-path",
];

/**
 * One of the four lists that lose an entry when a ref in it fails: the entry
 * is the pair it joins. Each holder says where its list is, what a ref in it
 * has to name, and how to see that the entry loaded.
 */
type Holder = {
	name: string;
	field: string;
	/** The list in file A, and the index the bad entry is put at. */
	list(a: WorkspaceSchema): Entry[];
	at: number;
	/** The raw entry with a bad ref in it, and an unknown key besides. */
	entry(ref: string): Entry;
	/** The ref that fails each way, and the right ref that fixes it. */
	refs: Record<Cause, string> & { fixed: string };
	/** Adds to B what `missing-target` was asking for. */
	supply(b: WorkspaceSchema): void;
	/** How many entries of the list loaded. */
	loaded(a: Workspace): number;
	/** How many the list holds when the bad entry loads too. */
	whole: number;
	/** Where in the dumped file the list is. */
	dumped(a: WorkspaceSchema): Entry[];
};

const POST = `${LEDGER}/services/payments/provides/post`;
const GHOST_OP = `${LEDGER}/services/payments/provides/ghost`;

/** The account aggregate of file A as plain JSON, where the four lists live. */
type RawAccount = {
	consumes: Array<Entry & { by: Entry[] }>;
	entities: Record<string, { relations: Entry[] }>;
};
const account = (file: WorkspaceSchema) =>
	file.boundedcontexts.ledger.aggregates?.account as unknown as RawAccount;
/** A provider's operations as plain JSON, to add a ghost to. */
const provides = (file: WorkspaceSchema) =>
	file.boundedcontexts.ledger.services?.payments.provides as Record<
		string,
		unknown
	>;

const HOLDERS: Holder[] = [
	{
		name: "a consumption whose consumable is elsewhere",
		field: "consumable",
		list: (a) => account(a).consumes,
		at: 1,
		entry: (ref) => ({
			consumable: { $ref: ref, note: "kept inside the ref too" },
			pattern: "open-host-service",
			comments: [{ text: "a comment" }],
			whatever: { nested: [1, 2, 3] },
		}),
		refs: {
			"missing-file": `gone.json#/${POST}`,
			"missing-target": `b.json#/${GHOST_OP}`,
			"wrong-kind": "b.json#/boundedcontexts/ledger",
			"invalid-path": `b.txt#/${POST}`,
			fixed: `b.json#/${POST}`,
		},
		supply: (b) => {
			provides(b).ghost = { name: "Ghost", description: "", type: "event" };
		},
		loaded: (a) =>
			a.getAggregateByRefOrThrow(`#/${ACCOUNT}`).consumptions.length,
		whole: 3,
		dumped: (a) => account(a).consumes,
	},
	{
		name: "a relationship with an end elsewhere",
		field: "upstream",
		list: (a) => a.relationships as unknown as Entry[],
		at: 2,
		entry: (ref) => ({
			type: "upstream-downstream",
			upstream: { $ref: ref, note: "kept inside the ref too" },
			downstream: { $ref: "#/boundedcontexts/risk" },
			upstreamRoles: [],
			downstreamRoles: [],
			description: "declared across files",
			terms: "an unknown key",
		}),
		refs: {
			"missing-file": "gone.json#/boundedcontexts/ledger",
			"missing-target": "b.json#/boundedcontexts/ghost",
			"wrong-kind": `b.json#/${POST}`,
			"invalid-path": "b.txt#/boundedcontexts/ledger",
			fixed: "b.json#/boundedcontexts/ledger",
		},
		supply: (b) => {
			b.boundedcontexts.ghost = { name: "Ghost", description: "" };
		},
		loaded: (a) => a.relationships.length,
		whole: 6,
		dumped: (a) => a.relationships as unknown as Entry[],
	},
	{
		name: "a relation whose target is elsewhere",
		field: "target",
		list: (a) => account(a).entities.line.relations,
		at: 1,
		entry: (ref) => ({
			target: { $ref: ref, note: "kept inside the ref too" },
			relation: "uses",
			label: "an unknown extra follows",
			cardinality: "*",
			extra: true,
		}),
		refs: {
			"missing-file": `gone.json#/${ACCOUNT}/entities/account`,
			"missing-target": `b.json#/${ACCOUNT}/entities/ghost`,
			"wrong-kind": "b.json#/boundedcontexts/ledger",
			"invalid-path": `b.txt#/${ACCOUNT}/entities/account`,
			fixed: `b.json#/${ACCOUNT}/entities/account`,
		},
		supply: (b) => {
			account(b).entities.ghost = {
				name: "Ghost",
				description: "",
				root: false,
				attributes: {},
				relations: [],
			} as never;
		},
		loaded: (a) =>
			a.getEntityByRefOrThrow(`#/${ACCOUNT}/entities/line`).relations.length,
		whole: 2,
		dumped: (a) => account(a).entities.line.relations,
	},
	{
		name: "a consumption's caller elsewhere",
		field: "by",
		list: (a) => account(a).consumes[0].by,
		at: 1,
		entry: (ref) => ({ $ref: ref, note: "an unknown key on a caller" }),
		refs: {
			"missing-file": `gone.json#/${POST}`,
			"missing-target": `b.json#/${GHOST_OP}`,
			"wrong-kind": "b.json#/boundedcontexts/ledger",
			"invalid-path": `b.txt#/${POST}`,
			fixed: `b.json#/${POST}`,
		},
		supply: (b) => {
			provides(b).ghost = { name: "Ghost", description: "", type: "event" };
		},
		loaded: (a) =>
			a.getAggregateByRefOrThrow(`#/${ACCOUNT}`).consumptions[0].by.length,
		whole: 3,
		dumped: (a) => account(a).consumes[0].by,
	},
];

/** The pair's files with the holder's list holding a valid, a bad, and a valid entry. */
function withBad(holder: Holder, cause: Cause) {
	const files = filesOf(linkedPair().set);
	const [a, b] = [files[0][1], files[1][1]];
	const list = holder.list(a);
	const bad = holder.entry(holder.refs[cause]);
	list.splice(holder.at, 0, bad);
	if (holder.name.startsWith("a consumption's caller")) {
		// A third, valid, caller after the bad one, to see the index hold.
		list.push({ $ref: `#/${POST}` });
	} else if (holder.name.startsWith("a consumption whose")) {
		list.push({ consumable: { $ref: `#/${POST}` } });
	}
	const snapshot = JSON.stringify(list);
	return { files, a, b, bad, snapshot, size: list.length };
}

const unresolved = (set: WorkspaceSet) =>
	set.validate().filter((d) => d.rule === "unresolved-ref");

describe.each(HOLDERS)("retention: $name", (holder) => {
	describe.each(CAUSES)("%s", (cause) => {
		it("is reported at its file, and written back raw at its index with every key it had", () => {
			const { files, bad } = withBad(holder, cause);
			const set = WorkspaceSet.fromSchemas(files);

			const found = unresolved(set).filter((d) => d.file === "a.json");
			expect(found.length).toBeGreaterThanOrEqual(1);
			const record = set
				.byPath("a.json")
				?.unresolved.find((it) => it.target === holder.refs[cause]);
			expect(record?.cause).toBe(cause);
			expect(record?.field).toContain(holder.field);

			const dumped = holder.dumped(
				set.toSchemas().get("a.json") as WorkspaceSchema,
			);
			// Exactly the entry the file had, at the index the file had it at.
			expect(dumped[holder.at]).toEqual(bad);
			expect(JSON.stringify(dumped[holder.at])).toBe(JSON.stringify(bad));
			expect(dumped).toHaveLength(holder.whole);
		});

		it("does not call a retained key an unknown field, which would say it is dropped", () => {
			const { files } = withBad(holder, cause);
			const set = WorkspaceSet.fromSchemas(files);
			const unknown = set
				.validate()
				.filter((d) => d.rule === "unknown-field" && d.file === "a.json");
			expect(unknown).toEqual([]);
		});

		it("is the same file again after a second load and dump", () => {
			const { files } = withBad(holder, cause);
			const once = filesOf(WorkspaceSet.fromSchemas(files));
			const twice = filesOf(WorkspaceSet.fromSchemas(once));
			expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
		});

		it("does not load the entry, so a later link is not stale", () => {
			const { files } = withBad(holder, cause);
			const set = WorkspaceSet.fromSchemas(files);
			expect(holder.loaded(set.byPath("a.json") as Workspace)).toBe(
				holder.whole - 1,
			);
		});

		it("links as soon as what it names is there", () => {
			const { files, b } = withBad(holder, cause);
			const first = WorkspaceSet.fromSchemas(files);
			// Dump what could not be linked, then give the second load what it was
			// missing: the file, the target, or a right ref where it was wrong.
			const dumped = filesOf(first);
			let again = dumped;
			if (cause === "missing-file") {
				const stranger = JSON.parse(JSON.stringify(b)) as WorkspaceSchema;
				stranger.id = "team_gone";
				again = [...dumped, ["gone.json", stranger]];
			} else if (cause === "missing-target") {
				holder.supply(dumped[1][1]);
			} else {
				holder.dumped(dumped[0][1])[holder.at] = {
					...holder.dumped(dumped[0][1])[holder.at],
					...fixedEntry(holder),
				};
			}
			const second = WorkspaceSet.fromSchemas(again);
			expect(holder.loaded(second.byPath("a.json") as Workspace)).toBe(
				holder.whole,
			);
			expect(unresolved(second).filter((d) => d.file === "a.json")).toEqual([]);
		});
	});
});

/** The entry with its bad ref replaced by the right one, for the causes an author fixes by hand. */
function fixedEntry(holder: Holder): Entry {
	const fixed = holder.entry(holder.refs.fixed);
	return fixed;
}

describe("retention: a ref that names no file keeps the cost decision 29 names", () => {
	it.each(HOLDERS.map((it) => [it.name, it] as const))(
		"%s is dropped on write and still reported",
		(_, holder) => {
			const files = filesOf(linkedPair().set);
			const list = holder.list(files[0][1]);
			const before = list.length;
			list.splice(holder.at, 0, holder.entry("#/boundedcontexts/ghost-local"));
			const set = WorkspaceSet.fromSchemas(files);
			expect(holder.loaded(set.byPath("a.json") as Workspace)).toBe(before);
			const dumped = holder.dumped(
				set.toSchemas().get("a.json") as WorkspaceSchema,
			);
			expect(dumped).toHaveLength(before);
			expect(
				unresolved(set).filter((d) => d.file === "a.json").length,
			).toBeGreaterThanOrEqual(1);
		},
	);

	it("an unknown key on an entry that does resolve is still dropped and still a warning", () => {
		const files = filesOf(linkedPair().set);
		account(files[0][1]).consumes[0].stray = true;
		const set = WorkspaceSet.fromSchemas(files);
		const unknown = set
			.validate()
			.filter((d) => d.rule === "unknown-field" && d.file === "a.json");
		expect(unknown).toHaveLength(1);
		expect(
			account(set.toSchemas().get("a.json") as WorkspaceSchema).consumes[0],
		).not.toHaveProperty("stray");
	});
});

describe("retention: a workspace loaded alone", () => {
	it.each(HOLDERS)("keeps $name raw when its file is not loaded", (holder) => {
		const { a } = withBad(holder, "missing-file");
		const alone = Workspace.fromSchema(a);
		const dumped = holder.dumped(alone.toSchema());
		expect(dumped[holder.at]).toEqual(holder.dumped(a)[holder.at]);
		expect(dumped).toHaveLength(holder.whole);
		expect(
			alone.validate().filter((d) => d.rule === "unresolved-ref").length,
		).toBeGreaterThanOrEqual(1);
	});

	it("dumps the whole file as it was read, every file ref kept", () => {
		const [a] = filesOf(linkedPair().set);
		const alone = Workspace.fromSchema(a[1]);
		expect(JSON.parse(JSON.stringify(alone.toSchema()))).toEqual(a[1]);
		expect(alone.file).toBeUndefined();
	});
});
