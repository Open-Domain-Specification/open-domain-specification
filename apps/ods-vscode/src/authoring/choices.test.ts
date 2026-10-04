import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { encodeRefSegment } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { readFreshSet } from "../create";
import { applyIntent, diskTextIo, type Intent } from "../writer";
import { FAMILIES, familyById } from "./families";
import type { FamilyId } from "./form-protocol";
import {
	type AddRequest,
	FormSession,
	portOf,
	type UpdateRequest,
} from "./session";

const petstore = path.resolve(__dirname, "../../../../models/petstore/.ods");

type Plain = { [key: string]: unknown };

type Candidate = {
	request: UpdateRequest;
	/** The element's own canonical JSON node (an entity relation's is its row). */
	node: Plain;
	/** Where that node sits in petstore.json. */
	path: (string | number)[];
};

/** Every element of petstore a form can edit, found from the canonical JSON and the loaded model. */
async function candidates(): Promise<Candidate[]> {
	const io = diskTextIo(petstore);
	const fresh = await readFreshSet(io, ["petstore.json"]);
	const file = "petstore.json";
	const canonical = fresh.set.toSchemas().get(file) as unknown as Plain;
	const at = (path: (string | number)[]): Plain => {
		let node: unknown = canonical;
		for (const step of path) node = (node as Plain)[step];
		if (!node) throw new Error(`no canonical node at ${path.join("/")}`);
		return node as Plain;
	};
	const out: Candidate[] = [
		{
			request: { kind: "update", file, ref: "#", family: "workspace" },
			node: canonical,
			path: [],
		},
	];
	const walk = (
		node: Plain,
		ref: string,
		family: FamilyId,
		here: (string | number)[],
	) => {
		for (const { property, children } of familyById(family).collections)
			for (const child of children) {
				const descriptor = familyById(child);
				if (descriptor.parent?.keyed !== "record") continue;
				const collection = node[property] as Plain | undefined;
				for (const [key, value] of Object.entries(collection ?? {})) {
					const childRef = `${ref}/${property}/${encodeRefSegment(key)}`;
					const path = [...here, property, key];
					out.push({
						request: { kind: "update", file, ref: childRef, family: child },
						node: value as Plain,
						path,
					});
					walk(value as Plain, childRef, child, path);
					if (child === "entity" || child === "valueObject")
						for (const [row] of (
							((value as Plain).relations as unknown[] | undefined) ?? []
						).entries())
							out.push({
								request: {
									kind: "update",
									file,
									ref: childRef,
									family: "entityRelation",
									row,
								},
								node: ((value as Plain).relations as Plain[])[row],
								path: [...path, "relations", row],
							});
				}
			}
	};
	walk(canonical, "#", "workspace", []);
	const ws = fresh.set.byPath(file);
	for (const [i, r] of (ws?.relationships ?? []).entries())
		out.push({
			request: { kind: "update", file, ref: r.ref, family: "relationship" },
			node: at(["relationships", i]),
			path: ["relationships", i],
		});
	for (const [ck, context] of ws?.boundedcontexts ?? [])
		for (const [pk, providers] of [
			["aggregates", context.aggregates],
			["services", context.services],
		] as const)
			for (const [key, provider] of providers)
				for (const [i, c] of provider.consumptions.entries()) {
					const path = ["boundedcontexts", ck, pk, key, "consumes", i];
					out.push({
						request: {
							kind: "update",
							file,
							ref: c.ref,
							family: "consumption",
						},
						node: at(path),
						path,
					});
				}
	return out;
}

async function requests(): Promise<UpdateRequest[]> {
	return (await candidates()).map((c) => c.request);
}

/**
 * Where `$ref`s sit in an element's own node, child collections that are elements
 * of their own left out: `p` a direct ref, `p[]` a list of refs, `p.q` / `p[].q` a ref nested in an object or row.
 */
function refShape({ request, node }: Candidate): string {
	const own = new Set(
		familyById(request.family).collections.map((c) => c.property),
	);
	const found = new Set<string>();
	const look = (value: unknown, where: string) => {
		if (Array.isArray(value))
			for (const item of value) look(item, `${where}[]`);
		else if (value && typeof value === "object") {
			if (typeof (value as Plain).$ref === "string") found.add(where);
			else
				for (const [k, v] of Object.entries(value))
					look(v, where ? `${where}.${k}` : k);
		}
	};
	for (const [k, v] of Object.entries(node)) if (!own.has(k)) look(v, k);
	return `${request.family}|${[...found].sort().join(",")}`;
}

