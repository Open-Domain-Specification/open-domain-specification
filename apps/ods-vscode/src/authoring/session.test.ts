import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	diskTextIo,
	type Intent,
	type TextIo,
	type WriteResult,
} from "../writer";
import { asText, borrowSet, teamTexts } from "../writer.support";
import type { FormField, FormInit, HostToForm } from "./form-protocol";
import {
	type AuthoringPort,
	type FormRequest,
	FormSession,
	portOf,
} from "./session";

/**
 * The form session against real temp folders and the real writer. Nothing here
 * fakes the set, a file or the guard: each test writes the files a host would
 * hold, opens a form, drives it with the protocol's own messages and reads the
 * files back. A port wrapper only RECORDS what the session sends the writer
 * (and, for one race, edits a file between the session's read and the write).
 */

type Files = Record<string, string>;
// biome-ignore lint/suspicious/noExplicitAny: a parsed model file, edited by path
type Doc = any;

const dirs: string[] = [];
afterEach(async () => {
	for (const dir of dirs.splice(0))
		await fs.rm(dir, { recursive: true, force: true });
});

async function project(texts: Files, wrapIo?: (io: TextIo) => TextIo) {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "ods-session-"));
	dirs.push(dir);
	for (const [file, text] of Object.entries(texts))
		await fs.writeFile(path.join(dir, file), text, "utf8");
	const files = Object.keys(texts);
	const io = wrapIo ? wrapIo(diskTextIo(dir)) : diskTextIo(dir);
	const sent: Intent[] = [];
	const results: WriteResult[] = [];
	let beforeWrite: (() => Promise<void>) | undefined;
	const real = portOf(io, files);
	const port: AuthoringPort = {
		readFresh: real.readFresh,
		applyIntent: async (intent) => {
			sent.push(intent);
			await beforeWrite?.();
			const result = await real.applyIntent(intent);
			results.push(result);
			return result;
		},
	};
	const bytes = async (): Promise<Files> =>
		Object.fromEntries(
			await Promise.all(
				files.map(async (f) => [
					f,
					await fs.readFile(path.join(dir, f), "utf8"),
				]),
			),
		);
	const json = async (file: string) =>
		JSON.parse(await fs.readFile(path.join(dir, file), "utf8"));
	const edit = async (file: string, change: (j: Doc) => void) => {
		const j = await json(file);
		change(j);
		await fs.writeFile(path.join(dir, file), asText(j), "utf8");
	};
	return {
		port,
		files,
		sent,
		results,
		bytes,
		json,
		edit,
		onWrite: (fn: () => Promise<void>) => {
			beforeWrite = fn;
		},
	};
}

type Project = Awaited<ReturnType<typeof project>>;

async function open(p: Project, request: FormRequest) {
	const opened = await FormSession.open(p.port, request);
	if (!opened.ok) throw new Error(`${opened.message} ${opened.action}`);
	return { session: opened.session, init: opened.session.init() };
}

const fieldOf = (init: { fields: FormField[] }, name: string) => {
	const f = init.fields.find((x) => x.name === name);
	if (!f) throw new Error(`no field ${name}`);
	return f;
};
const tokenOf = (
	init: { fields: FormField[] },
	field: string,
	label: string,
) => {
	const choice = fieldOf(init, field).choices?.find((c) => c.label === label);
	if (!choice) throw new Error(`no choice ${label} in ${field}`);
	return choice.value;
};
const save = (
	session: FormSession,
	init: FormInit,
	values: Record<string, never> | Record<string, unknown>,
	owner?: string,
): Promise<HostToForm[]> =>
	session.handle({
		type: "save",
		requestId: init.requestId,
		values: values as never,
		...(owner ? { owner } : {}),
	});
const only = (messages: HostToForm[]) => {
	expect(messages).toHaveLength(1);
	return messages[0];
};
const errorsOf = (m: HostToForm) =>
	m.type === "validation" || m.type === "refused" ? m.errors : [];

/** The three team files, with a team in each of a.json and b.json. */
async function teams() {
	const texts = teamTexts();
	const a = JSON.parse(texts["a.json"]);
	a.teams = { platform: { name: "Platform" } };
	const b = JSON.parse(texts["b.json"]);
	b.teams = { payments: { name: "Payments" } };
	texts["a.json"] = asText(a, { $schema: "./schema.json" });
	texts["b.json"] = asText(b);
	return project(texts);
}

const LEDGER = "#/boundedcontexts/ledger";
const A_ROOT = { kind: "add", file: "a.json", parentRef: "#" } as const;

