import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	DataSchema,
	encodeRefSegment,
	identityKeyOf,
	ODSConsumableMap,
	ODSContextMap,
	ODSFlowMap,
	ODSRelationMap,
	setKeyOf,
	usersOfSchema,
	usersOfValueObject,
	ValueObject,
	Workspace,
	WorkspaceSet,
} from "@open-domain-specification/core";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
	consumersByProvider,
	contextIdOf,
	D5_OVERRIDES,
	deriveAssignment,
	expectedAssignment,
	FIXTURE_SHA256,
	fileOfEntry,
	fixtureJson,
	fixtureSha256,
	isSubsequence,
	type Json,
	leaves,
	listings,
	loadMonolith,
	loadSet,
	monolithSchema,
	normalise,
	ODS_DIR,
	readGenerated,
	relationshipKey,
	relationshipsOf,
	SECTIONS,
	sectionOf,
	stripFiles,
} from "./equivalence.support.ts";
import { buildNorthbankSet, OUTPUT, teams } from "./northbank-set.ts";

/*
 * Is the twelve-file NorthBank the model it was? The old single workspace is
 * the frozen fixture; the set is built by the team DSL modules, written by the
 * build, and loaded back from the files it wrote. Everything is compared by
 * what an element is (its file-independent pointer) and in the order it is
 * listed, never sorted to make it match.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = monolithSchema() as unknown as { [key: string]: Json };
const assignment = expectedAssignment(schema);
const built = buildNorthbankSet();
// The DSL's schemas as JSON: what the file would hold, without keys set to undefined.
const builtFiles = new Map<string, Json>(
	[...built.toSchemas()].map(([file, schema]) => [
		file,
		JSON.parse(JSON.stringify(schema)) as Json,
	]),
);
const generated = readGenerated();
const reloaded = loadSet(generated);
const monolith = loadMonolith();

/** The old pinned diagnostics, as `models/northbank` has carried them since card 104. */
const PINS_BEFORE = [
	{
		rule: "separate-ways",
		severity: "error",
		ref: "#/boundedcontexts/branch_&_contact_centre/services/channels_app",
		message:
			'"Branch & Contact Centre" consumes "Decide" from "Credit Decisioning" although the contexts declare separate ways',
	},
	{
		rule: "consumable-kind",
		severity: "error",
		ref: "#/boundedcontexts/lending/policies/escalate_arrears",
		message:
			'Policy "Escalate arrears" issues "ArrearsNoticeIssued", which is an event, not an operation',
	},
	{
		rule: "context-serves-subdomain",
		severity: "warning",
		ref: "#/boundedcontexts/identity_&_access",
		message:
			'Bounded context "Identity & Access" serves no subdomain, so it is missing from the problem-space view',
	},
];

/** Where each pin lands: the file of the element it is about. */
const PIN_FILES = ["channels.json", "lending.json", "digital_platform.json"];

describe("the frozen single workspace", () => {
	it("is the bytes the old build wrote, by sha256", () => {
		expect(fixtureSha256()).toBe(FIXTURE_SHA256);
	});

	it("loads as one workspace with the facts the contract measured", () => {
		expect(monolith.id).toBe("northbank");
		expect(monolith.boundedcontexts.size).toBe(19);
		expect(monolith.teams.size).toBe(12);
		expect(monolith.domains.size).toBe(6);
		expect(monolith.relationships).toHaveLength(34);
		const external = [...monolith.boundedcontexts.values()].filter(
			(bc) => bc.external,
		);
		expect(external).toHaveLength(5);
		const { $schema: _header, ...rest } = fixtureJson();
		expect(monolith.toSchema()).toEqual(rest);
	});

	it("carries exactly the three pinned diagnostics, which is what the set must carry too", () => {
		expect(monolith.validate()).toEqual(PINS_BEFORE);
	});
});

describe("the assignment of elements to the twelve files", () => {
	it("is the stated rule applied to the monolith, with one chosen exception", () => {
		const rule = deriveAssignment(schema);
		expect(rule.contexts.iso_13616).toBe("accounts.json");
		expect(D5_OVERRIDES).toEqual({ iso_13616: "payments.json" });
		const differing = Object.keys(rule.contexts).filter(
			(id) => rule.contexts[id] !== assignment.contexts[id],
		);
		expect(differing).toEqual(["iso_13616"]);
		// Where the relationships live does not depend on the choice.
		expect(assignment.relationships).toEqual(rule.relationships);
	});

	it("is where the twelve files actually put them", () => {
		for (const [file, written] of builtFiles) {
			const w = written as { [key: string]: Json };
			expect(Object.keys(sectionOf(w, "boundedcontexts")), file).toEqual(
				Object.entries(assignment.contexts)
					.filter(([, f]) => f === file)
					.map(([id]) => id)
					.sort(
						(a, b) =>
							Object.keys(sectionOf(schema, "boundedcontexts")).indexOf(a) -
							Object.keys(sectionOf(schema, "boundedcontexts")).indexOf(b),
					),
			);
			expect(Object.keys(sectionOf(w, "teams")), file).toEqual(
				Object.entries(assignment.teams)
					.filter(([, f]) => f === file)
					.map(([id]) => id),
			);
			expect(Object.keys(sectionOf(w, "domains")), file).toEqual(
				Object.entries(assignment.domains)
					.filter(([, f]) => f === file)
					.map(([id]) => id),
			);
			expect(relationshipsOf(w).map(relationshipKey), file).toEqual(
				relationshipsOf(schema)
					.map(relationshipKey)
					.filter((k) => assignment.relationships[k] === file),
			);
		}
	});

	it("puts iso_13616 in payments.json, and the choice does not change which relationships cross files", () => {
		const cross = (assigned: Record<string, string>) =>
			relationshipsOf(schema).filter((r) => {
				const ends = r.participants
					? r.participants.map((p) => contextIdOf(p.$ref))
					: [r.upstream, r.downstream].map((e) =>
							contextIdOf((e as { $ref: string }).$ref),
						);
				return new Set(ends.map((id) => assigned[id])).size > 1;
			}).length;
		const rule = deriveAssignment(schema);
		expect(cross(assignment.contexts)).toBe(28);
		expect(cross(rule.contexts)).toBe(28);
		// Two relationships end at iso_13616: one local to Payments, one crossing
		// to Accounts. Chosen the other way the roles swap and the count stays.
		const iso = relationshipsOf(schema).filter(
			(r) => r.upstream && contextIdOf(r.upstream.$ref) === "iso_13616",
		);
		expect(
			iso.map((r) => contextIdOf((r.downstream as { $ref: string }).$ref)),
		).toEqual(["accounts", "payments_hub"]);
		expect(
			iso.map(
				(r) =>
					assignment.contexts[
						contextIdOf((r.downstream as { $ref: string }).$ref)
					],
			),
		).toEqual(["accounts.json", "payments.json"]);
	});

	it("is twelve complete workspaces, one per team, each with its own id", () => {
		expect(OUTPUT.files).toEqual(teams.map((t) => t.FILE));
		expect(new Set(OUTPUT.files).size).toBe(12);
		const ids = built.workspaces.map((w) => w.id);
		expect(new Set(ids).size).toBe(12);
		expect(ids).toEqual(
			OUTPUT.files.map((f) => `northbank_${f.replace(/\.json$/, "")}`),
		);
		for (const w of built.workspaces) {
			expect(w.teams.size, w.file).toBe(1);
			expect(w.boundedcontexts.size, w.file).toBeGreaterThanOrEqual(1);
			expect(w.file).toBe(
				`${[...w.teams.keys()][0].replace(/_team$/, "")}.json`,
			);
		}
		// Teams, domains and contexts: all 12 + 6 + 19, none twice.
		expect(built.workspaces.flatMap((w) => [...w.teams.keys()])).toHaveLength(
			12,
		);
		expect(built.workspaces.flatMap((w) => [...w.domains.keys()])).toHaveLength(
			6,
		);
		expect(
			built.workspaces.flatMap((w) => [...w.boundedcontexts.keys()]),
		).toHaveLength(19);
	});

	it("loads each file alone and writes it back unchanged", () => {
		for (const [file, written] of generated) {
			const alone = loadSet([[file, written]]);
			// Alone, every qualified ref names a file that is not there: it is
			// kept raw and written back, not dropped.
			expect(alone.toSchemas().get(file), file).toEqual(written);
		}
	});
});