describe("F5 petstore oracle: every ref the model holds is a legal choice", () => {
	it("opens every petstore element, and each held ref is offered legally by its field (no over-strict predicate)", async () => {
		const io = diskTextIo(petstore);
		const port = portOf(io, ["petstore.json"]);
		const all = await requests();
		const covered = new Set<FamilyId>();
		let refs = 0;
		for (const request of all) {
			const opened = await FormSession.open(port, request);
			expect(opened.ok, `${request.family} ${request.ref}`).toBe(true);
			if (!opened.ok) continue;
			covered.add(request.family);
			const init = opened.session.init();
			for (const field of init.fields) {
				if (!field.choices) continue;
				const value = field.value;
				const tokens =
					typeof value === "string"
						? value
							? [value]
							: []
						: Array.isArray(value)
							? value.map((v) => (typeof v === "string" ? v : v.schema))
							: [];
				for (const token of tokens) {
					const choice = field.choices.find((c) => c.value === token);
					expect(
						choice,
						`${request.ref} ${field.name} offers ${token}`,
					).toBeDefined();
					expect(
						choice?.disabledReason,
						`${request.ref} ${field.name} ${token}`,
					).toBeUndefined();
					expect(choice?.file).toBe("petstore.json");
					refs++;
				}
			}
		}
		// the model is clean, so nothing it holds may be refused by a legal class
		expect(refs).toBeGreaterThan(20);
		// and every family petstore has an element of was opened
		for (const family of FAMILIES.map((f) => f.id))
			if (family !== "deadline")
				expect(covered.has(family), `petstore has no ${family} to open`).toBe(
					true,
				);
	});
});

/** A scratch copy of petstore, so the real writer can edit it. */
async function scratch() {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "ods-petstore-"));
	await fs.copyFile(
		path.join(petstore, "petstore.json"),
		path.join(dir, "petstore.json"),
	);
	return { dir, port: portOf(diskTextIo(dir), ["petstore.json"]) };
}