describe("F2 a form is real, populated and shows where every choice lives", () => {
	it("add context: team and subdomain choices are the legal ones of every file with the file shown, and a legal Save writes only the owner", async () => {
		const p = await teams();
		const before = await p.bytes();
		const { session, init } = await open(p, { ...A_ROOT, family: "context" });
		expect(init.mode).toBe("add");
		const team = fieldOf(init, "team");
		expect(team.choices?.map((c) => [c.label, c.file])).toEqual([
			["Platform", "a.json"],
			["Payments", "b.json"],
		]);
		expect(team.choices?.every((c) => c.value.includes("#/teams/"))).toBe(true);
		expect(
			fieldOf(init, "subdomains").choices?.map((c) => [c.label, c.file]),
		).toEqual([
			["Core", "a.json"],
			["Shop", "b.json"],
			["Run", "c.json"],
		]);
		const saved = only(
			await save(session, init, {
				name: "Treasury",
				description: "money",
				systemKind: "modelled",
				team: tokenOf(init, "team", "Payments"),
				subdomains: [tokenOf(init, "subdomains", "Core")],
			}),
		);
		expect(saved).toMatchObject({
			type: "saved",
			file: "a.json",
			wrote: "disk",
		});
		const after = await p.bytes();
		expect(Object.keys(after).filter((f) => after[f] !== before[f])).toEqual([
			"a.json",
		]);
		const written = (await p.json("a.json")).boundedcontexts.treasury;
		expect(written.team).toEqual({ $ref: "b.json#/teams/payments" });
		expect(written.subdomains).toEqual([
			{ $ref: "#/domains/bank/subdomains/core" },
		]);
		expect(p.sent).toHaveLength(1);
		expect(p.sent[0].op).toBe("add");
	});

	it("update context: values are populated, the id row says why it is read-only, and one atomic intent carries only the changed field", async () => {
		const p = await teams();
		await p.edit("a.json", (j) => {
			j.boundedcontexts.ledger.team = { $ref: "#/teams/platform" };
		});
		const { session, init } = await open(p, {
			kind: "update",
			file: "a.json",
			ref: LEDGER,
			family: "context",
		});
		expect(fieldOf(init, "name").value).toBe("Ledger");
		expect(fieldOf(init, "description").value).toBe("ledger");
		expect(fieldOf(init, "team").value).toBe(tokenOf(init, "team", "Platform"));
		expect(init.readOnly).toEqual([
			expect.objectContaining({
				label: "Id",
				value: "ledger",
				reason: expect.stringContaining("cannot be renamed"),
			}),
		]);
		expect(init.notes.join(" ")).toContain("canonical form");
		const saved = only(
			await save(session, init, { description: "the general ledger" }),
		);
		expect(saved).toMatchObject({ type: "saved", wrote: "disk" });
		expect(p.sent).toHaveLength(1);
		const intent = p.sent[0];
		if (intent.op !== "edit") throw new Error("one atomic edit expected");
		expect(intent.changes.map((c) => c.field)).toEqual(["description"]);
		// unchanged reference fields are still judged: a check for every one, with what they hold
		expect(intent.checks?.map((c) => c.field).sort()).toEqual([
			"subdomains",
			"team",
		]);
		const team = intent.checks?.find((c) => c.field === "team");
		expect(team).toMatchObject({ chosen: [{ ref: "#/teams/platform" }] });
		expect((await p.json("a.json")).boundedcontexts.ledger.description).toBe(
			"the general ledger",
		);
	});

	it("a Save that the writer leaves in a dirty open editor says it is not saved to disk and that the editor must be saved", async () => {
		// the real writer and session; only the io reports what an editor with unsaved edits does
		const dirtyEditor = (disk: TextIo): TextIo => ({
			readText: (file) => disk.readText(file),
			writeIfUnchanged: async (file, text, hash) => {
				const outcome = await disk.writeIfUnchanged(file, text, hash);
				return outcome.status === "ok"
					? { status: "ok", via: "buffer" }
					: outcome;
			},
		});
		const texts = teamTexts();
		const a = JSON.parse(texts["a.json"]);
		a.teams = { platform: { name: "Platform" } };
		texts["a.json"] = asText(a, { $schema: "./schema.json" });
		const p = await project(texts, dirtyEditor);
		const { session, init } = await open(p, {
			kind: "update",
			file: "a.json",
			ref: LEDGER,
			family: "context",
		});
		const saved = only(
			await save(session, init, { description: "the general ledger" }),
		);
		expect(saved).toMatchObject({
			type: "saved",
			file: "a.json",
			wrote: "buffer",
		});
		const message = saved.type === "saved" ? saved.message : "";
		expect(message).toContain("not saved to disk");
		expect(message).toContain("Save that editor");
		expect(message).not.toMatch(/^Saved to/);
	});

	it("add relationship: every loaded file may own it, the downstream's is the default, and a legal Save writes only that owner", async () => {
		const p = await project(teamTexts());
		const before = await p.bytes();
		const { session, init } = await open(p, {
			...A_ROOT,
			family: "relationship",
		});
		expect(init.owner.ownerChoices?.map((c) => c.value)).toEqual([
			"a.json",
			"b.json",
			"c.json",
		]);
		const typed = await change(session, init, "type", {
			type: "upstream-downstream",
		});
		const risk = tokenOf(typed, "upstream", "Risk");
		const picked = await change(session, init, "upstream", { upstream: risk });
		// the other end is not offered again, and nothing is offered before the type is known
		expect(
			fieldOf(picked, "downstream").choices?.map((c) => c.label),
		).not.toContain("Risk");
		expect(picked.owner.file).toBe("a.json");
		const downstream = tokenOf(picked, "downstream", "Orders");
		const next = await change(session, init, "downstream", { downstream });
		expect(next.owner.file).toBe("b.json");
		const saved = only(
			await save(session, init, {
				upstreamRoles: ["open-host-service"],
				description: "risk feeds orders",
			}),
		);
		expect(saved).toMatchObject({ type: "saved", file: "b.json" });
		const after = await p.bytes();
		expect(Object.keys(after).filter((f) => after[f] !== before[f])).toEqual([
			"b.json",
		]);
		const relationships = (await p.json("b.json")).relationships;
		expect(relationships).toHaveLength(2);
		expect(relationships[1]).toMatchObject({
			type: "upstream-downstream",
			upstream: { $ref: "a.json#/boundedcontexts/risk" },
			downstream: { $ref: "#/boundedcontexts/orders" },
		});
		// a directed add is judged like a symmetric one: both ends carry an LC-CONTEXT check on the relationship the write produces (qualified, across files), with typed context providers
		const add = p.sent[0];
		if (add.op !== "add") throw new Error("add expected");
		const written = (await p.port.readFresh()).set.byPath("b.json")
			?.relationships[1].ref as string;
		expect((add.checks ?? []).map((c) => [c.field, c.class, c.holder])).toEqual(
			[
				["upstream", "LC-CONTEXT", { ref: written, kind: "relationship" }],
				["downstream", "LC-CONTEXT", { ref: written, kind: "relationship" }],
			],
		);
		expect(add.providers).toEqual(
			expect.arrayContaining([
				{ ref: "a.json#/boundedcontexts/risk", kind: "context" },
				{ ref: "#/boundedcontexts/orders", kind: "context" },
			]),
		);
	});

	it("add a symmetric relationship across files: the participants are judged on the qualified relationship the owning file receives, and the real writer saves it", async () => {
		const p = await project(teamTexts());
		const before = await p.bytes();
		const { session, init } = await open(p, {
			...A_ROOT,
			family: "relationship",
		});
		const typed = await change(session, init, "type", { type: "partnership" });
		const orders = tokenOf(typed, "participantA", "Orders");
		const picked = await change(session, init, "participantA", {
			participantA: orders,
		});
		const risk = tokenOf(picked, "participantB", "Risk");
		const next = await change(session, init, "participantB", {
			participantB: risk,
		});
		// the first participant's file owns it; the second is in another file, so its end is qualified
		expect(next.owner.file).toBe("b.json");
		const saved = only(await save(session, init, {}));
		expect(saved).toMatchObject({ type: "saved", file: "b.json" });
		const after = await p.bytes();
		expect(Object.keys(after).filter((f) => after[f] !== before[f])).toEqual([
			"b.json",
		]);
		const added = (await p.json("b.json")).relationships.at(-1);
		expect(added.participants).toEqual([
			{ $ref: "#/boundedcontexts/orders" },
			{ $ref: "a.json#/boundedcontexts/risk" },
		]);
		const add = p.sent[0];
		if (add.op !== "add") throw new Error("add expected");
		const written = (await p.port.readFresh()).set
			.byPath("b.json")
			?.relationships.at(-1)?.ref as string;
		expect((add.checks ?? []).map((c) => [c.field, c.class, c.holder])).toEqual(
			[
				["participantA", "LC-CONTEXT", { ref: written, kind: "relationship" }],
				["participantB", "LC-CONTEXT", { ref: written, kind: "relationship" }],
			],
		);
		expect(p.results[0]).toMatchObject({ ok: true });
	});
});