describe("the monolith's content, element by element, in the twelve files", () => {
	const mono = schema;

	it("maps every leaf of every domain, context and team to exactly one leaf of one file, with the same value", () => {
		const expected = new Map<string, Json>();
		for (const section of SECTIONS)
			for (const [id, value] of Object.entries(sectionOf(mono, section)))
				leaves(normalise(value), [section, id], expected);
		const actual = new Map<string, { file: string; value: Json }>();
		const duplicates: string[] = [];
		for (const [file, written] of builtFiles) {
			for (const section of SECTIONS)
				for (const [id, value] of Object.entries(
					sectionOf(written as { [key: string]: Json }, section),
				)) {
					for (const [key, leaf] of leaves(normalise(value), [section, id])) {
						if (actual.has(key)) duplicates.push(key);
						actual.set(key, { file, value: leaf });
					}
				}
		}
		expect(duplicates).toEqual([]);
		expect(actual.size).toBe(expected.size);
		expect(expected.size).toBe(2323);
		const missing = [...expected.keys()].filter((k) => !actual.has(k));
		const extra = [...actual.keys()].filter((k) => !expected.has(k));
		expect(missing).toEqual([]);
		expect(extra).toEqual([]);
		const changed = [...expected].filter(
			([k, v]) => actual.get(k)?.value !== v,
		);
		expect(changed).toEqual([]);
		// And each leaf is in the file the assignment gives its owner.
		for (const [key, { file }] of actual) {
			const [section, id] = JSON.parse(key) as [string, string];
			const owner =
				section === "boundedcontexts"
					? assignment.contexts[id]
					: section === "teams"
						? assignment.teams[id]
						: assignment.domains[id];
			expect(file, key).toBe(owner);
		}
	});

	it("keeps every listing in a file in the order the monolith had it", () => {
		for (const section of SECTIONS)
			for (const [id, value] of Object.entries(sectionOf(mono, section))) {
				const file = [...builtFiles].find(([, w]) =>
					Object.hasOwn(sectionOf(w as { [key: string]: Json }, section), id),
				);
				expect(file, `${section}/${id}`).toBeTruthy();
				const there = sectionOf(file?.[1] as { [key: string]: Json }, section)[
					id
				];
				// JSON.stringify keeps key order, so this compares the order of
				// every map and every array under the element, not just their content.
				expect(JSON.stringify(normalise(there)), `${section}/${id}`).toBe(
					JSON.stringify(value),
				);
			}
	});

	it("lists the contexts, teams and domains of each file as the monolith listed them", () => {
		for (const section of SECTIONS) {
			const all = Object.keys(sectionOf(mono, section));
			for (const [file, written] of builtFiles) {
				const ids = Object.keys(
					sectionOf(written as { [key: string]: Json }, section),
				);
				expect(isSubsequence(ids, all), `${file} ${section}`).toBe(true);
			}
		}
	});

	it("keeps the 34 relationships, each in its declaring file and in the monolith's relative order", () => {
		const all = relationshipsOf(mono);
		const keys = all.map(relationshipKey);
		expect(new Set(keys).size).toBe(34);
		const seen: string[] = [];
		for (const [file, written] of builtFiles) {
			const here_ = relationshipsOf(written as { [key: string]: Json });
			const hereKeys = here_.map(relationshipKey);
			expect(isSubsequence(hereKeys, keys), file).toBe(true);
			for (const r of here_) {
				seen.push(relationshipKey(r));
				const original = all.find(
					(o) => relationshipKey(o) === relationshipKey(r),
				);
				expect(
					JSON.stringify(normalise(r as unknown as Json)),
					relationshipKey(r),
				).toBe(JSON.stringify(original));
				expect(
					assignment.relationships[relationshipKey(r)],
					relationshipKey(r),
				).toBe(file);
			}
		}
		expect([...seen].sort()).toEqual([...keys].sort());
	});

	// One row per relationship: the file that declares it, its type, upstream (or
	// first participant) and downstream (or second), whether any end is in another
	// file, its roles, disposition and number of comments. The 28 crossing rows
	// are the contract's "28 of 34".
	const RELATIONSHIPS: Array<
		[
			string,
			string,
			string,
			string,
			boolean,
			string,
			string | undefined,
			number,
		]
	> = [
		[
			"customer_platform.json",
			"upstream-downstream",
			"sanctions_screening",
			"customer_&_kyc",
			true,
			"open-host-service+published-language>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"accounts.json",
			"upstream-downstream",
			"customer_&_kyc",
			"accounts",
			true,
			"published-language>conformist",
			undefined,
			0,
		],
		[
			"accounts.json",
			"upstream-downstream",
			"ledger",
			"accounts",
			true,
			"published-language>conformist",
			undefined,
			0,
		],
		[
			"accounts.json",
			"upstream-downstream",
			"fraud",
			"accounts",
			true,
			"published-language>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"accounts.json",
			"upstream-downstream",
			"cards",
			"accounts",
			true,
			"published-language>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"accounts.json",
			"shared-kernel",
			"accounts",
			"ledger",
			true,
			"",
			undefined,
			2,
		],
		[
			"accounts.json",
			"upstream-downstream",
			"iso_13616",
			"accounts",
			true,
			"published-language>conformist",
			undefined,
			0,
		],
		[
			"financial_crime.json",
			"upstream-downstream",
			"screening_vendor",
			"sanctions_screening",
			false,
			"open-host-service>conformist",
			undefined,
			0,
		],
		[
			"financial_crime.json",
			"upstream-downstream",
			"cards",
			"fraud",
			true,
			"published-language>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"core_banking.json",
			"upstream-downstream",
			"sovereign_core_(legacy)",
			"ledger",
			false,
			"published-language>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"payments.json",
			"customer-supplier",
			"ledger",
			"payments_hub",
			true,
			"open-host-service>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"payments.json",
			"customer-supplier",
			"fraud",
			"payments_hub",
			true,
			"open-host-service+published-language>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"payments.json",
			"upstream-downstream",
			"scheme_gateway",
			"payments_hub",
			true,
			"open-host-service+published-language>conformist",
			undefined,
			0,
		],
		[
			"payments.json",
			"upstream-downstream",
			"accounts",
			"payments_hub",
			true,
			"open-host-service>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"payments.json",
			"upstream-downstream",
			"iso_13616",
			"payments_hub",
			false,
			"published-language>conformist",
			undefined,
			0,
		],
		[
			"scheme_connectivity.json",
			"upstream-downstream",
			"payment_scheme",
			"scheme_gateway",
			false,
			"published-language>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"cards.json",
			"upstream-downstream",
			"card_co",
			"cards",
			false,
			"published-language>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"cards.json",
			"customer-supplier",
			"fraud",
			"cards",
			true,
			"open-host-service+published-language>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"cards.json",
			"upstream-downstream",
			"accounts",
			"cards",
			true,
			"open-host-service>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"cards.json",
			"upstream-downstream",
			"ledger",
			"cards",
			true,
			"published-language>conformist",
			undefined,
			0,
		],
		[
			"lending.json",
			"upstream-downstream",
			"customer_&_kyc",
			"lending",
			true,
			"open-host-service>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"lending.json",
			"customer-supplier",
			"ledger",
			"lending",
			true,
			"open-host-service>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"lending.json",
			"partnership",
			"lending",
			"credit_decisioning",
			true,
			"",
			undefined,
			0,
		],
		[
			"credit_risk.json",
			"upstream-downstream",
			"credit_bureau",
			"credit_decisioning",
			false,
			"open-host-service>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"credit_risk.json",
			"upstream-downstream",
			"customer_&_kyc",
			"credit_decisioning",
			true,
			"open-host-service>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"finance_systems.json",
			"upstream-downstream",
			"ledger",
			"regulatory_reporting",
			true,
			"published-language>conformist",
			undefined,
			0,
		],
		[
			"finance_systems.json",
			"upstream-downstream",
			"accounts",
			"regulatory_reporting",
			true,
			"published-language>conformist",
			undefined,
			0,
		],
		[
			"finance_systems.json",
			"upstream-downstream",
			"lending",
			"regulatory_reporting",
			true,
			"published-language>conformist",
			undefined,
			0,
		],
		[
			"finance_systems.json",
			"upstream-downstream",
			"sovereign_core_(legacy)",
			"regulatory_reporting",
			true,
			"published-language>anti-corruption-layer",
			undefined,
			0,
		],
		[
			"channels.json",
			"upstream-downstream",
			"customer_&_kyc",
			"branch_&_contact_centre",
			true,
			"open-host-service+published-language>conformist",
			undefined,
			0,
		],
		[
			"channels.json",
			"upstream-downstream",
			"accounts",
			"branch_&_contact_centre",
			true,
			"open-host-service>conformist",
			undefined,
			0,
		],
		[
			"channels.json",
			"upstream-downstream",
			"cards",
			"branch_&_contact_centre",
			true,
			"open-host-service>conformist",
			undefined,
			0,
		],
		[
			"channels.json",
			"upstream-downstream",
			"identity_&_access",
			"branch_&_contact_centre",
			true,
			"open-host-service>conformist",
			undefined,
			0,
		],
		[
			"channels.json",
			"separate-ways",
			"branch_&_contact_centre",
			"credit_decisioning",
			true,
			"",
			"refactor",
			2,
		],
	];

	it("accounts for every relationship: where it is declared, between which contexts, with which roles and disposition", () => {
		const rows: typeof RELATIONSHIPS = [];
		for (const [file, written] of generated)
			for (const r of relationshipsOf(written as { [key: string]: Json })) {
				const ends = r.participants
					? r.participants.map((p) => p.$ref)
					: [
							(r.upstream as { $ref: string }).$ref,
							(r.downstream as { $ref: string }).$ref,
						];
				const roles = r.participants
					? ""
					: `${((r.upstreamRoles ?? []) as string[]).join("+")}>${((r.downstreamRoles ?? []) as string[]).join("+")}`;
				rows.push([
					file,
					r.type,
					contextIdOf(ends[0]),
					contextIdOf(ends[1]),
					ends.some((e) => !e.startsWith("#")),
					roles,
					r.disposition as string | undefined,
					((r.comments ?? []) as unknown[]).length,
				]);
			}
		expect(rows).toEqual(RELATIONSHIPS);
		expect(rows.filter((r) => r[4])).toHaveLength(28);
		expect(rows.filter((r) => !r[4])).toHaveLength(6);
		// Each row's crossing flag is true exactly when the ends' files differ.
		for (const [, , a, b, crossing] of rows)
			expect(assignment.contexts[a] !== assignment.contexts[b]).toBe(crossing);
	});
});

