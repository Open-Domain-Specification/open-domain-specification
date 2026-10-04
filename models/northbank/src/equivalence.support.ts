import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	type Aggregate,
	type BoundedContext,
	identityKeyOf,
	ODSConsumableMap,
	ODSConsumptionGraph,
	ODSContextMap,
	ODSFlowMap,
	ODSRelationGraph,
	ODSRelationMap,
	type Service,
	Workspace,
	type WorkspaceSchema,
	WorkspaceSet,
} from "@open-domain-specification/core";
import { OUTPUT } from "./northbank-set.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

/** The single-workspace NorthBank as it was before the split, frozen as JSON. */
export const FIXTURE_FILE = path.join(
	here,
	"fixtures",
	"northbank.monolith.json",
);

/**
 * The sha256 of the fixture file. It is the bytes of `.ods/northbank.json` at
 * HEAD 5120fd54, taken before this model was split; a change to the fixture is
 * a change to what "the same model" means and must be a decision, not an edit.
 */
export const FIXTURE_SHA256 =
	"42395770ed231c547e0233c6f0642ea3321e7b60c7609422d72942b4d80ed451";

/** Where the build writes the set. */
export const ODS_DIR = path.join(here, "..", OUTPUT.dir);

export type Json =
	| null
	| boolean
	| number
	| string
	| Json[]
	| { [key: string]: Json };

export function fixtureText(): string {
	return fs.readFileSync(FIXTURE_FILE, "utf-8");
}

export function fixtureSha256(): string {
	return createHash("sha256")
		.update(fs.readFileSync(FIXTURE_FILE))
		.digest("hex");
}

/** The fixture's JSON as the old build wrote it, `$schema` header included. */
export function fixtureJson(): { [key: string]: Json } {
	return JSON.parse(fixtureText());
}

/** The fixture as a `WorkspaceSchema`: what `Workspace.fromSchema` takes. */
export function monolithSchema(): WorkspaceSchema {
	const { $schema: _header, ...schema } = fixtureJson();
	return schema as unknown as WorkspaceSchema;
}

/** The old single workspace, loaded from the frozen fixture. */
export function loadMonolith(): Workspace {
	return Workspace.fromSchema(monolithSchema());
}

/** The files the build wrote, as `[path, schema]` entries in set order. */
export function readGenerated(): Array<[string, Json]> {
	return OUTPUT.files.map((file): [string, Json] => {
		const { $schema: _header, ...schema } = JSON.parse(
			fs.readFileSync(path.join(ODS_DIR, file), "utf-8"),
		);
		return [file, schema];
	});
}

/** Loads entries as a set, the way a reader would. */
export function loadSet(entries: Array<[string, Json]>): WorkspaceSet {
	return WorkspaceSet.fromSchemas(
		entries as unknown as Array<[string, WorkspaceSchema]>,
	);
}