async function change(
	session: FormSession,
	init: FormInit,
	field: string,
	values: Record<string, unknown>,
) {
	const m = only(
		await session.handle({
			type: "change",
			requestId: init.requestId,
			field,
			values: values as never,
		}),
	);
	if (m.type !== "refresh") throw new Error(JSON.stringify(m));
	return m;
}

describe("F3 Save and Cancel answer with something a person can act on", () => {
	it("cancel writes nothing; an empty or duplicate name is refused before any write", async () => {
		const p = await teams();
		const before = await p.bytes();
		const { session, init } = await open(p, { ...A_ROOT, family: "context" });
		const empty = only(
			await save(session, init, { name: "  ", description: "x" }),
		);
		expect(empty.type).toBe("validation");
		expect(errorsOf(empty)[0]).toMatchObject({
			field: "name",
			message: expect.stringContaining("required"),
		});
		const dup = only(
			await save(session, init, { name: "ledger", description: "x" }),
		);
		expect(errorsOf(dup)[0]).toMatchObject({
			field: "name",
			message: expect.stringContaining("already has"),
		});
		expect(p.sent).toHaveLength(0);
		expect(
			await session.handle({ type: "cancel", requestId: init.requestId }),
		).toEqual([]);
		expect(
			only(await save(session, init, { name: "Later", description: "x" })).type,
		).toBe("validation");
		expect(await p.bytes()).toEqual(before);
		expect(p.sent).toHaveLength(0);
	});
});

const TOTAL =
	"#/boundedcontexts/claims/aggregates/account/entities/account/attributes/total";
const AMOUNT = "#/boundedcontexts/claims/schemas/payload/attributes/amount";
const total = {
	kind: "update",
	file: "b.json",
	ref: TOTAL,
	family: "attribute",
} as const;

/** The conformist relationship that makes Claims' borrowing of Money legal is removed from a.json. */
const dropBorrowing = (p: Project) =>
	p.edit("a.json", (j) => {
		j.relationships = [];
	});

