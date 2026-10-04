import { describe, expect, it } from "vitest";
import { filesOf, linkedPair } from "./linked-fixture";
import type { WorkspaceSchema } from "./schema";
import type { Workspace } from "./workspace";
import { WorkspaceSet } from "./workspace-set";

/** Reads a dotted path out of plain JSON; ids in the fixture hold no dot. */
function at(schema: unknown, path: string): unknown {
	return path
		.split(".")
		.reduce<unknown>((value, key) => (value as never)?.[key], schema);
}

const LEDGER = "boundedcontexts/ledger";
const ROOT = `${LEDGER}/aggregates/account/entities/account`;
const POSTED = `${LEDGER}/services/payments/provides/posted`;
const POST = `${LEDGER}/services/payments/provides/post`;

type Carrier = {
	/** Which of the 27 `$ref` fields of the metamodel this row is. */
	field: string;
	/** Where file A writes it. */
	path: string;
	/** What A writes, relative to A. */
	written: string;
	/** What A's loaded element links to, and the element of B it must be. */
	linked(a: Workspace): unknown;
	expected(b: Workspace): unknown;
	/** The operation exists only in B, so there is no same-id twin in A to confuse it with. */
	onlyInB?: boolean;
};

const ACCOUNT = `${LEDGER}/aggregates/account`;
/** The same location as a dotted path into JSON. */
const DOTTED = ACCOUNT.replace(/\//g, ".");
const entity = (w: Workspace, id: string) =>
	w.getEntityByRefOrThrow(`#/${ACCOUNT}/entities/${id}`);

/**
 * All 27 carriers: A's file names an element of B whose every local id is also
 * an id in A, so a link that fell back to A would still find something.
 */
const CARRIERS: Carrier[] = [
	{
		field: "attribute.valueobject",
		path: `${DOTTED}.entities.line.attributes.amount.valueobject`,
		written: `b.json#/${LEDGER}/valueobjects/money`,
		linked: (a) => entity(a, "line").attributes.get("amount")?.valueobject,
		expected: (b) =>
			b.getValueObjectByRefOrThrow(`#/${LEDGER}/valueobjects/money`),
	},
	{
		field: "attribute.schema",
		path: `${DOTTED}.entities.line.attributes.doc.schema`,
		written: `b.json#/${LEDGER}/schemas/receipt`,
		linked: (a) => entity(a, "line").attributes.get("doc")?.schema,
		expected: (b) => b.getSchemaByRefOrThrow(`#/${LEDGER}/schemas/receipt`),
	},
	{
		field: "attribute.identifies",
		path: `${DOTTED}.entities.line.attributes.owner.identifies`,
		written: `b.json#/${ROOT}`,
		linked: (a) => entity(a, "line").attributes.get("owner")?.identifies,
		expected: (b) => entity(b, "account"),
	},
	{
		field: "glossary.embodiedBy",
		path: "boundedcontexts.ledger.glossary.elsewhere.embodiedBy",
		written: `b.json#/${ROOT}`,
		linked: (a) =>
			a.getTermByRefOrThrow(`#/${LEDGER}/glossary/elsewhere`).embodiedBy,
		expected: (b) => entity(b, "account"),
	},
	{
		field: "policy.on",
		path: "boundedcontexts.risk.policies.react.on.0",
		written: `b.json#/${POSTED}`,
		linked: (a) =>
			a.getPolicyByRefOrThrow("#/boundedcontexts/risk/policies/react")
				.events[0],
		expected: (b) => b.getConsumableByRefOrThrow(`#/${POSTED}`),
	},
	{
		field: "policy.on (a refusal answer of a schema of A)",
		path: "boundedcontexts.risk.policies.react.on.1",
		written: `b.json#/${LEDGER}/services/payments/provides/cross/rejects-in/a.json/ledger/decline`,
		linked: (a) =>
			a.getPolicyByRefOrThrow("#/boundedcontexts/risk/policies/react")
				.events[1],
		expected: (b) => {
			const a = b.set?.byPath("a.json") as Workspace;
			return b
				.getConsumableByRefOrThrow(
					`#/${LEDGER}/services/payments/provides/cross`,
				)
				.rejected(a.getSchemaByRefOrThrow(`#/${LEDGER}/schemas/decline`));
		},
		onlyInB: true,
	},
	{
		field: "policy.then",
		path: "boundedcontexts.risk.policies.react.then.0",
		written: `b.json#/${POST}`,
		linked: (a) =>
			a.getPolicyByRefOrThrow("#/boundedcontexts/risk/policies/react")
				.commands[0],
		expected: (b) => b.getConsumableByRefOrThrow(`#/${POST}`),
	},
	{
		field: "deadline.from",
		path: "boundedcontexts.risk.processes.settle.deadlines.soon.from",
		written: `b.json#/${POSTED}`,
		linked: (a) =>
			a.getDeadlineByRefOrThrow(
				"#/boundedcontexts/risk/processes/settle/deadlines/soon",
			).from,
		expected: (b) => b.getConsumableByRefOrThrow(`#/${POSTED}`),
	},
	{
		field: "process.starts",
		path: "boundedcontexts.risk.processes.settle.starts.0",
		written: `b.json#/${POSTED}`,
		linked: (a) =>
			a.getProcessByRefOrThrow("#/boundedcontexts/risk/processes/settle")
				.startEvents[0],
		expected: (b) => b.getConsumableByRefOrThrow(`#/${POSTED}`),
	},
	{
		field: "process.on",
		path: "boundedcontexts.risk.processes.settle.on.0",
		written: `b.json#/${POSTED}`,
		linked: (a) =>
			a.getProcessByRefOrThrow("#/boundedcontexts/risk/processes/settle")
				.events[0],
		expected: (b) => b.getConsumableByRefOrThrow(`#/${POSTED}`),
	},
	{
		field: "process.then",
		path: "boundedcontexts.risk.processes.settle.then.0",
		written: `b.json#/${POST}`,
		linked: (a) =>
			a.getProcessByRefOrThrow("#/boundedcontexts/risk/processes/settle")
				.commands[0],
		expected: (b) => b.getConsumableByRefOrThrow(`#/${POST}`),
	},
	{
		field: "process.ends",
		path: "boundedcontexts.risk.processes.settle.ends.0",
		written: `b.json#/${POST}/rejects/ledger/decline`,
		linked: (a) =>
			a.getProcessByRefOrThrow("#/boundedcontexts/risk/processes/settle")
				.endEvents[0],
		expected: (b) =>
			b
				.getConsumableByRefOrThrow(`#/${POST}`)
				.rejected(b.getSchemaByRefOrThrow(`#/${LEDGER}/schemas/decline`)),
	},
	{
		field: "context.subdomains",
		path: "boundedcontexts.risk.subdomains.1",
		written: "b.json#/domains/bank/subdomains/core",
		linked: (a) =>
			[
				...a.getBoundedContextByRefOrThrow("#/boundedcontexts/risk").subdomains,
			][1],
		expected: (b) =>
			b.getSubdomainByRefOrThrow("#/domains/bank/subdomains/core"),
	},
	{
		field: "context.team",
		path: "boundedcontexts.risk.team",
		written: "b.json#/teams/platform",
		linked: (a) =>
			a.getBoundedContextByRefOrThrow("#/boundedcontexts/risk").team,
		expected: (b) => b.getTeamByRefOrThrow("#/teams/platform"),
	},
	{
		field: "consumable.schema",
		path: "boundedcontexts.ledger.services.payments.provides.fx.schema",
		written: `b.json#/${LEDGER}/schemas/receipt`,
		linked: (a) =>
			a.getConsumableByRefOrThrow(`#/${LEDGER}/services/payments/provides/fx`)
				.schema,
		expected: (b) => b.getSchemaByRefOrThrow(`#/${LEDGER}/schemas/receipt`),
	},
	{
		field: "consumable.returns",
		path: "boundedcontexts.ledger.services.payments.provides.fx.returns",
		written: `b.json#/${LEDGER}/schemas/receipt`,
		linked: (a) =>
			a.getConsumableByRefOrThrow(`#/${LEDGER}/services/payments/provides/fx`)
				.returns,
		expected: (b) => b.getSchemaByRefOrThrow(`#/${LEDGER}/schemas/receipt`),
	},
	{
		field: "consumable.rejects",
		path: "boundedcontexts.ledger.services.payments.provides.fx.rejects.0",
		written: `b.json#/${LEDGER}/schemas/decline`,
		linked: (a) =>
			a.getConsumableByRefOrThrow(`#/${LEDGER}/services/payments/provides/fx`)
				.rejections[0].schema,
		expected: (b) => b.getSchemaByRefOrThrow(`#/${LEDGER}/schemas/decline`),
	},
	{
		field: "consumable.raises",
		path: "boundedcontexts.ledger.services.payments.provides.fx.raises.0",
		written: `b.json#/${POSTED}`,
		linked: (a) =>
			a.getConsumableByRefOrThrow(`#/${LEDGER}/services/payments/provides/fx`)
				.raisedEvents[0],
		expected: (b) => b.getConsumableByRefOrThrow(`#/${POSTED}`),
	},
	{
		field: "consumption.consumable",
		path: `${DOTTED}.consumes.0.consumable`,
		written: `b.json#/${POST}`,
		linked: (a) =>
			a.getAggregateByRefOrThrow(`#/${ACCOUNT}`).consumptions[0].consumable,
		expected: (b) => b.getConsumableByRefOrThrow(`#/${POST}`),
	},
	{
		field: "consumption.by",
		path: `${DOTTED}.consumes.0.by.0`,
		written: `b.json#/${POST}`,
		linked: (a) =>
			a.getAggregateByRefOrThrow(`#/${ACCOUNT}`).consumptions[0].by[0],
		expected: (b) => b.getConsumableByRefOrThrow(`#/${POST}`),
	},
	{
		field: "consumption.relationship",
		path: `${DOTTED}.consumes.0.relationship`,
		written: "b.json#/relationships/ledger/upstream-downstream/risk",
		linked: (a) =>
			a.getAggregateByRefOrThrow(`#/${ACCOUNT}`).consumptions[0].relationship,
		expected: (b) =>
			b.findRelationship("#/relationships/ledger/upstream-downstream/risk"),
	},
	{
		field: "relationship.upstream",
		path: "relationships.2.upstream",
		written: "b.json#/boundedcontexts/risk",
		linked: (a) => a.relationships[2].source,
		expected: (b) => b.getBoundedContextByRefOrThrow("#/boundedcontexts/risk"),
	},
	{
		field: "relationship.downstream",
		path: "relationships.1.downstream",
		written: "b.json#/boundedcontexts/ledger",
		linked: (a) => a.relationships[1].target,
		expected: (b) =>
			b.getBoundedContextByRefOrThrow("#/boundedcontexts/ledger"),
	},
	{
		field: "relationship.participants",
		path: "relationships.3.participants.1",
		written: "b.json#/boundedcontexts/risk",
		linked: (a) => a.relationships[3].target,
		expected: (b) => b.getBoundedContextByRefOrThrow("#/boundedcontexts/risk"),
	},
	{
		field: "entity.specialises",
		path: `${DOTTED}.entities.kind.specialises`,
		written: `b.json#/${ROOT}`,
		linked: (a) => entity(a, "kind").specialises,
		expected: (b) => entity(b, "account"),
	},
	{
		field: "relation.target",
		path: `${DOTTED}.entities.line.relations.0.target`,
		written: `b.json#/${ROOT}`,
		linked: (a) => entity(a, "line").relations[0].target,
		expected: (b) => entity(b, "account"),
	},
	{
		field: "invariant.constrains",
		path: `${DOTTED}.invariants.balanced.constrains.0`,
		written: `b.json#/${ROOT}/attributes/id`,
		linked: (a) =>
			a.getInvariantByRefOrThrow(`#/${ACCOUNT}/invariants/balanced`).targets[0],
		expected: (b) => b.getAttributeByRefOrThrow(`#/${ROOT}/attributes/id`),
	},
	{
		field: "valueobject.specialises",
		path: "boundedcontexts.ledger.valueobjects.fiat.specialises",
		written: `b.json#/${LEDGER}/valueobjects/money`,
		linked: (a) =>
			a.getValueObjectByRefOrThrow(`#/${LEDGER}/valueobjects/fiat`).specialises,
		expected: (b) =>
			b.getValueObjectByRefOrThrow(`#/${LEDGER}/valueobjects/money`),
	},
];

describe("linked JSON: every carrier names a file", () => {
	// The 27 fields of the metamodel; `policy.on` is checked for an event and for
	// the composite answer ref of a refusal with a schema of another file.
	it("covers all 27 carrier fields", () => {
		const fields = new Set(CARRIERS.map((it) => it.field.split(" ")[0]));
		expect(fields.size).toBe(27);
	});

	describe.each(CARRIERS)("$field", (carrier) => {
		it("is written as the relative file-qualified ref, and read back as the other file's own object", () => {
			const { set } = linkedPair();
			const files = filesOf(set);
			expect(at(files[0][1], carrier.path)).toEqual({ $ref: carrier.written });

			const loaded = WorkspaceSet.fromSchemas(files);
			const a = loaded.byPath("a.json") as Workspace;
			const b = loaded.byPath("b.json") as Workspace;
			const target = carrier.linked(a);
			expect(target).toBeDefined();
			expect(target).toBe(carrier.expected(b));
			// Ids repeat across the two files: the link must be to B's, not A's.
			if (!carrier.onlyInB) expect(target).not.toBe(carrier.expected(a));
		});
	});

	it("loads the whole linked pair with no unresolved ref and no unknown field", () => {
		const loaded = WorkspaceSet.fromSchemas(filesOf(linkedPair().set));
		expect(
			loaded
				.validate()
				.filter((d) =>
					["unresolved-ref", "unknown-field", "ods-version"].includes(d.rule),
				),
		).toEqual([]);
		expect(loaded.rejected).toEqual([]);
	});
});

describe("linked JSON: dump, load and dump again", () => {
	it("is idempotent from the DSL, through JSON text, and through a second load", () => {
		const { set } = linkedPair();
		const first = filesOf(set);
		const text = JSON.stringify(first);
		const loaded = WorkspaceSet.fromSchemas(JSON.parse(text));
		const second = filesOf(loaded);
		expect(second).toEqual(first);
		expect(JSON.stringify(second)).toBe(text);
		const third = filesOf(WorkspaceSet.fromSchemas(second));
		expect(JSON.stringify(third)).toBe(text);
	});

	it("keeps the files in the order given and never sorts them", () => {
		const first = filesOf(linkedPair().set);
		const reversed = [...first].reverse();
		const loaded = WorkspaceSet.fromSchemas(reversed);
		expect(loaded.workspaces.map((it) => it.file)).toEqual([
			"b.json",
			"a.json",
		]);
		expect([...loaded.toSchemas().keys()]).toEqual(["b.json", "a.json"]);
	});

	it("two workspaces with the same local ids stay two sets of distinct objects", () => {
		const loaded = WorkspaceSet.fromSchemas(filesOf(linkedPair().set));
		const a = loaded.byPath("a.json") as Workspace;
		const b = loaded.byPath("b.json") as Workspace;
		const ledgerA = a.getBoundedContextByRefOrThrow("#/boundedcontexts/ledger");
		const ledgerB = b.getBoundedContextByRefOrThrow("#/boundedcontexts/ledger");
		expect(ledgerA).not.toBe(ledgerB);
		expect(ledgerA.ref).toBe(ledgerB.ref);
		expect(a.id).not.toBe(b.id);
	});

	it("reads the same file text as the DSL set it was dumped from, element for element", () => {
		const dsl = linkedPair().set;
		const loaded = WorkspaceSet.fromSchemas(filesOf(dsl));
		// The cross-file consumption, relationship and answer identities agree
		// between the DSL objects and the loaded ones.
		const refs = (set: WorkspaceSet) =>
			set.workspaces.map((w) => ({
				relationships: w.relationships.map((r) => r.ref),
				consumptions: w
					.getAggregateByRefOrThrow(`#/${ACCOUNT}`)
					.consumptions.map((c) => c.ref),
			}));
		expect(refs(loaded)).toEqual(refs(dsl));
	});
});

describe("linked JSON: a model mistake is a diagnostic, never a throw", () => {
	function load(edit: (a: WorkspaceSchema, b: WorkspaceSchema) => void) {
		const files = filesOf(linkedPair().set);
		edit(files[0][1], files[1][1]);
		return WorkspaceSet.fromSchemas(files);
	}
	const unresolved = (set: WorkspaceSet) =>
		set.validate().filter((d) => d.rule === "unresolved-ref");

	it("reports a ref to a file that is not in the set as missing-file, at the file that wrote it", () => {
		const set = load((a) => {
			(a.boundedcontexts.risk.team as { $ref: string }).$ref =
				"gone.json#/teams/platform";
		});
		const found = unresolved(set);
		expect(found).toHaveLength(1);
		expect(found[0]).toMatchObject({
			file: "a.json",
			severity: "error",
			ref: "#/boundedcontexts/risk",
		});
		expect(found[0].message).toContain('"gone.json#/teams/platform"');
		expect(found[0].message).toContain('in "team"');
		expect(found[0].message).toContain("gone.json is not a workspace file");
		expect(set.byPath("a.json")?.unresolved[0]).toMatchObject({
			cause: "missing-file",
			file: "gone.json",
		});
	});

	it("reports a missing pointer in a file that is there as missing-target and names the file", () => {
		const set = load((a) => {
			(a.boundedcontexts.risk.team as { $ref: string }).$ref =
				"b.json#/teams/nobody";
		});
		const found = unresolved(set);
		expect(found).toHaveLength(1);
		expect(found[0].file).toBe("a.json");
		expect(found[0].message).toContain("b.json has nothing at that ref");
		expect(set.byPath("a.json")?.unresolved[0].cause).toBe("missing-target");
	});

	it("reports the wrong kind of target as wrong-kind, in the file it is in", () => {
		const set = load((a) => {
			(a.boundedcontexts.risk.team as { $ref: string }).$ref =
				"b.json#/boundedcontexts/ledger";
		});
		const found = unresolved(set);
		expect(found).toHaveLength(1);
		expect(found[0].message).toContain("which is in b.json but is not a team");
		expect(set.byPath("a.json")?.unresolved[0].cause).toBe("wrong-kind");
	});

	it.each([
		["/abs.json#/teams/platform", "absolute"],
		["../../out.json#/teams/platform", "escapes-root"],
		["b.txt#/teams/platform", "not-json"],
		["b%zz.json#/teams/platform", "malformed-percent"],
		["b.json#teams", "malformed-pointer"],
	])("reports %s as an invalid path (%s) without throwing", (written) => {
		const set = load((a) => {
			(a.boundedcontexts.risk.team as { $ref: string }).$ref = written;
		});
		const found = unresolved(set);
		expect(found).toHaveLength(1);
		expect(found[0].file).toBe("a.json");
		expect(found[0].message).toContain("not a usable path");
		expect(set.byPath("a.json")?.unresolved[0].cause).toBe("invalid-path");
	});

	it("never reads a fragment in another file: a local ref that only B satisfies is unresolved in A", () => {
		const set = load((a, b) => {
			b.teams.extra = { name: "Extra" };
			(a.boundedcontexts.risk.team as { $ref: string }).$ref = "#/teams/extra";
		});
		const found = unresolved(set);
		expect(found).toHaveLength(1);
		expect(found[0]).toMatchObject({ file: "a.json" });
		expect(found[0].message).toContain(
			"nothing in this workspace has that ref",
		);
		// The existing words and the existing record, unchanged for a local ref.
		const record = set.byPath("a.json")?.unresolved[0];
		expect(record).toEqual({
			ref: "#/boundedcontexts/risk",
			owner: 'Bounded context "Risk"',
			field: "team",
			where: undefined,
			target: "#/teams/extra",
			expected: "a team of this workspace",
			present: false,
		});
	});

	it("keeps a ref it cannot resolve as written, so a save does not repair it silently", () => {
		const set = load((a) => {
			(a.boundedcontexts.risk.team as { $ref: string }).$ref =
				"gone.json#/teams/platform";
		});
		const dumped = set.toSchemas().get("a.json") as WorkspaceSchema;
		expect(dumped.boundedcontexts.risk.team).toEqual({
			$ref: "gone.json#/teams/platform",
		});
	});

	it.each([["garbage"], ["#teams/platform"], ["#"]])(
		"a ref that is not a pointer at all (%s) keeps the local words and the local cost",
		(written) => {
			const set = load((a) => {
				(a.boundedcontexts.risk.team as { $ref: string }).$ref = written;
			});
			const found = unresolved(set);
			expect(found).toHaveLength(1);
			expect(found[0].message).toContain(
				"nothing in this workspace has that ref",
			);
			const record = set.byPath("a.json")?.unresolved[0];
			expect(record?.cause).toBeUndefined();
			expect(record?.present).toBe(false);
		},
	);

	it("a relationship neither of whose ends resolves is reported at its place in the file when they name files, and at the ref written when they do not", () => {
		const set = load((a) => {
			a.relationships.push({
				type: "upstream-downstream",
				upstream: { $ref: "gone.json#/boundedcontexts/ledger" },
				downstream: { $ref: "gone.json#/boundedcontexts/risk" },
				upstreamRoles: [],
				downstreamRoles: [],
				description: "",
			});
			a.relationships.push({
				type: "upstream-downstream",
				upstream: { $ref: "#/boundedcontexts/ghost" },
				downstream: { $ref: "#/boundedcontexts/phantom" },
				upstreamRoles: [],
				downstreamRoles: [],
				description: "",
			});
		});
		const found = unresolved(set).filter((d) => d.file === "a.json");
		const inFile = found.filter((d) => d.ref === "#/relationships/5");
		expect(inFile).toHaveLength(2);
		expect(found.some((d) => d.ref === "#/boundedcontexts/ghost")).toBe(true);
	});

	it("loads files it may not change: the host's text is read, never written to", () => {
		const files = filesOf(linkedPair().set);
		const freeze = (value: unknown): void => {
			if (typeof value !== "object" || value === null) return;
			Object.freeze(value);
			for (const inner of Object.values(value)) freeze(inner);
		};
		for (const [, schema] of files) freeze(schema);
		const before = JSON.stringify(files);
		const loaded = WorkspaceSet.fromSchemas(files);
		expect(JSON.stringify(files)).toBe(before);
		expect(JSON.stringify([...loaded.toSchemas()])).toBe(JSON.stringify(files));
	});
});