describe("F6 every operation saves through the real writer", () => {
	it("edits one field of one petstore element per family and reference shape through the real writer, and reads each edited field back", async () => {
		const { dir, port } = await scratch();
		try {
			const field = (family: FamilyId) =>
				family === "relationship"
					? "description"
					: family === "entityRelation"
						? "label"
						: family === "consumption"
							? "evidence"
							: "name";
			// the first element of each (family, where its refs sit); the deadline family has no petstore element: see session.test.ts "updates a deadline" (line 1167)
			const all = await candidates();
			const shapes = all.map(refShape);
			const sample = all.filter((_, i) => shapes.indexOf(shapes[i]) === i);
			const sampleShapes = sample.map(refShape);
			// the sample covers every candidate family and reference shape, with nothing cut
			expect(all).toHaveLength(229);
			expect(sample).toHaveLength(29);
			expect(new Set(sampleShapes)).toEqual(new Set(shapes));
			expect(new Set(sampleShapes).size).toBe(sample.length);
			expect([...sampleShapes].sort()).toEqual([
				"aggregate|",
				"attribute|",
				"attribute|identifies",
				"attribute|valueobject",
				"consumable|",
				"consumable|raises[]",
				"consumable|raises[],schema",
				"consumable|rejects[],schema",
				"consumable|returns",
				"consumable|returns,schema",
				"consumable|schema",
				"consumption|by[],consumable",
				"consumption|consumable",
				"context|subdomains[],team",
				"domain|",
				"entityRelation|target",
				"entity|",
				"invariant|constrains[]",
				"policy|on[],then[]",
				"process|ends[],on[],starts[],then[]",
				"relationship|downstream,upstream",
				"relationship|participants[]",
				"schema|",
				"service|",
				"subdomain|",
				"team|",
				"term|embodiedBy",
				"valueObject|",
				"workspace|",
			]);
			const families = new Set(sample.map((c) => c.request.family));
			expect(families.size).toBe(19);
			for (const { id } of FAMILIES)
				if (id !== "deadline") expect(families.has(id), id).toBe(true);
			const expected: unknown[] = [];
			for (const { request } of sample) {
				const opened = await FormSession.open(port, request);
				if (!opened.ok) throw new Error(opened.message);
				const { session } = opened;
				const init = session.init();
				const name = field(request.family);
				const value =
					name === "evidence"
						? { comments: [], disposition: "tolerated" }
						: `${(init.fields.find((f) => f.name === name)?.value as string) || "x"} edited`;
				expected.push(value);
				const out = await session.handle({
					type: "save",
					requestId: init.requestId,
					values: { [name]: value } as never,
				});
				expect(out, `${request.family} ${request.ref}`).toEqual([
					expect.objectContaining({
						type: "saved",
						wrote: expect.stringMatching(/disk|noop/),
					}),
				]);
			}
			const onDisk = JSON.parse(
				await fs.readFile(path.join(dir, "petstore.json"), "utf8"),
			);
			for (const [i, { request, path: where }] of sample.entries()) {
				let node = onDisk;
				for (const step of where) node = node[step];
				const name = field(request.family);
				const label = `${request.family} ${request.ref} ${name}`;
				if (name === "evidence")
					expect(node.disposition, label).toBe("tolerated");
				else expect(node[name], label).toBe(expected[i]);
			}
			// every family still opens on the edited file: nothing the writer emitted is unreadable
			const again = await FormSession.open(port, {
				kind: "update",
				file: "petstore.json",
				ref: "#",
				family: "workspace",
			});
			if (!again.ok) throw new Error(again.message);
			// the one checkbox that writes a nested object, and a plain url
			const view = again.session.init();
			const set = await again.session.handle({
				type: "save",
				requestId: view.requestId,
				values: {
					commentsRequired: true,
					homepage: "https://example.com/pets",
				},
			});
			expect(set).toEqual([expect.objectContaining({ type: "saved" })]);
			const written = JSON.parse(
				await fs.readFile(path.join(dir, "petstore.json"), "utf8"),
			);
			expect(written.options).toEqual({ rules: { commentsRequired: true } });
			expect(written.homepage).toBe("https://example.com/pets");
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("adds an element of every family under a real parent with its required fields, and each one loads", async () => {
		const { dir, port } = await scratch();
		try {
			const all = await requests();
			const parentOf = (family: FamilyId) => {
				const wanted = familyById(family).parent?.families ?? [];
				return all.find(
					(r) => wanted.includes(r.family) && r.family !== "entityRelation",
				);
			};
			let added = 0;
			for (const family of FAMILIES.filter((f) => f.add)) {
				const parent = parentOf(family.id);
				if (!parent) throw new Error(`petstore has no parent for ${family.id}`);
				const request: AddRequest = {
					kind: "add",
					file: "petstore.json",
					parentRef: parent.ref,
					family: family.id,
				};
				const opened = await FormSession.open(port, request);
				if (!opened.ok) throw new Error(`${family.id}: ${opened.message}`);
				const init = opened.session.init();
				const values: Record<string, unknown> = {};
				for (const [name, text] of [
					["name", "Zed Probe"],
					["description", "added by a form"],
				])
					if (init.fields.some((f) => f.name === name)) values[name] = text;
				// fill what is required, as a person would: a field that decides others is refreshed first
				let fields = init.fields;
				for (;;) {
					const f = fields.find(
						(x) => x.required && x.visible && !(x.name in values),
					);
					if (!f) break;
					const pick =
						f.choices?.find((c) => !c.disabledReason)?.value ??
						f.options?.find((o) => !o.disabledReason)?.value;
					values[f.name] = pick ?? "x";
					if (!f.refreshOnChange) continue;
					const [refreshed] = await opened.session.handle({
						type: "change",
						requestId: init.requestId,
						field: f.name,
						values: values as never,
					});
					if (refreshed.type !== "refresh")
						throw new Error(JSON.stringify(refreshed));
					fields = refreshed.fields;
				}
				const out = await opened.session.handle({
					type: "save",
					requestId: init.requestId,
					values: values as never,
				});
				expect(out, family.id).toEqual([
					expect.objectContaining({ type: "saved" }),
				]);
				added++;
			}
			expect(added).toBe(19);
			// a symmetric relationship writes its two participants, which the loop's directed one does not
			const sent: Intent[] = [];
			const spy = {
				readFresh: port.readFresh,
				applyIntent: (intent: Intent) => {
					sent.push(intent);
					return port.applyIntent(intent);
				},
			};
			const rel = await FormSession.open(spy, {
				kind: "add",
				file: "petstore.json",
				parentRef: "#",
				family: "relationship",
			});
			if (!rel.ok) throw new Error(rel.message);
			const view = rel.session.init();
			const [typed] = await rel.session.handle({
				type: "change",
				requestId: view.requestId,
				field: "type",
				values: { type: "partnership" },
			});
			if (typed.type !== "refresh") throw new Error(JSON.stringify(typed));
			const ends = typed.fields.find((f) => f.name === "participantA")?.choices;
			const [one, two] = (ends ?? []).map((c) => c.value);
			const done = await rel.session.handle({
				type: "save",
				requestId: view.requestId,
				values: { type: "partnership", participantA: one, participantB: two },
			});
			expect(done).toEqual([expect.objectContaining({ type: "saved" })]);
			const relationships = JSON.parse(
				await fs.readFile(path.join(dir, "petstore.json"), "utf8"),
			).relationships;
			expect(relationships.at(-1).participants).toHaveLength(2);

			// each participant carries an LC-CONTEXT check and a typed context provider, judged on the new relationship's own ref
			const addIntent = sent.at(-1);
			if (addIntent?.op !== "add") throw new Error("add expected");
			const participantChecks = (addIntent.checks ?? []).filter(
				(c) => c.class === "LC-CONTEXT",
			);
			expect(participantChecks.map((c) => c.field)).toEqual([
				"participantA",
				"participantB",
			]);
			expect(participantChecks.map((c) => c.holder.kind)).toEqual([
				"relationship",
				"relationship",
			]);
			const [a, b] = relationships
				.at(-1)
				.participants.map((p: { $ref: string }) => p.$ref);
			expect(addIntent.providers).toEqual(
				expect.arrayContaining([
					{ ref: a, kind: "context" },
					{ ref: b, kind: "context" },
				]),
			);
			// the writer judges the post-write relationship, not an always-OK pseudo check: the same intent naming one context at both ends is refused
			const id = (ref: string) => ref.split("/").at(-1) as string;
			const ring = `#/relationships/${id(a)}/partnership/${id(a)}`;
			const refused = await applyIntent(diskTextIo(dir), ["petstore.json"], {
				...addIntent,
				element: {
					...addIntent.element,
					participants: [{ $ref: a }, { $ref: a }],
				},
				checks: (addIntent.checks ?? []).map((c) => ({
					...c,
					holder: { ...c.holder, ref: ring },
					...("chosen" in c ? { chosen: [{ ref: a }] } : {}),
				})),
			} as Intent);
			expect(refused).toMatchObject({
				ok: false,
				cause: "illegal-choice",
				illegal: [
					expect.objectContaining({
						field: "participantA",
						rule: "relationship-ends",
					}),
					expect.objectContaining({
						field: "participantB",
						rule: "relationship-ends",
					}),
				],
			});

			// retained update: the participants stay read-only, are judged again, and an unrelated edit still saves
			const fresh = await spy.readFresh();
			const partnership = fresh.set
				.byPath("petstore.json")
				?.relationships.filter((r) => r.type === "partnership")
				.at(-1);
			if (!partnership) throw new Error("the addIntent partnership");
			const edit = await FormSession.open(spy, {
				kind: "update",
				file: "petstore.json",
				ref: partnership.ref,
				family: "relationship",
			});
			if (!edit.ok) throw new Error(edit.message);
			const shown = edit.session.init();
			const kept = await edit.session.handle({
				type: "save",
				requestId: shown.requestId,
				values: { description: "kept apart" },
			});
			expect(kept).toEqual([expect.objectContaining({ type: "saved" })]);
			const update = sent.at(-1);
			if (update?.op !== "edit") throw new Error("edit expected");
			expect(update.changes.map((c) => c.field)).toEqual(["description"]);
			const judged = (update.checks ?? []).find(
				(c) => c.class === "LC-CONTEXT",
			);
			expect(judged).toMatchObject({
				field: "participants",
				chosen: [{ ref: a }, { ref: b }],
			});
			expect(update.providers).toEqual(
				expect.arrayContaining([
					{ ref: a, kind: "context" },
					{ ref: b, kind: "context" },
				]),
			);

			// baseline-invalid: a file that already joins a context to itself keeps that through an unrelated edit, and says so to the writer
			const onDisk = JSON.parse(
				await fs.readFile(path.join(dir, "petstore.json"), "utf8"),
			);
			onDisk.relationships.at(-1).participants = [{ $ref: a }, { $ref: a }];
			await fs.writeFile(
				path.join(dir, "petstore.json"),
				JSON.stringify(onDisk, null, 2),
				"utf8",
			);
			const ringed = (await spy.readFresh()).set
				.byPath("petstore.json")
				?.relationships.filter((r) => r.type === "partnership")
				.at(-1);
			if (!ringed) throw new Error("the self relationship");
			const keep = await FormSession.open(spy, {
				kind: "update",
				file: "petstore.json",
				ref: ringed.ref,
				family: "relationship",
			});
			if (!keep.ok) throw new Error(keep.message);
			const keepView = keep.session.init();
			expect(
				await keep.session.handle({
					type: "save",
					requestId: keepView.requestId,
					values: { description: "still joined to itself" },
				}),
			).toEqual([expect.objectContaining({ type: "saved" })]);
			const pinned = sent.at(-1);
			if (pinned?.op !== "edit") throw new Error("edit expected");
			expect(
				(pinned.checks ?? []).find((c) => c.class === "LC-CONTEXT"),
			).toMatchObject({ openedIllegal: [a, a] });
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
});