describe("handoff: a retained reference is judged afresh, and only a genuine baseline defect is kept", () => {
	it("refuses a formerly legal ref that became illegal while the form was open, though its raw string is unchanged, and sends nothing", async () => {
		const p = await project(borrowSet().texts);
		const { session, init } = await open(p, total);
		const money = fieldOf(init, "valueobject");
		expect(money.choices?.map((c) => c.label)).toEqual(["Money", "Spare"]);
		expect(money.choices?.every((c) => !c.disabledReason)).toBe(true);
		await dropBorrowing(p);
		const before = await p.bytes();
		const r = only(
			await save(session, init, { description: "the account total" }),
		);
		expect(r.type).toBe("validation");
		expect(errorsOf(r)).toEqual([
			expect.objectContaining({
				field: "valueobject",
				message: expect.stringContaining("Money"),
			}),
		]);
		expect(p.sent).toHaveLength(0);
		expect(await p.bytes()).toEqual(before);
	});

	it("the writer is the authority when the change lands between the session's read and the write: refused with the writer's action, mapped to the field, bytes unchanged", async () => {
		const p = await project(borrowSet().texts);
		const { session, init } = await open(p, total);
		p.onWrite(() => dropBorrowing(p));
		const before = await p.bytes();
		const r = only(
			await save(session, init, { description: "the account total" }),
		);
		// the intent was sent, then refused once the file changed under it
		expect(p.sent).toHaveLength(1);
		const after = await p.bytes();
		expect(after["b.json"]).toBe(before["b.json"]);
		expect(r).toMatchObject({
			type: "refused",
			cause: "illegal-choice",
			action: expect.stringContaining("pick from the refreshed list"),
		});
		expect(errorsOf(r)[0]).toMatchObject({
			field: "valueobject",
			message: expect.stringContaining("Money"),
		});
	});

	it("keeps a ref the host found illegal at opening through an unrelated edit, and no message can claim or widen that", async () => {
		const p = await project(borrowSet().texts);
		await p.edit("b.json", (j) => {
			j.boundedcontexts.claims.schemas.payload.attributes = {
				amount: {
					name: "Amount",
					type: "Money",
					valueobject: { $ref: borrowSet().money },
				},
			};
		});
		await dropBorrowing(p);
		const request = {
			kind: "update",
			file: "b.json",
			ref: AMOUNT,
			family: "attribute",
		} as const;

		// opened already illegal: shown, selected and explained, and the host remembers it
		const first = await open(p, request);
		const held = fieldOf(first.init, "valueobject");
		expect(held.choices?.[0]).toMatchObject({ label: "Money", file: "a.json" });
		expect(held.choices?.[0].disabledReason).toContain("Kept as it is");
		expect(first.init.notes.join(" ")).toContain("keeps 1 reference");

		// a message cannot fabricate or widen the host's own list
		const forged = only(
			await save(first.session, first.init, {
				openedIllegal: [borrowSet().money],
			}),
		);
		expect(errorsOf(forged)[0].message).toContain("does not have");
		expect(p.sent).toHaveLength(0);

		// the unrelated edit is kept: only the description is written, the pinned ref stays
		const second = await open(p, request);
		const kept = only(
			await save(second.session, second.init, { description: "an amount" }),
		);
		expect(kept).toMatchObject({ type: "saved", wrote: "disk" });
		const intent = p.sent[0];
		if (intent.op !== "edit") throw new Error("edit expected");
		expect(intent.changes.map((c) => c.field)).toEqual(["description"]);
		const check = intent.checks?.find((c) => c.field === "valueobject");
		expect(check).toMatchObject({ openedIllegal: [borrowSet().money] });
		const amount = (await p.json("b.json")).boundedcontexts.claims.schemas
			.payload.attributes.amount;
		expect(amount).toMatchObject({
			description: "an amount",
			valueobject: { $ref: borrowSet().money },
		});
	});
});

describe("handoff: a governing field withdraws the exemption", () => {
	const HOLDER = "#/boundedcontexts/claims/aggregates/holder/entities/holder";

	it("an entity that already specialises or includes across aggregates keeps that through an unrelated edit, but marking it the root, or changing a relation's type, re-judges the unchanged ref", async () => {
		const p = await project(teamTexts());
		await p.edit("b.json", (j) => {
			j.boundedcontexts.claims.aggregates.holder = {
				name: "Holder",
				description: "",
				entities: {
					holder: {
						name: "Holder",
						description: "",
						root: false,
						specialises: {
							$ref: "#/boundedcontexts/claims/aggregates/account/entities/account",
						},
						relations: [
							{
								relation: "includes",
								target: {
									$ref: "#/boundedcontexts/claims/aggregates/account/entities/account",
								},
							},
						],
					},
				},
			};
		});
		const request = {
			kind: "update",
			file: "b.json",
			ref: HOLDER,
			family: "entity",
		} as const;
		const first = await open(p, request);
		expect(
			fieldOf(first.init, "specialises").choices?.[0].disabledReason,
		).toContain("Kept as it is");

		const root = only(await save(first.session, first.init, { root: true }));
		expect(root.type).toBe("validation");
		expect(errorsOf(root)[0]).toMatchObject({
			field: "specialises",
			message: expect.stringContaining("not allowed here"),
		});
		expect(p.sent).toHaveLength(0);

		const second = await open(p, request);
		const kept = only(
			await save(second.session, second.init, { description: "a holder" }),
		);
		expect(kept).toMatchObject({ type: "saved", wrote: "disk" });
		expect(p.sent).toHaveLength(1);

		// the relation row has no ref: it is written back as part of its owner's list
		const row = {
			kind: "update",
			file: "b.json",
			ref: HOLDER,
			family: "entityRelation",
			row: 0,
		} as const;
		const typed = await open(p, row);
		expect(fieldOf(typed.init, "target").choices?.[0].disabledReason).toContain(
			"Kept as it is",
		);
		const retyped = only(
			await save(typed.session, typed.init, { relation: "uses" }),
		);
		expect(errorsOf(retyped)[0]).toMatchObject({
			field: "target",
			message: expect.stringContaining("not allowed here"),
		});
		expect(p.sent).toHaveLength(1);
		const label = await open(p, row);
		const relabelled = only(
			await save(label.session, label.init, { label: "holds" }),
		);
		expect(relabelled).toMatchObject({ type: "saved", wrote: "disk" });
		const intent = p.sent[1];
		if (intent.op !== "edit") throw new Error("edit expected");
		expect(intent.changes.map((c) => c.field)).toEqual(["relations"]);
		expect(intent.checks?.[0]).toMatchObject({
			field: "relations",
			openedIllegal: [
				"#/boundedcontexts/claims/aggregates/account/entities/account",
			],
		});
		expect(
			(await p.json("b.json")).boundedcontexts.claims.aggregates.holder.entities
				.holder.relations,
		).toEqual([
			expect.objectContaining({ relation: "includes", label: "holds" }),
		]);
	});
});

