import { describe, expect, it } from "vitest";
import { filesOf, linkedPair } from "./linked-fixture";
import { REF_KINDS } from "./ref-kinds";
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

/** A nested value of a file as plain JSON, by its `/` path. */
function within(file: unknown, path: string): Entry {
	return path
		.split("/")
		.reduce((it, key) => (it as Record<string, unknown>)[key], file) as Entry;
}

/**
 * Every other carrier of a `$ref`: the element that writes it is the element
 * that keeps it, one ref beside its field, so a qualified ref that fails is
 * written back by the same element as it was read from. `list` says the ref
 * is an entry of a list, which comes back at the end of it.
 */
type Carrier = {
	name: string;
	field: string;
	parent: string;
	key: string;
	list?: true;
	/** An existing element this carrier cannot name, `teams/platform` when absent. */
	wrong?: string;
};
const FX = `${LEDGER}/services/payments/provides/fx`;
const REACT = "boundedcontexts/risk/policies/react";
const SETTLE = "boundedcontexts/risk/processes/settle";
const CARRIERS: Carrier[] = [
	{
		name: "attribute.valueobject",
		field: "valueobject",
		parent: `${ACCOUNT}/entities/line/attributes/amount`,
		key: "valueobject",
	},
	{
		name: "attribute.schema",
		field: "schema",
		parent: `${ACCOUNT}/entities/line/attributes/doc`,
		key: "schema",
	},
	{
		name: "attribute.identifies",
		field: "identifies",
		parent: `${ACCOUNT}/entities/line/attributes/owner`,
		key: "identifies",
	},
	{
		name: "glossary.embodiedBy",
		field: "embodiedBy",
		parent: `${LEDGER}/glossary/elsewhere`,
		key: "embodiedBy",
		wrong: "relationships/ledger/upstream-downstream/risk",
	},
	{
		name: "context.team",
		field: "team",
		parent: "boundedcontexts/risk",
		key: "team",
		wrong: "boundedcontexts/ledger",
	},
	{
		name: "context.subdomains",
		field: "subdomains",
		parent: "boundedcontexts/risk/subdomains",
		key: "1",
		list: true,
	},
	{ name: "consumable.schema", field: "schema", parent: FX, key: "schema" },
	{ name: "consumable.returns", field: "returns", parent: FX, key: "returns" },
	{
		name: "consumable.rejects",
		field: "rejects",
		parent: `${FX}/rejects`,
		key: "0",
		list: true,
	},
	{
		name: "consumable.raises",
		field: "raises",
		parent: `${FX}/raises`,
		key: "0",
		list: true,
	},
	{
		name: "consumption.relationship",
		field: "relationship",
		parent: `${ACCOUNT}/consumes/0`,
		key: "relationship",
		wrong: "boundedcontexts/ledger",
	},
	{
		name: "entity.specialises",
		field: "specialises",
		parent: `${ACCOUNT}/entities/kind`,
		key: "specialises",
	},
	{
		name: "valueobject.specialises",
		field: "specialises",
		parent: `${LEDGER}/valueobjects/fiat`,
		key: "specialises",
	},
	{
		name: "invariant.constrains",
		field: "constrains",
		parent: `${ACCOUNT}/invariants/balanced/constrains`,
		key: "0",
		list: true,
	},
	{
		name: "policy.on (an event)",
		field: "on",
		parent: `${REACT}/on`,
		key: "0",
		list: true,
	},
	{
		name: "policy.on (an answer)",
		field: "on",
		parent: `${REACT}/on`,
		key: "1",
		list: true,
	},
	{
		name: "policy.then",
		field: "then",
		parent: `${REACT}/then`,
		key: "0",
		list: true,
	},
	{
		name: "process.starts",
		field: "starts",
		parent: `${SETTLE}/starts`,
		key: "0",
		list: true,
	},
	{
		name: "process.on (an event)",
		field: "on",
		parent: `${SETTLE}/on`,
		key: "0",
		list: true,
	},
	{
		name: "process.on (an answer)",
		field: "on",
		parent: `${SETTLE}/on`,
		key: "1",
		list: true,
	},
	{
		name: "process.then",
		field: "then",
		parent: `${SETTLE}/then`,
		key: "0",
		list: true,
	},
	{
		name: "process.ends",
		field: "ends",
		parent: `${SETTLE}/ends`,
		key: "0",
		list: true,
	},
	{
		name: "deadline.from",
		field: "from",
		parent: `${SETTLE}/deadlines/soon`,
		key: "from",
	},
];