describe("references", () => {
	function refs(
		value: Json,
		trail: string[] = [],
		out: Array<[string, string]> = [],
	) {
		if (Array.isArray(value))
			value.forEach((v, i) => {
				refs(v, [...trail, String(i)], out);
			});
		else if (value !== null && typeof value === "object") {
			if (typeof value.$ref === "string")
				out.push([JSON.stringify(trail), value.$ref]);
			else
				for (const [k, v] of Object.entries(value)) refs(v, [...trail, k], out);
		}
		return out;
	}

	it("writes canonical refs: local for the file's own elements, `<file>.json#...` for another's, nothing else", () => {
		let local = 0;
		let crossing = 0;
		for (const [file, written] of generated) {
			for (const [, ref] of refs(written)) {
				if (ref.startsWith("#/")) {
					local++;
					continue;
				}
				crossing++;
				const [target, pointer] = ref.split("#");
				expect(OUTPUT.files, `${file} ${ref}`).toContain(target);
				expect(target, `${file} ${ref}`).not.toBe(file);
				expect(pointer.startsWith("/"), ref).toBe(true);
				expect(ref).not.toMatch(/\.\.|\.\//);
			}
		}
		expect(crossing).toBe(128);
		expect(local).toBeGreaterThan(crossing);
	});

	it("resolves every ref of the monolith to the same element, in the file the assignment gives it", () => {
		let n = 0;
		const owners = (pointer: string): string => {
			const [, section, id] = pointer.split("/");
			const decoded = decodeURIComponent(id);
			const unesc = decoded.replace(/~1/g, "/").replace(/~0/g, "~");
			return section === "boundedcontexts"
				? assignment.contexts[unesc]
				: section === "domains"
					? assignment.domains[unesc]
					: assignment.teams[unesc];
		};
		const originals = [...SECTIONS].flatMap((section) =>
			Object.entries(sectionOf(schema, section)).flatMap(([id, value]) =>
				refs(value as Json).map(([trail, ref]) => ({
					section,
					id,
					trail,
					ref,
				})),
			),
		);
		// What the set writes, per element and trail.
		const written = new Map<string, string>();
		for (const [, w] of generated)
			for (const section of SECTIONS)
				for (const [id, value] of Object.entries(
					sectionOf(w as { [key: string]: Json }, section),
				))
					for (const [trail, ref] of refs(value as Json))
						written.set(`${section}/${id}/${trail}`, ref);
		for (const { section, id, trail, ref } of originals) {
			const there = written.get(`${section}/${id}/${trail}`);
			expect(there, `${section}/${id} ${trail}`).toBeDefined();
			expect(stripFiles(there as string)).toBe(ref);
			// The ref, read in the reloaded set from its own file, is the element.
			const home = reloaded.byPath(
				(section === "boundedcontexts"
					? assignment.contexts[id]
					: section === "teams"
						? assignment.teams[id]
						: assignment.domains[id]) as string,
			) as Workspace;
			const found = reloaded.resolve(home, there as string, {
				label: "element",
				lookup: (w, pointer) => w.getByRef(pointer),
				is: (x): x is object => typeof x === "object",
			});
			expect(found.ok, `${section}/${id} ${there}`).toBe(true);
			if (found.ok) {
				expect(found.workspace.file, `${there}`).toBe(owners(ref));
				expect(setKeyOf(found.target as { ref: string }), `${there}`).toBe(
					`${owners(ref)}${ref}`,
				);
			}
			n++;
		}
		expect(n).toBe(461);
	});

	it("loses and invents nothing: every JSON object of the monolith is the same kind of element in the file that holds it", () => {
		const pointers: string[] = [];
		(function walk(value: Json, trail: string[]) {
			if (Array.isArray(value))
				value.forEach((v, i) => {
					walk(v, [...trail, String(i)]);
				});
			else if (value !== null && typeof value === "object") {
				pointers.push(`#/${trail.map(encodeRefSegment).join("/")}`);
				for (const [k, v] of Object.entries(value)) walk(v, [...trail, k]);
			}
		})(schema as Json, []);
		let kinds = 0;
		for (const pointer of pointers) {
			const [, section, id] = pointer.split("/");
			if (!id || !["boundedcontexts", "domains", "teams"].includes(section))
				continue;
			const unesc = decodeURIComponent(id)
				.replace(/~1/g, "/")
				.replace(/~0/g, "~");
			const file =
				section === "boundedcontexts"
					? assignment.contexts[unesc]
					: section === "teams"
						? assignment.teams[unesc]
						: assignment.domains[unesc];
			const before = monolith.getByRef(pointer);
			const after = (reloaded.byPath(file) as Workspace).getByRef(pointer);
			expect(after?.constructor.name, pointer).toBe(before?.constructor.name);
			if (before) kinds++;
		}
		expect(kinds).toBe(615);
	});

	// Which of the monolith's reference fields cross files in the set, and how
	// many each. A carrier row is a place a ref is written; schema, answer and
	// `rejects` carriers never cross in NorthBank because a context's schemas and
	// answers are its own, so they are not in this table (the core suite covers
	// them with constructed pairs).
	it("crosses files at the carriers it should, this many times each", () => {
		const crossing = new Map<string, number>();
		const keyed = new Set([
			"aggregates",
			"attributes",
			"entities",
			"policies",
			"processes",
			"provides",
			"schemas",
			"services",
			"valueobjects",
		]);
		const pattern = (trail: string[]) => {
			const out: string[] = [];
			for (let i = 0; i < trail.length; i++) {
				const token = trail[i];
				if (/^\d+$/.test(token)) out[out.length - 1] += "[]";
				else if (token === "boundedcontexts") i++;
				else if (keyed.has(token)) {
					out.push(token);
					i++;
				} else out.push(token);
			}
			return out.join("/");
		};
		for (const [, w] of generated)
			for (const [trail, ref] of refs(w)) {
				if (ref.startsWith("#/")) continue;
				const key = pattern(JSON.parse(trail) as string[]);
				crossing.set(key, (crossing.get(key) ?? 0) + 1);
			}
		expect(Object.fromEntries([...crossing].sort())).toEqual({
			"aggregates/entities/attributes/identifies": 10,
			"aggregates/entities/attributes/valueobject": 11,
			"policies/on[]": 12,
			"processes/on[]": 4,
			"relationships[]/participants[]": 3,
			"relationships[]/upstream": 25,
			"schemas/attributes/identifies": 16,
			"schemas/attributes/valueobject": 9,
			"services/consumes[]/consumable": 31,
			"subdomains[]": 6,
			"valueobjects/attributes/valueobject": 1,
		});
	});
});

describe("what the files hold, file by file", () => {
	const kinds = [
		"domains",
		"subdomains",
		"teams",
		"contexts",
		"aggregates",
		"entities",
		"valueobjects",
		"schemas",
		"services",
		"consumables",
		"policies",
		"processes",
		"terms",
		"invariants",
		"attributes",
		"relations",
		"consumptions",
		"relationships",
	] as const;
	function counts(w: Workspace): number[] {
		const c = Object.fromEntries(kinds.map((k) => [k, 0]));
		c.domains = w.domains.size;
		for (const d of w.domains.values()) c.subdomains += d.subdomains.size;
		c.teams = w.teams.size;
		c.contexts = w.boundedcontexts.size;
		c.relationships = w.relationships.length;
		for (const bc of w.boundedcontexts.values()) {
			c.valueobjects += bc.valueobjects.size;
			c.schemas += bc.schemas.size;
			c.services += bc.services.size;
			c.policies += bc.policies.size;
			c.processes += bc.processes.size;
			c.terms += bc.glossary.size;
			c.invariants += bc.invariants.size;
			for (const s of bc.services.values()) {
				c.consumables += s.consumables.size;
				c.consumptions += s.consumptions.length;
			}
			for (const a of bc.aggregates.values()) {
				c.aggregates++;
				c.consumables += a.consumables.size;
				c.consumptions += a.consumptions.length;
				c.invariants += a.invariants.size;
				for (const e of a.entities.values()) {
					c.entities++;
					c.attributes += e.attributes.size;
					c.relations += e.relations.length;
				}
			}
			for (const v of bc.valueobjects.values()) {
				c.attributes += v.attributes.size;
				c.relations += v.relations.length;
				c.invariants += v.invariants.size;
			}
			for (const s of bc.schemas.values()) c.attributes += s.attributes.size;
		}
		return kinds.map((k) => c[k]);
	}

	// domains, subdomains, teams, contexts, aggregates, entities, value objects,
	// schemas, services, consumables, policies, processes, terms, invariants,
	// attributes, entity relations, consumptions, relationships.
	const EXPECTED: Record<string, number[]> = {
		"customer_platform.json": [
			1, 3, 1, 1, 2, 3, 5, 4, 1, 10, 0, 1, 3, 6, 32, 7, 2, 1,
		],
		"financial_crime.json": [
			1, 3, 1, 3, 2, 3, 3, 5, 4, 9, 2, 0, 2, 2, 29, 4, 2, 2,
		],
		"accounts.json": [0, 0, 1, 1, 1, 2, 2, 4, 1, 10, 4, 0, 3, 5, 21, 3, 4, 6],
		"core_banking.json": [
			1, 3, 1, 2, 2, 3, 7, 4, 1, 5, 1, 0, 5, 4, 27, 4, 1, 1,
		],
		"payments.json": [1, 2, 1, 2, 1, 1, 4, 3, 1, 11, 0, 1, 4, 7, 22, 3, 6, 5],
		"scheme_connectivity.json": [
			0, 0, 1, 2, 1, 1, 1, 5, 2, 8, 1, 0, 0, 0, 17, 1, 3, 1,
		],
		"cards.json": [0, 0, 1, 2, 1, 2, 3, 5, 2, 5, 1, 0, 3, 4, 29, 4, 4, 4],
		"lending.json": [1, 2, 1, 1, 2, 4, 4, 2, 1, 15, 5, 0, 3, 5, 28, 7, 4, 3],
		"credit_risk.json": [0, 0, 1, 2, 1, 1, 3, 4, 3, 4, 0, 0, 2, 3, 25, 3, 3, 2],
		"finance_systems.json": [
			0, 0, 1, 1, 1, 2, 1, 0, 1, 3, 1, 0, 2, 3, 9, 2, 4, 4,
		],
		"channels.json": [0, 0, 1, 1, 1, 2, 2, 0, 1, 3, 1, 0, 4, 2, 11, 3, 6, 5],
		"digital_platform.json": [
			1, 1, 1, 1, 1, 1, 0, 0, 1, 2, 0, 0, 0, 0, 3, 0, 0, 0,
		],
	};

	it("holds this many elements of each kind in each file, and the monolith's totals across them", () => {
		const rows = Object.fromEntries(
			built.workspaces.map((w) => [w.file, counts(w)]),
		);
		expect(rows).toEqual(EXPECTED);
		const monoTotals = counts(monolith);
		const setTotals = kinds.map((_, i) =>
			built.workspaces.reduce((n, w) => n + counts(w)[i], 0),
		);
		expect(setTotals).toEqual(monoTotals);
		expect(setTotals).toEqual([
			6, 14, 12, 19, 16, 25, 35, 36, 19, 85, 16, 2, 31, 41, 253, 41, 39, 34,
		]);
	});
});

describe("the derived maps and listings, monolith against set", () => {
	const before = listings({ workspace: monolith });
	const after = listings({ set: reloaded });
	const afterDsl = listings({ set: built });

	it("holds exactly the same entries in every map and graph, and agrees with the DSL-built set", () => {
		expect(after.listings.map((l) => l.name)).toEqual(
			before.listings.map((l) => l.name),
		);
		for (let i = 0; i < before.listings.length; i++) {
			const a = before.listings[i];
			const b = after.listings[i];
			expect(b.items.length, a.name).toBe(a.items.length);
			expect([...b.items].sort(), a.name).toEqual([...a.items].sort());
			expect(afterDsl.listings[i].items, a.name).toEqual(b.items);
		}
	});

	// Map and flow listings come out in the order the set is walked: the files in
	// set order, each as the monolith's walk would have taken it, with the
	// cross-file steps filed where they are reached from. So the listing is the
	// same entries in a different order. This table says which listings are
	// order-sensitive in that sense (runtime-unknown U8: whether a reader shows
	// them in listing order or sorts them), and keeps that visible: a change in
	// the order of any of these is a change to the table, not a silent drift.
	const ORDER_KEPT = ["relation graph subtypes"];
	const ORDER_CHANGED = [
		"context map nodes",
		"context map edges",
		"flow map nodes",
		"flow map edges",
		"relation map nodes",
		"relation map edges",
		"consumable map slots",
		"consumable map nodes",
		"consumable map edges",
		"consumption graph",
		"relation graph relations",
		"relation graph identities",
		"relation graph derived uses",
	];

	it("lists them in the order of the set's walk, which differs from the monolith's walk exactly here", () => {
		const same = before.listings
			.filter(
				(l, i) =>
					JSON.stringify(l.items) === JSON.stringify(after.listings[i].items),
			)
			.map((l) => l.name);
		expect(same).toEqual(ORDER_KEPT);
		const different = before.listings
			.filter(
				(l, i) =>
					JSON.stringify(l.items) !== JSON.stringify(after.listings[i].items),
			)
			.map((l) => l.name);
		expect(different).toEqual(ORDER_CHANGED);
	});

	it("keeps, within each file, the monolith's relative order of the elements it lists", () => {
		const elementLike = [
			"context map nodes",
			"relation map nodes",
			"consumable map slots",
			"consumable map nodes",
			"relation graph relations",
			"relation graph identities",
			"relation graph derived uses",
			"relation graph subtypes",
		];
		for (const name of elementLike) {
			const a = before.listings.find(
				(l) => l.name === name,
			) as (typeof before.listings)[number];
			const b = after.listings.find(
				(l) => l.name === name,
			) as (typeof before.listings)[number];
			const groups = new Map<string, string[]>();
			b.raw.forEach((raw, i) => {
				const file = fileOfEntry(raw) ?? "-";
				groups.set(file, [...(groups.get(file) ?? []), b.items[i]]);
			});
			for (const [file, items] of groups)
				expect(isSubsequence(items, a.items), `${name} in ${file}`).toBe(true);
		}
	});

	it("draws the declared context-map edges in the order the files list their relationships", () => {
		const declared = (l: (typeof after.listings)[number]) =>
			l.items.slice(0, 34);
		const edges = after.listings.find((l) => l.name === "context map edges");
		const fromFiles = reloaded.workspaces.flatMap((w) =>
			w.relationships.map((r) =>
				JSON.stringify([
					stripFiles(identityKeyOf(r.source)),
					stripFiles(identityKeyOf(r.target)),
					r.type,
				]),
			),
		);
		expect(
			declared(edges as (typeof after.listings)[number]).map((e) =>
				JSON.stringify(JSON.parse(e).slice(0, 3)),
			),
		).toEqual(fromFiles);
	});

	it("lists each provider's consumers in the order the monolith did", () => {
		const a = new Map(consumersByProvider([monolith]));
		const b = consumersByProvider(reloaded.workspaces);
		expect(b).toHaveLength(85);
		for (const [provider, consumers] of b)
			expect(consumers, provider).toEqual(a.get(provider));
	});

	it("headed the monolith's one workspace, and heads the set's twelve", () => {
		expect([...before.headings]).toEqual([
			'{"id":"northbank","name":"NorthBank"}',
		]);
		expect(after.headings.size).toBe(12);
		expect([...after.headings].map((h) => JSON.parse(h).id).sort()).toEqual(
			OUTPUT.files.map((f) => `northbank_${f.replace(/\.json$/, "")}`).sort(),
		);
	});

	it("lists users, kinds and members the same as the monolith, and says in which cases the order moves", () => {
		const find = (ws: Iterable<Workspace>, ref: string) => {
			for (const w of ws) {
				const found = w.getByRef(ref);
				if (found) return found;
			}
			return undefined;
		};
		let valueObjects = 0;
		let schemas = 0;
		const moved: string[] = [];
		for (const bc of monolith.boundedcontexts.values()) {
			for (const vo of bc.valueobjects.values()) {
				const there = find(reloaded.workspaces, vo.ref) as ValueObject;
				expect(there, vo.ref).toBeInstanceOf(ValueObject);
				const label = (u: ReturnType<typeof usersOfValueObject>[number]) =>
					`${u.kind}|${u.boundedcontext.id}|${u.owner.id}`;
				const a = usersOfValueObject(vo).map(label);
				const b = usersOfValueObject(there).map(label);
				expect([...b].sort(), vo.ref).toEqual([...a].sort());
				if (JSON.stringify(a) !== JSON.stringify(b)) moved.push(vo.ref);
				expect(
					there.kinds.map((k) => k.id),
					vo.ref,
				).toEqual(vo.kinds.map((k) => k.id));
				valueObjects++;
			}
			for (const s of bc.schemas.values()) {
				const there = find(reloaded.workspaces, s.ref) as DataSchema;
				expect(there, s.ref).toBeInstanceOf(DataSchema);
				const a = usersOfSchema(s).map((u) =>
					JSON.stringify([
						u.kind,
						"owner" in u ? u.owner.ref : "",
						"usage" in u ? u.usage : "",
					]),
				);
				const b = usersOfSchema(there).map((u) =>
					JSON.stringify([
						u.kind,
						"owner" in u ? u.owner.ref : "",
						"usage" in u ? u.usage : "",
					]),
				);
				expect([...b].sort(), s.ref).toEqual([...a].sort());
				expect(
					there.consumables.map((c) => c.ref),
					s.ref,
				).toEqual(s.consumables.map((c) => c.ref));
				schemas++;
			}
		}
		expect(valueObjects).toBe(35);
		expect(schemas).toBe(36);
		// Users are listed "in the order a reader meets them", contexts first in
		// workspace order. In the order the set lists its files the users come in
		// the monolith's order for every value object; a reader that lists the
		// files another way moves them (see the test on file order below).
		expect(moved).toEqual([]);
		// Team and subdomain membership, listed by the set's context order.
		for (const team of monolith.teams.values()) {
			const there = [
				...reloaded.workspaces.flatMap((w) => [...w.teams.values()]),
			].find((t) => t.ref === team.ref);
			expect(there?.boundedcontexts.map((c) => c.ref).sort()).toEqual(
				team.boundedcontexts.map((c) => c.ref).sort(),
			);
		}
		for (const d of monolith.domains.values())
			for (const sd of d.subdomains.values()) {
				const there = reloaded.workspaces
					.flatMap((w) => [...w.domains.values()])
					.flatMap((dd) => [...dd.subdomains.values()])
					.find((x) => x.ref === sd.ref);
				expect(
					[...(there?.boundedcontexts.values() ?? [])].map((c) => c.ref).sort(),
				).toEqual([...sd.boundedcontexts.values()].map((c) => c.ref).sort());
			}
	});
});

describe("the order of the listings depends on the order the files are given", () => {
	it("keeps the same entries and changes only the order, when a reader lists the files another way", () => {
		const given = listings({ set: reloaded });
		// A folder reader that lists files alphabetically (the extension sorts by
		// name) gives the set this order. It is the same set of workspaces.
		const alphabetical = loadSet(
			[...generated].sort(([a], [b]) => a.localeCompare(b)),
		);
		const other = listings({ set: alphabetical });
		expect(other.listings.map((l) => l.name)).toEqual(
			given.listings.map((l) => l.name),
		);
		const changed: string[] = [];
		given.listings.forEach((l, i) => {
			expect([...other.listings[i].items].sort(), l.name).toEqual(
				[...l.items].sort(),
			);
			if (JSON.stringify(other.listings[i].items) !== JSON.stringify(l.items))
				changed.push(l.name);
		});
		const moneyUsers = (set: WorkspaceSet) => {
			const money = set.workspaces
				.flatMap((w) => [...w.boundedcontexts.values()])
				.find((bc) => bc.id === "ledger")
				?.valueobjects.get("money") as ValueObject;
			return usersOfValueObject(money).map(
				(u) => `${u.boundedcontext.id}/${u.owner.id}`,
			);
		};
		expect([...moneyUsers(alphabetical)].sort()).toEqual(
			[...moneyUsers(reloaded)].sort(),
		);
		expect(moneyUsers(alphabetical)).not.toEqual(moneyUsers(reloaded));
		// What a file order cannot change is the per-file content (the files are
		// the same) and the order inside each file; it moves every listing that
		// walks the files.
		expect(changed.length).toBeGreaterThan(8);
		expect(alphabetical.workspaces.map((w) => w.file)).toEqual(
			[...OUTPUT.files].sort((a, b) => a.localeCompare(b)),
		);
	});
});

describe("the diagnostics", () => {
	it("are the three pinned findings, one for one, each now naming its file", () => {
		const after = reloaded.validate();
		expect(after).toHaveLength(PINS_BEFORE.length);
		after.forEach((d, i) => {
			const { file, ...finding } = d;
			expect(finding).toEqual(PINS_BEFORE[i]);
			expect(file).toBe(PIN_FILES[i]);
			// The file is the one the assignment gives the element the finding is about.
			expect(file).toBe(assignment.contexts[contextIdOf(d.ref)]);
		});
		expect(built.validate()).toEqual(after);
		expect(after.map(({ rule, severity }) => ({ rule, severity }))).toEqual(
			PINS_BEFORE.map(({ rule, severity }) => ({ rule, severity })),
		);
	});

	it("are no more and no fewer for any one file read alone with its own set", () => {
		// Each finding is reported once, at the file of the element it is about,
		// not once per file that can see it.
		const perFile = reloaded.workspaces.map((w) => [
			w.file,
			w.validate().length,
		]);
		expect(Object.fromEntries(perFile)).toEqual({
			"customer_platform.json": 0,
			"financial_crime.json": 0,
			"accounts.json": 0,
			"core_banking.json": 0,
			"payments.json": 0,
			"scheme_connectivity.json": 0,
			"cards.json": 0,
			"lending.json": 1,
			"credit_risk.json": 0,
			"finance_systems.json": 0,
			"channels.json": 1,
			"digital_platform.json": 1,
		});
	});
});

describe("the build", () => {
	it("wrote exactly the files the DSL produces, and nothing else but the schema", () => {
		const written = fs
			.readdirSync(ODS_DIR)
			.filter((f) => f.endsWith(".json"))
			.sort();
		expect(written).toEqual([...OUTPUT.files, "schema.json"].sort());
		for (const [file, schemaOf] of builtFiles) {
			const onDisk = fs.readFileSync(path.join(ODS_DIR, file), "utf-8");
			expect(onDisk, `${file} is stale: run npm run build`).toBe(
				JSON.stringify(
					{ $schema: "./schema.json", ...(schemaOf as object) },
					null,
					2,
				),
			);
		}
	});

	it("is idempotent: DSL to JSON to a set to JSON again is the same bytes, and nothing is retained or unresolved", () => {
		const first = reloaded.toSchemas();
		for (const [file, w] of generated) expect(first.get(file), file).toEqual(w);
		const again = loadSet([...first.entries()] as unknown as Array<
			[string, Json]
		>);
		expect(JSON.stringify([...again.toSchemas()])).toBe(
			JSON.stringify([...first]),
		);
		expect(reloaded.rejected).toEqual([]);
		for (const w of reloaded.workspaces) {
			expect(w.retainedRelationships, w.file).toEqual([]);
			expect(w.retainedRelationships, w.file).toHaveLength(0);
		}
		// Written byte-for-byte as the set renders it: key order, array order.
		for (const [file, w] of generated)
			expect(JSON.stringify(w), file).toBe(JSON.stringify(first.get(file)));
	});

	it("has a fixture the build never writes", () => {
		expect(fs.existsSync(path.join(ODS_DIR, "northbank.json"))).toBe(false);
		expect(fs.existsSync(path.join(here, "workspace.ts"))).toBe(false);
	});
});

describe("the team modules", () => {
	const sources = teams.map((t) => ({
		file: t.FILE.replace(/\.json$/, ""),
		path: path.join(here, "teams", `${t.FILE.replace(/\.json$/, "")}.ts`),
	}));

	it("import each other only as types, so there is no run-time edge between teams", () => {
		const names = new Set(sources.map((s) => s.file));
		let typeEdges = 0;
		for (const { file, path: p } of sources) {
			const sf = ts.createSourceFile(
				p,
				fs.readFileSync(p, "utf-8"),
				ts.ScriptTarget.ES2022,
				true,
			);
			for (const s of sf.statements) {
				if (
					!ts.isImportDeclaration(s) ||
					!ts.isStringLiteral(s.moduleSpecifier)
				)
					continue;
				const from = s.moduleSpecifier.text
					.replace(/^\.\//, "")
					.replace(/\.ts$/, "");
				if (!names.has(from)) continue;
				expect(from, `${file} imports itself`).not.toBe(file);
				expect(
					s.importClause?.isTypeOnly,
					`${file} imports ${from} at run time`,
				).toBe(true);
				typeEdges++;
			}
			// The only run-time imports are core and the shared lookup.
			for (const s of sf.statements) {
				if (!ts.isImportDeclaration(s) || s.importClause?.isTypeOnly) continue;
				const spec = (s.moduleSpecifier as ts.StringLiteral).text;
				expect(
					["@open-domain-specification/core", "./foreign.ts"],
					`${file}: ${spec}`,
				).toContain(spec);
			}
		}
		expect(typeEdges).toBeGreaterThan(20);
	});

	it("each export a plain declare and link, and a published list that names real elements of the right kind", () => {
		const accessors: Record<string, (w: Workspace, ref: string) => unknown> = {
			aggregates: (w, r) => w.getAggregateByRef(r),
			attributes: (w, r) => w.getAttributeByRef(r),
			consumables: (w, r) => w.getConsumableByRef(r),
			contexts: (w, r) => w.getBoundedContextByRef(r),
			entities: (w, r) => w.getEntityByRef(r),
			policies: (w, r) => w.getPolicyByRef(r),
			processes: (w, r) => w.getProcessByRef(r),
			schemas: (w, r) => w.getSchemaByRef(r),
			services: (w, r) => w.getServiceByRef(r),
			subdomains: (w, r) => w.getSubdomainByRef(r),
			valueobjects: (w, r) => w.getValueObjectByRef(r),
		};
		let published = 0;
		for (const t of teams) {
			expect(typeof t.declare).toBe("function");
			expect(typeof t.link).toBe("function");
			const w = built.byPath(t.FILE) as Workspace;
			for (const [kind, refs_] of Object.entries(t.published)) {
				for (const ref of refs_ as readonly string[]) {
					expect(
						accessors[kind](w, ref),
						`${t.FILE} ${kind} ${ref}`,
					).toBeTruthy();
					published++;
				}
			}
		}
		expect(published).toBe(47);
	});

	it("link needs the whole set: a team linked into a set that lacks a file it names throws, naming the file", () => {
		const customer = teams.find((t) => t.FILE === "customer_platform.json");
		expect(customer).toBeTruthy();
		const partial = buildPartial("customer_platform.json");
		expect(() => customer?.link(partial)).toThrow(/is not in the set/);
	});
});

/** A set of one declared file, to link into a set that lacks the files it names. */
function buildPartial(file: string): WorkspaceSet {
	const team = teams.find((t) => t.FILE === file);
	if (!team) throw new Error(file);
	const ws = new Workspace(team.meta.name, team.meta.attributes);
	team.declare(ws);
	return WorkspaceSet.fromWorkspaces([[file, ws]]);
}

/*
 * The signed ledger of what is different between the monolith and the set,
 * and why it cannot be otherwise. Every entry is asserted from the model, not
 * written down and trusted: if a difference stops being true, or a new one
 * appears, a test here fails.
 */
describe("the difference ledger: what is genuinely different, and cannot be the same", () => {
	it("D1 workspace headings: one workspace becomes twelve, differing in id, name and description only", () => {
		const {
			domains: _d,
			boundedcontexts: _b,
			relationships: _r,
			teams: _t,
			...before
		} = schema as { [key: string]: Json };
		const differing = new Set<string>();
		const names = new Set<string>();
		for (const [file, written] of builtFiles) {
			const {
				domains: _d2,
				boundedcontexts: _b2,
				relationships: _r2,
				teams: _t2,
				...after
			} = written as { [key: string]: Json };
			expect(Object.keys(after), file).toEqual(Object.keys(before));
			for (const key of Object.keys(before))
				if (JSON.stringify(after[key]) !== JSON.stringify(before[key]))
					differing.add(key);
			names.add(after.name as string);
		}
		expect([...differing].sort()).toEqual(["description", "id", "name"]);
		expect(names.size).toBe(12);
	});

	it("D2 map and flow headings: only the first namespace entry (the workspace) differs, and it is the workspace of the element's file", () => {
		const check = (
			nodes: Iterable<{ id: string; namespace: Array<{ id: string }> }>,
		) => {
			let n = 0;
			for (const node of nodes) {
				const file = fileOfEntry(node.id);
				expect(file, node.id).toBeTruthy();
				const workspace = reloaded.byPath(file as string) as Workspace;
				expect(node.namespace[0].id, node.id).toBe(workspace.id);
				n++;
			}
			return n;
		};
		expect(check(ODSContextMap.fromSet(reloaded).nodes.values())).toBe(19);
		expect(check(ODSRelationMap.fromSet(reloaded).nodes.values())).toBe(61);
		expect(check(ODSFlowMap.fromSet(reloaded).nodes.values())).toBe(81);
		expect(check(ODSConsumableMap.fromSet(reloaded).nodes.values())).toBe(30);
	});

	it("D3 grouping: relationships are partitioned into twelve lists, so every list that walks them is regrouped", () => {
		const lists = reloaded.workspaces.map((w) => w.relationships.length);
		expect(lists).toEqual([1, 6, 2, 1, 5, 1, 4, 3, 2, 4, 5, 0]);
		expect(lists.reduce((a, b) => a + b, 0)).toBe(34);
		expect(monolith.relationships).toHaveLength(34);
	});

	it("D4 identity: every key, id and route of a set element carries its file; none of the monolith's keys survives unqualified", () => {
		const keys = [...ODSContextMap.fromSet(reloaded).nodes.keys()];
		expect(keys).toHaveLength(19);
		for (const key of keys)
			expect(key).toMatch(/^[a-z_]+\.json#\/boundedcontexts\//);
		expect(
			[...ODSContextMap.fromWorkspace(monolith).nodes.keys()].every((k) =>
				k.startsWith("#/"),
			),
		).toBe(true);
	});

	it("D5 files: the set has no merged workspace, no manifest, and no file named for the whole", () => {
		const listed = fs.readdirSync(ODS_DIR).sort();
		expect(listed).toEqual([...OUTPUT.files, "schema.json"].sort());
		expect(listed.some((f) => /manifest|index|northbank\.json$/.test(f))).toBe(
			false,
		);
	});
});