describe("handoff: deliberately pinned NorthBank defects survive an unrelated edit through the form", () => {
	const nbDir = path.resolve(__dirname, "../../../../models/northbank/.ods");
	const POLICY = "#/boundedcontexts/lending/policies/escalate_arrears";
	const northbank = async () => {
		const names = (await fs.readdir(nbDir)).filter(
			(f) => f.endsWith(".json") && f !== "schema.json",
		);
		const texts: Files = {};
		for (const f of names)
			texts[f] = await fs.readFile(path.join(nbDir, f), "utf8");
		return project(texts);
	};
	const request = {
		kind: "update",
		file: "lending.json",
		ref: POLICY,
		family: "policy",
	} as const;

	it("keeps the pinned ref on a description edit (owner only), and refuses it once the field itself is changed", async () => {
		const p = await northbank();
		const before = await p.bytes();
		const { session, init } = await open(p, request);
		const then = fieldOf(init, "then");
		expect(then.choices?.[0].disabledReason).toContain("Kept as it is");
		const saved = only(
			await save(session, init, {
				description:
					"A missed installment triggers the arrears notice, reworded",
			}),
		);
		expect(saved).toMatchObject({ type: "saved", file: "lending.json" });
		const after = await p.bytes();
		expect(Object.keys(after).filter((f) => after[f] !== before[f])).toEqual([
			"lending.json",
		]);
		expect(after["lending.json"]).toContain("arrears_notice_issued");

		// the same form, but the field that holds the pinned ref is itself edited
		const again = await open(p, request);
		const pinned = fieldOf(again.init, "then").value as string[];
		const legal = fieldOf(again.init, "then").choices?.find(
			(c) => !c.disabledReason,
		);
		if (!legal) throw new Error("lending offers no legal operation to add");
		const edited = only(
			await save(again.session, again.init, {
				// biome-ignore lint/suspicious/noThenProperty: "then" is the policy's own schema property
				then: [...pinned, legal.value],
			}),
		);
		expect(edited.type).toBe("validation");
		expect(errorsOf(edited)[0]).toMatchObject({
			field: "then",
			message: expect.stringContaining("not allowed here"),
		});
		expect(p.sent).toHaveLength(1);
	});
});

/**
 * Billing (b.json) takes Gateway's Charge twice, each time with a different
 * first caller of its own: the case where a consumption's ref carries `/by/`.
 */
function billing() {
	const a = new Workspace("Team A", { description: "A", version: "1" });
	const pay = a
		.addDomain("Bank", { description: "" })
		.addSubdomain("Core", { type: "core", description: "" })
		.addBoundedcontext("Pay", { description: "pay" });
	const charge = pay
		.addService("Gateway", { description: "", type: "application" })
		.provides("Charge", { description: "", type: "operation" });
	const b = new Workspace("Team B", { description: "B", version: "1" });
	const shop = b
		.addDomain("Retail", { description: "" })
		.addSubdomain("Shop", { type: "core", description: "" })
		.addBoundedcontext("Shop", { description: "shop" });
	const service = shop.addService("Billing", {
		description: "",
		type: "application",
	});
	const [run, retry] = ["Run", "Retry", "Audit"].map((n) =>
		service.provides(n, { description: "", type: "operation" }),
	);
	b.addRelationship({
		type: "upstream-downstream",
		upstream: pay,
		downstream: shop,
		description: "shop takes payments",
	});
	const first = service.consumes(charge, { by: [run] });
	service.consumes(charge, { by: [retry] });
	const set = WorkspaceSet.fromWorkspaces([
		["a.json", a],
		["b.json", b],
	]);
	const texts: Files = {};
	for (const [file, schema] of set.toSchemas()) texts[file] = asText(schema);
	return { texts, first: first.ref };
}

const BILLING = "#/boundedcontexts/shop/services/billing";