/** Drops the file from every qualified ref in `text`: `a.json#/x` becomes `#/x`. */
export function stripFiles(text: string): string {
	return text.replace(/[A-Za-z0-9_%.-]+\.json(?=#)/g, "");
}

/** `value` with every string passed through {@link stripFiles}, order kept. */
export function normalise<T extends Json>(value: T): T {
	if (typeof value === "string") return stripFiles(value) as T;
	if (Array.isArray(value)) return value.map(normalise) as T;
	if (value !== null && typeof value === "object")
		return Object.fromEntries(
			Object.entries(value).map(([k, v]) => [k, normalise(v)]),
		) as T;
	return value;
}

/** Every leaf of a JSON value, keyed by its path as a JSON array. */
export function leaves(
	value: Json,
	trail: string[] = [],
	out = new Map<string, Json>(),
): Map<string, Json> {
	if (Array.isArray(value)) {
		if (value.length === 0) out.set(JSON.stringify([...trail, "[]"]), "empty");
		value.forEach((item, i) => {
			leaves(item, [...trail, String(i)], out);
		});
	} else if (value !== null && typeof value === "object") {
		const entries = Object.entries(value);
		if (entries.length === 0)
			out.set(JSON.stringify([...trail, "{}"]), "empty");
		for (const [key, item] of entries) leaves(item, [...trail, key], out);
	} else out.set(JSON.stringify(trail), value);
	return out;
}

/** The workspace-level collections that are keyed by id and live in one file. */
export const SECTIONS = ["domains", "boundedcontexts", "teams"] as const;

type Section = { [id: string]: Json };

export function sectionOf(
	schema: { [key: string]: Json },
	section: (typeof SECTIONS)[number],
): Section {
	return (schema[section] ?? {}) as Section;
}

type RelationshipJson = {
	type: string;
	name?: string;
	upstream?: { $ref: string };
	downstream?: { $ref: string };
	participants?: Array<{ $ref: string }>;
	[key: string]: Json | undefined;
};

export function relationshipsOf(schema: {
	[key: string]: Json;
}): RelationshipJson[] {
	return (schema.relationships ?? []) as unknown as RelationshipJson[];
}

/** What a relationship is, independent of the file it is written in or how its ends are spelled. */
export function relationshipKey(r: RelationshipJson): string {
	const ends = r.participants
		? r.participants.map((p) => stripFiles(p.$ref))
		: [
				r.upstream && stripFiles(r.upstream.$ref),
				r.downstream && stripFiles(r.downstream.$ref),
			];
	return JSON.stringify([r.type, ...ends, r.name ?? null]);
}

/** The context id a context ref names, whichever file it is written for. */
export function contextIdOf(ref: string): string {
	const pointer = stripFiles(ref);
	const match = /^#\/boundedcontexts\/([^/]+)/.exec(pointer);
	if (!match) throw new Error(`not a context ref: ${ref}`);
	return decodeURIComponent(match[1]).replace(/~1/g, "/").replace(/~0/g, "~");
}

/* ----------------------------------------------------------------------
   The assignment rule, derived from the monolith alone.
   ---------------------------------------------------------------------- */

export type Assignment = {
	/** The file of each team, by team id. */
	teams: Record<string, string>;
	/** The file each context lives in, by context id. */
	contexts: Record<string, string>;
	/** The file each domain lives in, by domain id. */
	domains: Record<string, string>;
	/** The file each relationship is declared in, by {@link relationshipKey}. */
	relationships: Record<string, string>;
};

/**
 * The one assignment the plain rule does not make. `iso_13616` is upstream of
 * two contexts, Accounts and Payments Hub, in two files; the rule's first
 * downstream is Accounts (the monolith lists that relationship first), and D5
 * of the contract chose Payments, flagged. The choice moves one context and
 * nothing else: both relationships live in their downstream's file either way,
 * so which relationships cross files does not change (the test asserts it).
 */
export const D5_OVERRIDES: Record<string, string> = {
	iso_13616: "payments.json",
};

/**
 * Where each element lives, by the deterministic rule the contract accepted
 * (linked-contract section 10, closure D5), computed from the frozen monolith:
 *
 * - a team has the file named for it (`accounts_team` is `accounts.json`);
 * - a context lives in its team's file;
 * - an external context (no team) lives with the team whose context is its
 *   first downstream, taking relationships in the monolith's order;
 * - a domain lives in the file of the team owning most of the contexts that
 *   serve its subdomains, ties to the first such context in the monolith's
 *   order; a domain nothing serves lives with the team whose context carries
 *   the name of one of its subdomains;
 * - a relationship lives in its downstream's file (directed) or its first
 *   participant's file (symmetric).
 *
 * The only context this does not decide as D5 did is `iso_13616` (see
 * {@link D5_OVERRIDES}); this returns the plain rule's answer for it.
 */
export function deriveAssignment(schema: { [key: string]: Json }): Assignment {
	const bcs = sectionOf(schema, "boundedcontexts") as Record<
		string,
		{ team?: { $ref: string }; subdomains?: Array<{ $ref: string }> }
	>;
	const domains = sectionOf(schema, "domains") as Record<
		string,
		{ subdomains?: Record<string, { name: string }> }
	>;
	const teamFile = (teamRef: string) =>
		`${teamRef.replace(/^#\/teams\//, "").replace(/_team$/, "")}.json`;
	const out: Assignment = {
		teams: {},
		contexts: {},
		domains: {},
		relationships: {},
	};
	for (const id of Object.keys(sectionOf(schema, "teams")))
		out.teams[id] = teamFile(`#/teams/${id}`);
	for (const [id, bc] of Object.entries(bcs))
		if (bc.team) out.contexts[id] = teamFile(bc.team.$ref);
	const rels = relationshipsOf(schema);
	for (const [id, bc] of Object.entries(bcs)) {
		if (bc.team) continue;
		const ref = `#/boundedcontexts/${id}`;
		const first = rels.find(
			(r) => r.upstream && stripFiles(r.upstream.$ref) === ref,
		);
		if (!first?.downstream) throw new Error(`no downstream for ${id}`);
		out.contexts[id] = out.contexts[contextIdOf(first.downstream.$ref)];
	}
	for (const [domainId, domain] of Object.entries(domains)) {
		const prefix = `#/domains/${domainId}/subdomains/`;
		const serving = Object.entries(bcs).filter(([, bc]) =>
			(bc.subdomains ?? []).some((s) => s.$ref.startsWith(prefix)),
		);
		const counts = new Map<string, number>();
		for (const [id] of serving)
			counts.set(out.contexts[id], (counts.get(out.contexts[id]) ?? 0) + 1);
		const best = Math.max(0, ...counts.values());
		const first = serving.find(([id]) => counts.get(out.contexts[id]) === best);
		if (first) out.domains[domainId] = out.contexts[first[0]];
		else {
			const names = new Set(
				Object.values(domain.subdomains ?? {}).map((s) => s.name),
			);
			const match = Object.entries(bcs).find(
				([, bc]) =>
					bc.team && names.has((bc as unknown as { name: string }).name),
			);
			if (!match) throw new Error(`no home for domain ${domainId}`);
			out.domains[domainId] = out.contexts[match[0]];
		}
	}
	for (const r of rels)
		out.relationships[relationshipKey(r)] = r.participants
			? out.contexts[contextIdOf(r.participants[0].$ref)]
			: out.contexts[contextIdOf((r.downstream as { $ref: string }).$ref)];
	return out;
}

/** {@link deriveAssignment} with the D5 choices applied: where the files really are. */
export function expectedAssignment(schema: {
	[key: string]: Json;
}): Assignment {
	const rule = deriveAssignment(schema);
	return { ...rule, contexts: { ...rule.contexts, ...D5_OVERRIDES } };
}

/* ----------------------------------------------------------------------
   Derived listings, projected so the monolith and the set can be compared.
   ---------------------------------------------------------------------- */

export type Listing = {
	/** What is listed, e.g. "context map nodes". */
	name: string;
	/** One string per entry, in the order the map lists them, file names removed. */
	items: string[];
	/** The same entries with the file kept, so the file of each can be read. */
	raw: string[];
};

type Namespaced = { namespace: Array<{ id: string; name: string }> };

const headingOf = (node: Namespaced) => node.namespace[0];
const groupingOf = (node: Namespaced) => node.namespace.slice(1);

function listing(name: string, raw: string[]): Listing {
	return { name, raw, items: raw.map(stripFiles) };
}

/** Each derived map and graph the contract names, as ordered lists of entries. */
export function listings(
	source: { workspace: Workspace } | { set: WorkspaceSet },
): { listings: Listing[]; headings: Set<string> } {
	const ctx =
		"workspace" in source
			? ODSContextMap.fromWorkspace(source.workspace)
			: ODSContextMap.fromSet(source.set);
	const flow =
		"workspace" in source
			? ODSFlowMap.fromWorkspace(source.workspace)
			: ODSFlowMap.fromSet(source.set);
	const relation =
		"workspace" in source
			? ODSRelationMap.fromWorkspace(source.workspace)
			: ODSRelationMap.fromSet(source.set);
	const consumable =
		"workspace" in source
			? ODSConsumableMap.fromWorkspace(source.workspace)
			: ODSConsumableMap.fromSet(source.set);
	const graph =
		"workspace" in source
			? ODSConsumptionGraph.fromWorkspace(source.workspace)
			: ODSConsumptionGraph.fromSet(source.set);
	const relations =
		"workspace" in source
			? ODSRelationGraph.fromWorkspace(source.workspace)
			: ODSRelationGraph.fromSet(source.set);
	const headings = new Set<string>();
	const heading = (node: Namespaced) => {
		headings.add(JSON.stringify(headingOf(node)));
	};
	const out: Listing[] = [];

	out.push(
		listing(
			"context map nodes",
			[...ctx.nodes.values()].map((n) => {
				heading(n);
				return JSON.stringify([
					n.id,
					n.name,
					n.description,
					groupingOf(n),
					n.bigBallOfMud,
					n.external,
					n.boundaryOnly,
					n.team,
				]);
			}),
		),
		listing(
			"context map edges",
			[...ctx.edges.values()].map((e) =>
				JSON.stringify([
					e.source.id,
					e.target.id,
					e.type,
					e.name,
					e.upstreamRoles,
					e.downstreamRoles,
					e.description,
					e.implied,
				]),
			),
		),
		listing(
			"flow map nodes",
			[...flow.nodes.values()].map((n) => {
				heading(n);
				return JSON.stringify([
					n.id,
					n.name,
					n.description,
					n.type,
					groupingOf(n),
				]);
			}),
		),
		listing(
			"flow map edges",
			[...flow.edges.entries()].map(([key, e]) =>
				JSON.stringify([key, e.source.id, e.target.id]),
			),
		),
		listing(
			"relation map nodes",
			[...relation.nodes.values()].map((n) => {
				heading(n);
				return JSON.stringify([
					n.id,
					n.name,
					n.description,
					n.type,
					groupingOf(n),
					n.attributes,
				]);
			}),
		),
		listing(
			"relation map edges",
			[...relation.edges.values()].map((e) =>
				JSON.stringify([
					e.source.id,
					e.target.id,
					e.relation,
					e.label,
					e.cardinality,
				]),
			),
		),
		listing(
			"consumable map slots",
			[...consumable.slots.values()].map((s) =>
				JSON.stringify([s.id, s.name, s.description, s.type, s.node.id]),
			),
		),
		listing(
			"consumable map nodes",
			[...consumable.nodes.values()].map((n) => {
				heading(n);
				return JSON.stringify([
					n.id,
					n.name,
					n.description,
					n.type,
					groupingOf(n),
				]);
			}),
		),
		listing(
			"consumable map edges",
			[...consumable.edges.values()].map((e) =>
				JSON.stringify([
					e.source.id,
					e.target.id,
					e.sourcePattern,
					e.targetPattern,
					e.by,
					e.agreement && [e.agreement.name, e.agreement.type],
				]),
			),
		),
		listing(
			"consumption graph",
			graph.consumptions.map((c) =>
				JSON.stringify([
					identityKeyOf(c.consumer),
					identityKeyOf(c.consumable),
					c.pattern,
					c.by.map(identityKeyOf),
					c.relationship && [c.relationship.name, c.relationship.type],
				]),
			),
		),
		listing(
			"relation graph relations",
			relations.relations.map((r) =>
				JSON.stringify([
					identityKeyOf(r.source),
					r.relation,
					identityKeyOf(r.target),
					r.label,
					r.cardinality,
					r.for,
				]),
			),
		),
		listing(
			"relation graph identities",
			relations.identities.map((a) =>
				JSON.stringify([
					identityKeyOf(a),
					a.identifies && identityKeyOf(a.identifies),
				]),
			),
		),
		listing(
			"relation graph subtypes",
			relations.subtypes.map((s) => identityKeyOf(s)),
		),
		listing(
			"relation graph derived uses",
			relations.derivedUses.map((a) =>
				JSON.stringify([
					identityKeyOf(a),
					a.valueobject && identityKeyOf(a.valueobject),
				]),
			),
		),
	);
	return { listings: out, headings };
}

/** The file a listing entry belongs to: the file of the first ref in it, or none. */
export function fileOfEntry(raw: string): string | undefined {
	return /([A-Za-z0-9_%.-]+\.json)#/.exec(raw)?.[1];
}

/** Whether `part` appears in `whole`, in order, with anything between. */
export function isSubsequence(part: string[], whole: string[]): boolean {
	let at = 0;
	for (const item of whole) if (item === part[at]) at++;
	return at === part.length;
}

/** The consumers of every consumable, as the provider lists them, in listed order. */
export function consumersByProvider(
	workspaces: Iterable<Workspace>,
): Array<[string, string[]]> {
	const out: Array<[string, string[]]> = [];
	for (const ws of workspaces)
		for (const bc of ws.boundedcontexts.values())
			for (const holder of providersOf(bc))
				for (const consumable of holder.consumables.values())
					out.push([
						stripFiles(identityKeyOf(consumable)),
						consumable.consumptions.map((c) =>
							stripFiles(identityKeyOf(c.consumer)),
						),
					]);
	return out;
}

function providersOf(bc: BoundedContext): Array<Aggregate | Service> {
	return [...bc.aggregates.values(), ...bc.services.values()];
}