/** The ref a carrier holds in the pair's file A, and the one that fails it each way. */
function carried(carrier: Carrier, file: WorkspaceSchema) {
	const parent = within(file, carrier.parent);
	return parent[carrier.key] as { $ref: string };
}
function failing(carrier: Carrier, cause: Cause, fixed: string): string {
	const pointer = fixed.slice(fixed.indexOf("#"));
	return {
		"missing-file": `gone.json${pointer}`,
		"missing-target": `b.json${pointer}-ghost`,
		"wrong-kind": `b.json#/${carrier.wrong ?? "teams/platform"}`,
		"invalid-path": `b.txt${pointer}`,
	}[cause];
}
/** Whether the carrier's element still writes the ref, wherever in its list it came back to. */
function writes(carrier: Carrier, file: WorkspaceSchema, ref: string): boolean {
	const parent = within(file, carrier.parent);
	return carrier.list
		? (parent as unknown as Array<{ $ref: string }>).some(
				(it) => it.$ref === ref,
			)
		: (parent[carrier.key] as { $ref: string } | undefined)?.$ref === ref;
}

describe.each(CARRIERS)("retention of a qualified ref at $name", (carrier) => {
	describe.each(CAUSES)("%s", (cause) => {
		function load() {
			const files = filesOf(linkedPair().set);
			const held = carried(carrier, files[0][1]);
			const bad = failing(carrier, cause, held.$ref);
			held.$ref = bad;
			return { files, bad, set: WorkspaceSet.fromSchemas(files) };
		}

		it("is reported with its cause, written back by the element that wrote it, and reported again after a reload", () => {
			const { bad, set } = load();
			const record = set
				.byPath("a.json")
				?.unresolved.find((it) => it.target === bad);
			expect(record?.cause).toBe(cause);
			expect(record?.field).toBe(carrier.field);

			const dumped = filesOf(set);
			expect(writes(carrier, dumped[0][1], bad)).toBe(true);
			const reloaded = WorkspaceSet.fromSchemas(dumped);
			const again = reloaded
				.byPath("a.json")
				?.unresolved.filter((it) => it.target === bad);
			expect(again).toHaveLength(1);
			expect(again?.[0].cause).toBe(cause);
		});

		it("is the same file after three loads and dumps", () => {
			const { set } = load();
			const first = filesOf(set);
			const second = filesOf(WorkspaceSet.fromSchemas(first));
			const third = filesOf(WorkspaceSet.fromSchemas(second));
			expect(JSON.stringify(second)).toBe(JSON.stringify(first));
			expect(JSON.stringify(third)).toBe(JSON.stringify(first));
		});
	});
});

/**
 * A consumption is read from the consumer's `consumes` and written by the
 * consumption itself, so the ref its optional `relationship` names has to be
 * kept by that one consumption: two consumptions of one consumer each write
 * the ref they were given.
 */