describe("handoff: a consumption's by can re-key it, and a collision is refused before any write", () => {
	it("editing the first caller of one of two consumptions of a consumable re-keys it and saves; taking the sibling's first caller is refused with nothing sent", async () => {
		const p = await project(billing().texts);
		const request = {
			kind: "update",
			file: "b.json",
			ref: billing().first,
			family: "consumption",
		} as const;
		const { session, init } = await open(p, request);
		expect(init.readOnly[0]).toMatchObject({
			label: "Takes",
			value: "Charge (a.json)",
		});
		expect(init.notes.join(" ")).toContain("told apart by their first caller");
		const by = fieldOf(init, "by");
		expect(by.choices?.map((c) => c.label)).toEqual(["Run", "Retry", "Audit"]);

		const clash = only(
			await save(session, init, { by: [tokenOf(init, "by", "Retry")] }),
		);
		expect(clash.type).toBe("validation");
		expect(errorsOf(clash)[0]).toMatchObject({
			field: "by",
			message: expect.stringContaining("would have the same ref"),
		});
		expect(p.sent).toHaveLength(0);

		const moved = only(
			await save(session, init, { by: [tokenOf(init, "by", "Audit")] }),
		);
		expect(moved).toMatchObject({
			type: "saved",
			file: "b.json",
			message: expect.stringContaining("The consumption's ref changed"),
		});
		const intent = p.sent[0];
		if (intent.op !== "edit") throw new Error("edit expected");
		// the target is the consumption as it is now; every check's holder is it as the write will leave it
		expect(intent.target.ref).toMatch(/\/by\/.*run$/);
		expect(intent.checks?.map((c) => c.field).sort()).toEqual([
			"by",
			"consumable",
			"relationship",
		]);
		expect(
			intent.checks?.every((c) => /\/by\/.*audit$/.test(c.holder.ref)),
		).toBe(true);
		const consumes = (await p.json("b.json")).boundedcontexts.shop.services
			.billing.consumes;
		expect(consumes.map((c: Doc) => c.by[0].$ref.split("/").pop())).toEqual([
			"audit",
			"retry",
		]);
	});

	it("adding a second consumption of a consumable already taken is told about the re-key, saves with its own first caller, and a clashing one is refused", async () => {
		const p = await project(billing().texts);
		await p.edit("b.json", (j) => {
			j.boundedcontexts.shop.services.billing.consumes.pop();
		});
		const request = {
			kind: "add",
			file: "b.json",
			parentRef: BILLING,
			family: "consumption",
		} as const;
		const { session, init } = await open(p, request);
		const charge = tokenOf(init, "consumable", "Charge");
		const picked = await change(session, init, "consumable", {
			consumable: charge,
		});
		expect(picked.notes.join(" ")).toContain("already takes");
		const retry = tokenOf(picked, "by", "Retry");
		const run = tokenOf(picked, "by", "Run");

		const clash = only(await save(session, init, { by: [run] }));
		expect(errorsOf(clash)[0]).toMatchObject({ field: "by" });
		expect(p.sent).toHaveLength(0);

		const saved = only(await save(session, init, { by: [retry] }));
		expect(saved).toMatchObject({ type: "saved", file: "b.json" });
		const intent = p.sent[0];
		if (intent.op !== "add") throw new Error("add expected");
		expect(intent.checks?.map((c) => c.field).sort()).toEqual([
			"by",
			"consumable",
			"relationship",
		]);
		expect(intent.checks?.every((c) => c.holder.ref.includes("/by/"))).toBe(
			true,
		);
		const consumes = (await p.json("b.json")).boundedcontexts.shop.services
			.billing.consumes;
		expect(consumes).toHaveLength(2);
	});
});

describe("handoff: a consumable's type is editable, with its dependants named", () => {
	const CHARGE = "#/boundedcontexts/pay/services/gateway/provides/charge";

	it("is a field, not a read-only row; the note names the consumptions that may then be reported, and the change saves", async () => {
		const p = await project(billing().texts);
		const { session, init } = await open(p, {
			kind: "update",
			file: "a.json",
			ref: CHARGE,
			family: "consumable",
		});
		expect(fieldOf(init, "type")).toMatchObject({
			control: "select",
			value: "operation",
		});
		expect(init.readOnly.map((r) => r.label)).toEqual(["Id"]);
		const note = init.notes.find((n) =>
			n.includes("consumable-kind"),
		) as string;
		expect(note).toContain("Billing consumes Charge");
		expect(note).toContain("advice, not a block");
		const saved = only(await save(session, init, { type: "event" }));
		expect(saved).toMatchObject({ type: "saved", file: "a.json" });
		expect(
			(await p.json("a.json")).boundedcontexts.pay.services.gateway.provides
				.charge.type,
		).toBe("event");
		// the other file is untouched even though its consumptions now take an event
		expect(
			(await p.json("b.json")).boundedcontexts.shop.services.billing.consumes,
		).toHaveLength(2);
	});
});

describe("F2 a relationship's ends are read-only, its roles and evidence are not", () => {
	it("shows type and ends with the reason they cannot change, and saves roles, a linked comment and a disposition in one edit", async () => {
		const p = await project(teamTexts());
		const request = {
			kind: "update",
			file: "b.json",
			ref: "#/relationships/a.json/ledger/upstream-downstream/.../claims",
			family: "relationship",
		} as const;
		const ref = (await p.json("b.json")).relationships[0];
		expect(ref.upstream.$ref).toBe("a.json#/boundedcontexts/ledger");
		const fresh = await p.port.readFresh();
		const declared = fresh.set.byPath("b.json")?.relationships[0].ref as string;
		const { session, init } = await open(p, { ...request, ref: declared });
		expect(init.readOnly.map((r) => [r.label, r.value])).toEqual([
			["Type", "upstream-downstream"],
			["Name", "(none)"],
			["Upstream", "Ledger (a.json)"],
			["Downstream", "Claims (b.json)"],
		]);
		expect(
			init.readOnly.every((r) => r.reason.includes("different relationship")),
		).toBe(true);
		const saved = only(
			await save(session, init, {
				downstreamRoles: ["conformist"],
				evidence: {
					comments: [
						{
							text: "ADR 7",
							link: { kind: "adr", url: "https://example.com/adr/7" },
						},
					],
					disposition: "tolerated",
				},
			}),
		);
		expect(saved).toMatchObject({ type: "saved", file: "b.json" });
		const intent = p.sent[0];
		if (intent.op !== "edit") throw new Error("edit expected");
		expect(intent.changes.map((c) => c.field).sort()).toEqual([
			"comments",
			"disposition",
			"downstreamRoles",
		]);
		// the retained ends are judged again as LC-CONTEXT on the relationship itself
		expect(
			(intent.checks ?? []).map((c) => [c.field, c.class, c.holder.ref]),
		).toEqual([
			["upstream", "LC-CONTEXT", declared],
			["downstream", "LC-CONTEXT", declared],
		]);
		expect((await p.json("b.json")).relationships[0]).toMatchObject({
			downstreamRoles: ["conformist"],
			disposition: "tolerated",
			comments: [
				{
					text: "ADR 7",
					link: { kind: "adr", url: "https://example.com/adr/7" },
				},
			],
		});
		const bad = await open(p, { ...request, ref: declared });
		const refused = only(
			await save(bad.session, bad.init, {
				evidence: { comments: [{ text: " ", link: { kind: "adr", url: "" } }] },
			}),
		);
		expect(errorsOf(refused).length).toBe(2);
	});
});

describe("handoff: a list that holds refs this form cannot read is never half-rewritten", () => {
	it("refuses to save a changed list that would drop a retained unreadable ref, and keeps it through an unrelated edit", async () => {
		const p = await project(billing().texts);
		await p.edit("b.json", (j) => {
			j.boundedcontexts.shop.services.billing.consumes[0].by.push({
				$ref: "gone.json#/boundedcontexts/x/services/y/provides/z",
			});
		});
		const fresh = await p.port.readFresh();
		const ref = fresh.set
			.byPath("b.json")
			?.boundedcontexts.get("shop")
			?.services.get("billing")?.consumptions[0].ref as string;
		const request = {
			kind: "update",
			file: "b.json",
			ref,
			family: "consumption",
		} as const;
		const a = await open(p, request);
		const run = fieldOf(a.init, "by").value as string[];
		expect(run).toHaveLength(1);
		const dropped = only(await save(a.session, a.init, { by: [] }));
		expect(errorsOf(dropped)[0]).toMatchObject({
			field: "by",
			message: expect.stringContaining(
				"gone.json#/boundedcontexts/x/services/y/provides/z",
			),
		});
		expect(p.sent).toHaveLength(0);
		const b = await open(p, request);
		const kept = only(await save(b.session, b.init, { pattern: "conformist" }));
		expect(kept).toMatchObject({ type: "saved" });
		const by = (await p.json("b.json")).boundedcontexts.shop.services.billing
			.consumes[0].by;
		expect(by.map((r: { $ref: string }) => r.$ref)).toContain(
			"gone.json#/boundedcontexts/x/services/y/provides/z",
		);
	});
});