describe("retention: a consumption's agreement that does not resolve", () => {
	const AGREEMENT = "relationships/ledger/upstream-downstream/risk";
	const BAD: Record<Cause, string> = {
		"missing-file": `gone.json#/${AGREEMENT}`,
		"missing-target": `b.json#/relationships/ledger/upstream-downstream/ghost`,
		"wrong-kind": "b.json#/boundedcontexts/ledger",
		"invalid-path": `b.txt#/${AGREEMENT}`,
	};
	const POSTED = `${LEDGER}/services/payments/provides/posted`;

	/** File A with its consumption naming `first`, and a sibling that consumes another operation naming `second`. */
	function siblings(first: string, second: string) {
		const files = filesOf(linkedPair().set);
		const consumes = account(files[0][1]).consumes;
		consumes[0].relationship = { $ref: first };
		consumes.push({
			consumable: { $ref: `b.json#/${POSTED}` },
			by: [],
			relationship: { $ref: second },
		});
		return files;
	}
	const written = (file: WorkspaceSchema) =>
		account(file).consumes.map((it) => it.relationship);
	const FIXED = `b.json#/${AGREEMENT}`;

	describe.each(CAUSES)("%s", (cause) => {
		it("is kept by its own consumption and reported at its consumer, after a reload too", () => {
			const files = siblings(BAD[cause], FIXED);
			const set = WorkspaceSet.fromSchemas(files);
			const record = set
				.byPath("a.json")
				?.unresolved.find((it) => it.field === "relationship");
			expect(record?.cause).toBe(cause);
			expect(record?.ref).toBe(`#/${ACCOUNT}`);

			const dumped = filesOf(set);
			expect(written(dumped[0][1])).toEqual([
				{ $ref: BAD[cause] },
				{ $ref: FIXED },
			]);

			const again = WorkspaceSet.fromSchemas(dumped).byPath("a.json");
			const remaining = again?.unresolved.filter(
				(it) => it.field === "relationship",
			);
			expect(remaining).toHaveLength(1);
			expect(remaining?.[0]).toMatchObject({ cause, target: BAD[cause] });
		});

		it("does not give the sibling its ref, or take the sibling's", () => {
			const other = CAUSES[(CAUSES.indexOf(cause) + 1) % CAUSES.length];
			const files = siblings(BAD[cause], BAD[other]);
			const set = WorkspaceSet.fromSchemas(files);
			const dumped = filesOf(set);
			expect(written(dumped[0][1])).toEqual([
				{ $ref: BAD[cause] },
				{ $ref: BAD[other] },
			]);
			const causes = set
				.byPath("a.json")
				?.unresolved.filter((it) => it.field === "relationship")
				.map((it) => [it.target, it.cause]);
			expect(causes).toEqual([
				[BAD[cause], cause],
				[BAD[other], other],
			]);
		});

		it("is the same file after three loads and dumps", () => {
			const first = filesOf(
				WorkspaceSet.fromSchemas(siblings(BAD[cause], BAD[cause])),
			);
			const second = filesOf(WorkspaceSet.fromSchemas(first));
			const third = filesOf(WorkspaceSet.fromSchemas(second));
			expect(JSON.stringify(second)).toBe(JSON.stringify(first));
			expect(JSON.stringify(third)).toBe(JSON.stringify(first));
			expect(written(third[0][1])).toEqual([
				{ $ref: BAD[cause] },
				{ $ref: BAD[cause] },
			]);
		});

		it("links, and stops being kept, as soon as what it names is there", () => {
			const first = filesOf(
				WorkspaceSet.fromSchemas(siblings(BAD[cause], FIXED)),
			);
			let again = first;
			if (cause === "missing-file") {
				const stranger = JSON.parse(
					JSON.stringify(first[1][1]),
				) as WorkspaceSchema;
				stranger.id = "team_gone";
				again = [...first, ["gone.json", stranger]];
			} else if (cause === "missing-target") {
				const b = first[1][1];
				b.boundedcontexts.ghost = { name: "Ghost", description: "" };
				b.relationships.push({
					type: "upstream-downstream",
					upstream: { $ref: "#/boundedcontexts/ledger" },
					downstream: { $ref: "#/boundedcontexts/ghost" },
					description: "",
				} as never);
			} else {
				account(first[0][1]).consumes[0].relationship = { $ref: FIXED };
			}
			const second = WorkspaceSet.fromSchemas(again);
			const a = second.byPath("a.json") as Workspace;
			expect(a.unresolved).toEqual([]);
			const [one, two] = a.getAggregateByRefOrThrow(
				`#/${ACCOUNT}`,
			).consumptions;
			expect(one.relationship).toBeDefined();
			expect(two.relationship).toBeDefined();
			expect(one.unresolvedWrites.one("relationship")).toBeUndefined();
			const dumped = filesOf(second);
			const [target] = written(dumped[0][1]) as Array<{ $ref: string }>;
			const resolution = second.resolve(a, target.$ref, REF_KINDS.relationship);
			expect(resolution.ok && resolution.target).toBe(one.relationship);
		});
	});

	it("keeps two consumptions of one operation apart when their agreements differ", () => {
		const files = siblings(BAD["missing-file"], BAD["wrong-kind"]);
		const consumes = account(files[0][1]).consumes;
		consumes[1].consumable = consumes[0].consumable;
		consumes[1].by = [{ $ref: `#/${POST}` }];
		const dumped = filesOf(WorkspaceSet.fromSchemas(files));
		expect(written(dumped[0][1])).toEqual([
			{ $ref: BAD["missing-file"] },
			{ $ref: BAD["wrong-kind"] },
		]);
	});

	it("keeps a ref a workspace loaded alone cannot reach", () => {
		const [a] = siblings(BAD["missing-file"], BAD["missing-file"]);
		const alone = Workspace.fromSchema(a[1]);
		expect(written(alone.toSchema() as WorkspaceSchema)).toEqual([
			{ $ref: BAD["missing-file"] },
			{ $ref: BAD["missing-file"] },
		]);
	});

	describe.each([
		["missing-target", "#/relationships/ledger/upstream-downstream/ghost"],
		["wrong-kind", "#/boundedcontexts/ledger"],
	] as const)("a local ref with %s", (_cause, local) => {
		it("is reported and kept by a save, across a reload, beside a sibling", () => {
			const set = WorkspaceSet.fromSchemas(siblings(local, FIXED));
			const records = set
				.byPath("a.json")
				?.unresolved.filter((it) => it.field === "relationship");
			expect(records).toHaveLength(1);
			expect(records?.[0]).toMatchObject({ target: local });
			const dumped = filesOf(set);
			expect(written(dumped[0][1])).toEqual([{ $ref: local }, { $ref: FIXED }]);
			const again = filesOf(WorkspaceSet.fromSchemas(dumped));
			expect(JSON.stringify(again)).toBe(JSON.stringify(dumped));
			expect(
				WorkspaceSet.fromSchemas(again)
					.byPath("a.json")
					?.unresolved.filter((it) => it.target === local),
			).toHaveLength(1);
		});
	});

	it("keeps two local refs apart rather than aliasing them", () => {
		const ghost = "#/relationships/ledger/upstream-downstream/ghost";
		const kind = "#/boundedcontexts/ledger";
		const dumped = filesOf(WorkspaceSet.fromSchemas(siblings(ghost, kind)));
		expect(written(dumped[0][1])).toEqual([{ $ref: ghost }, { $ref: kind }]);
	});

	it("resolves a local ref kept on save once the agreement exists", () => {
		const ghost = "#/relationships/ledger/upstream-downstream/ghost";
		const first = filesOf(WorkspaceSet.fromSchemas(siblings(ghost, FIXED)));
		const a = first[0][1];
		a.boundedcontexts.ghost = { name: "Ghost", description: "" };
		a.relationships.push({
			type: "upstream-downstream",
			upstream: { $ref: "#/boundedcontexts/ledger" },
			downstream: { $ref: "#/boundedcontexts/ghost" },
			description: "",
		} as never);
		const second = WorkspaceSet.fromSchemas(first);
		const ws = second.byPath("a.json") as Workspace;
		expect(ws.unresolved.filter((it) => it.target === ghost)).toEqual([]);
		const [one] = ws.getAggregateByRefOrThrow(`#/${ACCOUNT}`).consumptions;
		expect(one.relationship).toBeDefined();
	});

	it("does not call the ref an unknown field", () => {
		const set = WorkspaceSet.fromSchemas(
			siblings(BAD["missing-target"], FIXED),
		);
		expect(set.validate().filter((d) => d.rule === "unknown-field")).toEqual(
			[],
		);
	});
});