describe("handoff: answer triggers follow the draft then and starts, and a deadline updates through the real writer", () => {
	const rmDir = path.resolve(__dirname, "../../../../models/rivermart/.ods");
	const rivermart = async () =>
		project({
			"rivermart.json": await fs.readFile(
				path.join(rmDir, "rivermart.json"),
				"utf8",
			),
			// an unrelated file of the set: it must never be written
			"other.json": asText({ name: "Other" }),
		});
	const HOLD = "#/boundedcontexts/payments/processes/hold_attempt";
	const answersOf = (init: { fields: FormField[] }) =>
		(fieldOf(init, "on").choices ?? []).filter(
			(c) => c.detail?.startsWith("answer") && !c.disabledReason,
		);

	it("offers a newly legal answer and drops a now-illegal one as then and starts change, and Save agrees through the real writer", async () => {
		const p = await rivermart();
		const before = await p.bytes();
		const { session, init } = await open(p, {
			kind: "update",
			file: "rivermart.json",
			ref: HOLD,
			family: "process",
		});
		// saved: the process starts on AuthorisePayment, whose call to the acquirer it made, so its answers are offered
		expect(answersOf(init).length).toBeGreaterThan(1);
		const retry = tokenOf(init, "then", "RetryHold");

		// starts and then both cleared in the draft: nothing says it made the call, so no answer is offered and the held one says why
		const cleared = await change(session, init, "starts", {
			starts: [],
			// biome-ignore lint/suspicious/noThenProperty: "then" is the process's own schema property
			then: [],
		});
		expect(answersOf(cleared)).toEqual([]);
		const held = fieldOf(cleared, "on").choices?.find((c) =>
			c.detail?.startsWith("answer"),
		);
		expect(held?.disabledReason).toContain("did not make the call");

		// then names the operation that makes the call: the answers are legal again, with no save in between
		const issued = await change(session, init, "then", {
			// biome-ignore lint/suspicious/noThenProperty: "then" is the process's own schema property
			then: [retry],
		});
		const offered = answersOf(issued);
		expect(offered.length).toBeGreaterThan(1);

		// Save through the real writer, on an answer that is legal only because of the drafted then
		const saved = only(
			await save(session, init, {
				starts: [],
				// biome-ignore lint/suspicious/noThenProperty: "then" is the process's own schema property
				then: [retry],
				on: [offered[0].value],
			}),
		);
		expect(saved).toMatchObject({ type: "saved", file: "rivermart.json" });
		const after = await p.bytes();
		expect(Object.keys(after).filter((f) => after[f] !== before[f])).toEqual([
			"rivermart.json",
		]);
		const written = (await p.json("rivermart.json")).boundedcontexts.payments
			.processes.hold_attempt;
		expect(written.starts ?? []).toEqual([]);
		expect(written.then).toHaveLength(1);
		expect(written.on).toHaveLength(1);
	});

	it("refuses, with nothing sent, an answer the drafted then no longer supports", async () => {
		const p = await rivermart();
		const { session, init } = await open(p, {
			kind: "update",
			file: "rivermart.json",
			ref: HOLD,
			family: "process",
		});
		const [first] = answersOf(init);
		const refused = only(
			await save(session, init, {
				starts: [],
				// biome-ignore lint/suspicious/noThenProperty: "then" is the process's own schema property
				then: [],
				on: [first.value],
			}),
		);
		expect(refused.type).toBe("validation");
		expect(errorsOf(refused)[0]).toMatchObject({ field: "on" });
		expect(p.sent).toHaveLength(0);
	});

	it("says so, offers nothing and refuses Save when the set the draft produces cannot be built, while unrelated editing carries on", async () => {
		const p = await rivermart();
		const { session, init } = await open(p, {
			kind: "update",
			file: "rivermart.json",
			ref: HOLD,
			family: "process",
		});
		const [first] = answersOf(init);
		const real = WorkspaceSet.fromSchemas.bind(WorkspaceSet);
		// The one seam: the draft set is the only caller that hands the loader a Map (the host's own reads pass an array), so only it fails, as a real unbuildable draft would.
		const unbuildable = vi
			.spyOn(WorkspaceSet, "fromSchemas")
			.mockImplementation((entries) => {
				if (entries instanceof Map) throw new Error("a schema no longer loads");
				return real(entries);
			});
		try {
			const refreshed = await change(session, init, "then", {
				// biome-ignore lint/suspicious/noThenProperty: "then" is the process's own schema property
				then: [],
			});
			const on = fieldOf(refreshed, "on");
			// no saved-only choice is offered as if judged, the field says what failed and what to do
			expect(on.choices).toEqual([]);
			expect(on.disabledReason).toMatch(/cannot be judged/);
			expect(on.disabledReason).toMatch(/a schema no longer loads/);
			expect(on.disabledReason).toMatch(/reload|reopen/);
			// what the person had chosen is kept, not silently dropped
			expect(on.value).toEqual(fieldOf(init, "on").value);
			// other fields are untouched
			expect(fieldOf(refreshed, "name").disabledReason).toBeUndefined();

			const refused = only(
				await save(session, init, {
					// biome-ignore lint/suspicious/noThenProperty: "then" is the process's own schema property
					then: [],
					on: [first.value],
				}),
			);
			expect(refused.type).toBe("validation");
			// each field the draft changes the judgment of is named; no other
			expect(errorsOf(refused)).toEqual([
				{ field: "on", message: on.disabledReason },
				{
					field: "ends",
					message: fieldOf(refreshed, "ends").disabledReason,
				},
			]);
			expect(p.sent).toHaveLength(0);

			// an edit that leaves then and starts alone needs no draft set and saves
			const other = await open(p, {
				kind: "update",
				file: "rivermart.json",
				ref: HOLD,
				family: "process",
			});
			const saved = only(
				await save(other.session, other.init, { description: "unrelated" }),
			);
			expect(saved).toMatchObject({ type: "saved", file: "rivermart.json" });
			expect(p.sent).toHaveLength(1);
		} finally {
			unbuildable.mockRestore();
		}
	});

	it("an added policy sees its drafted then too: no answer before it issues the call, the answers once it does", async () => {
		const p = await rivermart();
		const { session, init } = await open(p, {
			kind: "add",
			file: "rivermart.json",
			parentRef: "#/boundedcontexts/payments",
			family: "policy",
		});
		expect(answersOf(init)).toEqual([]);
		const issued = await change(session, init, "then", {
			// biome-ignore lint/suspicious/noThenProperty: "then" is the policy's own schema property
			then: [tokenOf(init, "then", "RetryHold")],
		});
		expect(answersOf(issued).length).toBeGreaterThan(1);
	});

	it("updates a deadline: populated fields, one changed field in one edit, and only the owning file changes", async () => {
		const p = await rivermart();
		const before = await p.bytes();
		const fresh = await p.port.readFresh();
		const deadline = fresh.set
			.byPath("rivermart.json")
			?.boundedcontexts.get("cart_&_checkout")
			?.processes.get("checkout")
			?.deadlines.get("authorisation_expiry");
		if (!deadline) throw new Error("rivermart's checkout deadline");
		const { session, init } = await open(p, {
			kind: "update",
			file: "rivermart.json",
			ref: deadline.ref,
			family: "deadline",
		});
		expect(init.title).toContain("Authorisation expiry");
		expect(fieldOf(init, "name").value).toBe("Authorisation expiry");
		expect(fieldOf(init, "description").value).toContain(
			"The hold Payments took",
		);
		expect(fieldOf(init, "after").value).toBe(
			"when the hold expires; the interviews give no interval",
		);
		expect(fieldOf(init, "from").choices?.length).toBeGreaterThan(0);
		expect(init.readOnly.map((r) => r.label)).toEqual(["Id"]);

		const saved = only(await save(session, init, { after: "thirty minutes" }));
		expect(saved).toMatchObject({ type: "saved", file: "rivermart.json" });
		const intent = p.sent[0];
		if (intent.op !== "edit") throw new Error("edit expected");
		expect(intent.changes.map((c) => c.field)).toEqual(["after"]);
		const after = await p.bytes();
		expect(Object.keys(after).filter((f) => after[f] !== before[f])).toEqual([
			"rivermart.json",
		]);
		const written = (await p.json("rivermart.json")).boundedcontexts[
			"cart_&_checkout"
		].processes.checkout.deadlines.authorisation_expiry;
		expect(written.after).toBe("thirty minutes");
		expect(written.name).toBe("Authorisation expiry");
		// the rest of the owning file is what it was
		const was = JSON.parse(before["rivermart.json"]);
		was.boundedcontexts[
			"cart_&_checkout"
		].processes.checkout.deadlines.authorisation_expiry.after =
			"thirty minutes";
		expect(await p.json("rivermart.json")).toEqual(was);
	});
});
