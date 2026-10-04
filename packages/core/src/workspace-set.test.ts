import { describe, expect, it } from "vitest";
import { filesOf, linkedPair } from "./linked-fixture";
import { deadlineAnchor, processTrigger, REF_KINDS } from "./ref-kinds";
import { parseConsumptionRef, parseRelationshipRef } from "./reference";
import type { WorkspaceSchema } from "./schema";
import {
	Aggregate,
	Answer,
	BoundedContext,
	Consumable,
	Service,
	Workspace,
} from "./workspace";
import {
	kindOfClass,
	type RefKind,
	type Resolution,
	setKeyOf,
	WorkspaceSet,
} from "./workspace-set";

/** One complete team workspace; every team has the same local ids on purpose. */
function team(name: string, extra = false) {
	const ws = new Workspace(name, { description: "", version: "test" });
	const sub = ws
		.addDomain("Bank", { description: "" })
		.addSubdomain("Core", { type: "core", description: "" });
	const ledger = sub.addBoundedcontext("Ledger", { description: "" });
	const risk = sub.addBoundedcontext("Risk", { description: "" });
	if (extra) sub.addBoundedcontext("Extra", { description: "" });
	const payments = ledger.addService("Payments", {
		description: "",
		type: "domain",
	});
	const receipt = ledger.addSchema("Receipt");
	const decline = ledger.addSchema("Decline");
	const post = payments.provides("Post", {
		description: "",
		type: "operation",
		returns: receipt,
		rejects: [decline],
	});
	return { ws, ledger, risk, payments, post, receipt, decline };
}

const context = kindOfClass("a bounded context", BoundedContext);
const operation = kindOfClass("an operation", Consumable);
const service = kindOfClass("a service", Service);
const aggregate = kindOfClass("an aggregate", Aggregate);
const contextOrService = kindOfClass(
	"a context or service",
	BoundedContext,
	Service,
);

function ok<T extends object>(result: Resolution<T>): T {
	if (!result.ok) throw new Error(`${result.cause}: ${result.detail}`);
	return result.target;
}

describe("WorkspaceSet.fromWorkspaces", () => {
	it("keeps the input order, finds a workspace by path, and tells each workspace its file", () => {
		const a = team("Team A");
		const b = team("Team B");
		const set = WorkspaceSet.fromWorkspaces([
			["b.json", b.ws],
			["a.json", a.ws],
		]);
		expect(set.workspaces).toEqual([b.ws, a.ws]);
		expect(set.byPath("a.json")).toBe(a.ws);
		expect(set.byPath("c.json")).toBeUndefined();
		expect(a.ws.file).toBe("a.json");
		expect(a.ws.set).toBe(set);
	});

	it("throws for a programming error and joins nothing when an entry is refused", () => {
		const a = team("Team A");
		const b = team("Team B");
		expect(() =>
			WorkspaceSet.fromWorkspaces([
				["a.json", a.ws],
				["../b.json", b.ws],
			]),
		).toThrow(/escapes-root/);
		expect(a.ws.file).toBeUndefined();
		expect(() =>
			WorkspaceSet.fromWorkspaces([
				["a.json", a.ws],
				["a.json", b.ws],
			]),
		).toThrow(/given twice/);
		expect(() =>
			WorkspaceSet.fromWorkspaces([
				["a.json", a.ws],
				["b.json", a.ws],
			]),
		).toThrow(/already in a set/);
		expect(a.ws.set).toBeUndefined();
		WorkspaceSet.fromWorkspaces([["a.json", a.ws]]);
		expect(() => WorkspaceSet.fromWorkspaces([["z.json", a.ws]])).toThrow(
			/already in a set/,
		);
	});
});

describe("two complete workspaces with the same ledger and operation ids", () => {
	function pair() {
		const a = team("Team A", false);
		const b = team("Team B", true);
		const set = WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		return { a, b, set };
	}
	const opPointer = "#/boundedcontexts/ledger/services/payments/provides/post";

	it("resolves a fragment in the source workspace and a file-qualified ref in the named one", () => {
		const { a, b, set } = pair();
		expect(a.ledger.ref).toBe(b.ledger.ref);
		expect(ok(set.resolve(a.ws, "#/boundedcontexts/ledger", context))).toBe(
			a.ledger,
		);
		expect(ok(set.resolve(b.ws, "#/boundedcontexts/ledger", context))).toBe(
			b.ledger,
		);
		expect(
			ok(set.resolve(a.ws, "b.json#/boundedcontexts/ledger", context)),
		).toBe(b.ledger);
		expect(
			ok(set.resolve(b.ws, "a.json#/boundedcontexts/ledger", context)),
		).toBe(a.ledger);
		expect(ok(set.resolve(a.ws, opPointer, operation))).toBe(a.post);
		expect(ok(set.resolve(a.ws, `b.json${opPointer}`, operation))).toBe(b.post);
		expect(ok(set.resolve(b.ws, `a.json${opPointer}`, operation))).toBe(a.post);
		const self = set.resolve(a.ws, `./a.json${opPointer}`, operation);
		expect(ok(self)).toBe(a.post);
	});

	it("never falls back from a fragment to another workspace", () => {
		const { a, b, set } = pair();
		expect(
			b.ws.getBoundedContextByRef("#/boundedcontexts/extra"),
		).toBeDefined();
		const result = set.resolve(a.ws, "#/boundedcontexts/extra", context);
		expect(result).toMatchObject({
			ok: false,
			cause: "missing-target",
			file: "a.json",
		});
		const qualified = set.resolve(
			a.ws,
			"b.json#/boundedcontexts/extra",
			context,
		);
		expect(qualified).toMatchObject({ ok: true, workspace: b.ws });
	});

	it("resolves answers of both workspaces apart", () => {
		const { a, b, set } = pair();
		const answer = kindOfClass("an answer", Answer);
		const pointer = `${opPointer}/returns`;
		expect(ok(set.resolve(a.ws, pointer, answer))).toBe(a.post.returned());
		expect(ok(set.resolve(a.ws, `b.json${pointer}`, answer))).toBe(
			b.post.returned(),
		);
	});

	it("returns a result, never throws, for a missing file, a missing target, a wrong kind and a bad path", () => {
		const { a, set } = pair();
		const attempts: Array<[string, Partial<Resolution<object>>]> = [
			[
				"c.json#/boundedcontexts/ledger",
				{ cause: "missing-file", file: "c.json" },
			],
			[
				"../b.json#/boundedcontexts/ledger",
				{ cause: "invalid-path", reason: "escapes-root" },
			],
			[
				"%zz.json#/boundedcontexts/ledger",
				{ cause: "invalid-path", reason: "malformed-percent" },
			],
			["b.json", { cause: "invalid-path", reason: "malformed-pointer" }],
			[
				"b.txt#/boundedcontexts/ledger",
				{ cause: "invalid-path", reason: "not-json" },
			],
			["#/boundedcontexts/nope", { cause: "missing-target" }],
			[
				"b.json#/boundedcontexts/nope",
				{ cause: "missing-target", file: "b.json" },
			],
			["#/boundedcontexts/ledger/services/payments", { cause: "wrong-kind" }],
			[
				"b.json#/boundedcontexts/ledger/services/payments",
				{ cause: "wrong-kind", file: "b.json" },
			],
			["#/", { cause: "missing-target" }],
		];
		for (const [written, expected] of attempts) {
			let result: Resolution<BoundedContext> | undefined;
			expect(() => {
				result = set.resolve(a.ws, written, context);
			}).not.toThrow();
			expect(result, written).toMatchObject({ ok: false, ...expected });
		}
	});

	it("reports the thing found when it is the wrong kind, and accepts a union kind", () => {
		const { a, set } = pair();
		const pointer = "#/boundedcontexts/ledger/services/payments";
		const wrong = set.resolve(a.ws, pointer, aggregate);
		expect(wrong).toMatchObject({ ok: false, cause: "wrong-kind" });
		if (!wrong.ok && wrong.cause === "wrong-kind")
			expect(wrong.found).toBe(a.payments);
		expect(ok(set.resolve(a.ws, pointer, contextOrService))).toBe(a.payments);
		expect(ok(set.resolve(a.ws, pointer, service))).toBe(a.payments);
	});

	it("throws only when the source workspace is not in the set", () => {
		const { set } = pair();
		const stranger = team("Stranger");
		expect(() =>
			set.resolve(stranger.ws, "#/boundedcontexts/ledger", context),
		).toThrow(/not in this set/);
	});

	it("refTo writes the relative wire path and resolve reads it back to the same object", () => {
		const { a, b, set } = pair();
		expect(set.refTo(a.ws, a.ledger)).toBe("#/boundedcontexts/ledger");
		expect(set.refTo(a.ws, b.ledger)).toBe("b.json#/boundedcontexts/ledger");
		expect(set.refTo(b.ws, a.post)).toBe(`a.json${opPointer}`);
		expect(ok(set.resolve(a.ws, set.refTo(a.ws, b.post), operation))).toBe(
			b.post,
		);
		const stranger = team("Stranger");
		expect(() => set.refTo(a.ws, stranger.ledger)).toThrow(/not an element/);
	});
});

describe("files whose names need the codec", () => {
	const names = [
		"my team.json",
		"a#%.json",
		"ü/é.json",
		"😀/team.json",
		"a%41.json",
	];
	it.each(names)(
		"%s is written, resolved and keyed through its wire path",
		(file) => {
			const a = team("Team A");
			const b = team("Team B");
			const set = WorkspaceSet.fromWorkspaces([
				["a.json", a.ws],
				[file, b.ws],
			]);
			const written = set.refTo(a.ws, b.ledger);
			expect(written.endsWith("#/boundedcontexts/ledger")).toBe(true);
			expect(written).toMatch(
				/^[A-Za-z0-9\-._~%/]+#\/boundedcontexts\/ledger$/,
			);
			expect(ok(set.resolve(a.ws, written, context))).toBe(b.ledger);
			expect(setKeyOf(b.ledger)).toBe(written);
			const back = set.refTo(b.ws, a.ledger);
			expect(ok(set.resolve(b.ws, back, context))).toBe(a.ledger);
		},
	);

	it("writes the documented spelling of a#%.json", () => {
		const a = team("Team A");
		const b = team("Team B");
		const set = WorkspaceSet.fromWorkspaces([
			["a#%.json", a.ws],
			["c.json", b.ws],
		]);
		expect(set.refTo(b.ws, a.ledger)).toBe(
			"a%23%25.json#/boundedcontexts/ledger",
		);
	});
});

describe("nested folders, escaped traversal and a valid cycle", () => {
	it("reaches the sibling folder with .. and the cycle resolves both ways", () => {
		const a = team("Team A");
		const b = team("Team B");
		const set = WorkspaceSet.fromWorkspaces([
			["a/team.json", a.ws],
			["b/team.json", b.ws],
		]);
		expect(set.refTo(a.ws, b.ledger)).toBe(
			"../b/team.json#/boundedcontexts/ledger",
		);
		expect(set.refTo(b.ws, a.ledger)).toBe(
			"../a/team.json#/boundedcontexts/ledger",
		);
		expect(
			ok(set.resolve(a.ws, "../b/team.json#/boundedcontexts/ledger", context)),
		).toBe(b.ledger);
		expect(
			ok(set.resolve(b.ws, "../a/team.json#/boundedcontexts/ledger", context)),
		).toBe(a.ledger);
		expect(
			ok(
				set.resolve(
					a.ws,
					"%2E%2E/b/team.json#/boundedcontexts/ledger",
					context,
				),
			),
		).toBe(b.ledger);
		expect(
			set.resolve(a.ws, "../../team.json#/boundedcontexts/ledger", context),
		).toMatchObject({
			ok: false,
			cause: "invalid-path",
			reason: "escapes-root",
		});
		expect(
			set.resolve(a.ws, "..%2Fb/team.json#/boundedcontexts/ledger", context),
		).toMatchObject({
			ok: false,
			cause: "invalid-path",
			reason: "forbidden-character",
		});
	});
});

describe("setKeyOf", () => {
	it("is the wire path of the owning file and the element's own ref", () => {
		const a = team("Team A");
		const b = team("Team B");
		WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		expect(setKeyOf(a.ledger)).toBe("a.json#/boundedcontexts/ledger");
		expect(setKeyOf(b.ledger)).toBe("b.json#/boundedcontexts/ledger");
		expect(setKeyOf(a.post.returned())).toBe(`a.json${a.post.ref}/returns`);
	});

	it("is absent for a standalone workspace", () => {
		expect(setKeyOf(team("Alone").ledger)).toBeUndefined();
	});

	it("does not change when workspaces are added, removed or reordered", () => {
		const layouts: Array<Array<[string, string]>> = [
			[["a.json", "a"]],
			[
				["a.json", "a"],
				["b.json", "b"],
			],
			[
				["b.json", "b"],
				["a.json", "a"],
			],
			[
				["z.json", "z"],
				["a.json", "a"],
				["m.json", "m"],
			],
			[
				["a.json", "a"],
				["x/y.json", "y"],
				["b.json", "b"],
			],
		];
		const keys = layouts.map((layout) => {
			const members = layout.map(([file, name]) => [file, team(name)] as const);
			WorkspaceSet.fromWorkspaces(members.map(([file, it]) => [file, it.ws]));
			const mine = members.find(([file]) => file === "a.json");
			if (!mine) throw new Error("a.json missing");
			const [, a] = mine;
			return [
				setKeyOf(a.ledger),
				setKeyOf(a.post),
				setKeyOf(a.post.returned()),
			];
		});
		for (const key of keys) expect(key).toEqual(keys[0]);
		expect(keys[0]).toEqual([
			"a.json#/boundedcontexts/ledger",
			"a.json#/boundedcontexts/ledger/services/payments/provides/post",
			"a.json#/boundedcontexts/ledger/services/payments/provides/post/returns",
		]);
	});
});

describe("composite identities across workspaces", () => {
	function linked() {
		const a = team("Team A");
		const b = team("Team B");
		const set = WorkspaceSet.fromWorkspaces([
			["a/team.json", a.ws],
			["b/team.json", b.ws],
		]);
		return { a, b, set };
	}

	it("tells two same-ref schemas' refusals apart as answers", () => {
		const { a, b, set } = linked();
		expect(a.decline.ref).toBe(b.decline.ref);
		const mine = a.post.rejected(a.decline);
		const theirs = a.post.rejected(b.decline);
		expect(theirs).not.toBe(mine);
		expect(theirs.schema).toBe(b.decline);
		expect(a.post.rejected(b.decline)).toBe(theirs);
		expect(mine.ref).toBe(`${a.post.ref}/rejects/ledger/decline`);
		expect(theirs.ref).toBe(
			`${a.post.ref}/rejects-in/..~1b~1team.json/ledger/decline`,
		);
		expect(a.ws.getAnswerByRef(theirs.ref)).toBeUndefined();
		a.post.rejections.push({
			schema: b.decline,
			many: false,
			reasons: ["late"],
		});
		const reasoned = a.post.rejected(b.decline, "late");
		expect(a.ws.getAnswerByRef(reasoned.ref)).toBe(reasoned);
		expect(a.ws.getAnswerByRef(theirs.ref)).toBe(theirs);
		expect(a.ws.getAnswerByRef(mine.ref)).toBe(mine);
		expect(set.refTo(a.ws, theirs)).toBe(theirs.ref);
	});

	it("does not read a rejects-in ref that names its own file, a missing file or an escaping path", () => {
		const { a, b } = linked();
		a.post.rejections.push({ schema: b.decline, many: false, reasons: [] });
		const base = `${a.post.ref}/rejects-in`;
		expect(a.ws.getAnswerByRef(`${base}/..~1b~1team.json/ledger/decline`)).toBe(
			a.post.rejected(b.decline),
		);
		expect(
			a.ws.getAnswerByRef(`${base}/team.json/ledger/decline`),
		).toBeUndefined();
		expect(
			a.ws.getAnswerByRef(`${base}/..~1c~1team.json/ledger/decline`),
		).toBeUndefined();
		expect(
			a.ws.getAnswerByRef(`${base}/..~1..~1x.json/ledger/decline`),
		).toBeUndefined();
		expect(
			a.ws.getAnswerByRef(`${base}/%zz.json/ledger/decline`),
		).toBeUndefined();
		expect(
			a.ws.getAnswerByRef(`${base}/..~1b~1team.json/ledger`),
		).toBeUndefined();
	});

	it("gives a consumer two consumptions of two same-ref operations two identities that parse back", () => {
		const { a, b, set } = linked();
		const mine = a.payments.consumes(a.post);
		const theirs = a.payments.consumes(b.post);
		expect(mine.consumable.ref).toBe(theirs.consumable.ref);
		expect(mine.ref).toBe(
			"#/boundedcontexts/ledger/services/payments/consumes/#~1boundedcontexts~1ledger~1services~1payments~1provides~1post",
		);
		expect(theirs.ref).not.toBe(mine.ref);
		expect(theirs.ref).toContain("..~1b~1team.json#~1boundedcontexts");
		expect(parseConsumptionRef(theirs.ref)).toEqual({
			consumerRef: a.payments.ref,
			consumableRef: set.refTo(a.ws, b.post),
		});
		expect(a.ws.findConsumption(theirs.ref)).toBe(theirs);
		expect(a.ws.findConsumption(mine.ref)).toBe(mine);
	});

	it("gives relationships to same-id contexts of two workspaces two identities that parse back", () => {
		const { a, b } = linked();
		const mine = a.ws.addRelationship({
			type: "upstream-downstream",
			upstream: a.ledger,
			downstream: a.risk,
		});
		const theirs = a.ws.addRelationship({
			type: "upstream-downstream",
			upstream: a.ledger,
			downstream: b.risk,
		});
		const reversed = a.ws.addRelationship({
			type: "partnership",
			participants: [b.ledger, a.risk],
			name: "feed",
		});
		expect(mine.ref).toBe("#/relationships/ledger/upstream-downstream/risk");
		expect(theirs.ref).toBe(
			"#/relationships/./ledger/upstream-downstream/..~1b~1team.json/risk",
		);
		expect(parseRelationshipRef(theirs.ref)).toEqual({
			sourceId: "ledger",
			sourcePath: ".",
			type: "upstream-downstream",
			targetId: "risk",
			targetPath: "../b/team.json",
		});
		expect(parseRelationshipRef(reversed.ref)).toMatchObject({
			sourcePath: "../b/team.json",
			targetPath: ".",
			nameId: "feed",
		});
		expect(new Set([mine.ref, theirs.ref, reversed.ref]).size).toBe(3);
		expect(a.ws.findRelationship(theirs.ref)).toBe(theirs);
	});

	it("treats reading a cross-workspace identity before the set exists as a programming error", () => {
		const a = team("Team A");
		const b = team("Team B");
		const consumption = a.payments.consumes(b.post);
		expect(() => consumption.ref).toThrow(/WorkspaceSet/);
		WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		expect(() => consumption.ref).not.toThrow();
	});

	it("keeps same-workspace identities byte-identical to a standalone workspace", () => {
		const alone = team("Alone");
		const consumption = alone.payments.consumes(alone.post);
		const before = [
			consumption.ref,
			alone.post.rejected(alone.decline).ref,
			alone.ws.addRelationship({
				type: "partnership",
				participants: [alone.ledger, alone.risk],
			}).ref,
		];
		WorkspaceSet.fromWorkspaces([["alone.json", alone.ws]]);
		const after = [
			consumption.ref,
			alone.post.rejected(alone.decline).ref,
			alone.ws.relationships[0].ref,
		];
		expect(after).toEqual(before);
	});
});

describe("files whose names differ only by a leading U+FEFF", () => {
	const bom = "\uFEFFa.json";
	it("keeps a.json and the BOM-prefixed file as two distinct workspaces", () => {
		const plain = team("Plain");
		const marked = team("Marked");
		const other = team("Other");
		const full = WorkspaceSet.fromWorkspaces([
			["a.json", plain.ws],
			[bom, marked.ws],
			["c.json", other.ws],
		]);
		expect(full.byPath("a.json")).toBe(plain.ws);
		expect(full.byPath(bom)).toBe(marked.ws);
		const toMarked = full.refTo(other.ws, marked.ledger);
		const toPlain = full.refTo(other.ws, plain.ledger);
		expect(toMarked).toBe("%EF%BB%BFa.json#/boundedcontexts/ledger");
		expect(toPlain).toBe("a.json#/boundedcontexts/ledger");
		expect(ok(full.resolve(other.ws, toMarked, context))).toBe(marked.ledger);
		expect(ok(full.resolve(other.ws, toPlain, context))).toBe(plain.ledger);
		expect(setKeyOf(marked.ledger)).toBe(toMarked);
		expect(setKeyOf(plain.ledger)).toBe(toPlain);
		expect(setKeyOf(marked.ledger)).not.toBe(setKeyOf(plain.ledger));
	});

	it("keeps a BOM in a later folder segment and a repeated BOM distinct", () => {
		const nested = team("Nested");
		const twice = team("Twice");
		const stripped = team("Stripped");
		const from = team("From");
		const full = WorkspaceSet.fromWorkspaces([
			["x/\uFEFFa.json", nested.ws],
			["\uFEFF\uFEFFa.json", twice.ws],
			["x/a.json", stripped.ws],
			["a.json", from.ws],
		]);
		const cases: Array<[typeof nested, string]> = [
			[nested, "x/%EF%BB%BFa.json"],
			[twice, "%EF%BB%BF%EF%BB%BFa.json"],
			[stripped, "x/a.json"],
		];
		for (const [t, wire] of cases) {
			const written = full.refTo(from.ws, t.ledger);
			expect(written).toBe(`${wire}#/boundedcontexts/ledger`);
			expect(ok(full.resolve(from.ws, written, context))).toBe(t.ledger);
			expect(setKeyOf(t.ledger)).toBe(written);
		}
	});
});

describe("the unresolved-ref reason names the file that owns the target", () => {
	function load(edit: (a: WorkspaceSchema) => void) {
		const files = filesOf(linkedPair().set);
		edit(files[0][1]);
		return WorkspaceSet.fromSchemas(files);
	}
	const unresolved = (set: WorkspaceSet) =>
		set.validate().filter((d) => d.rule === "unresolved-ref");
	const risk = (a: WorkspaceSchema) => a.boundedcontexts.risk;

	it("resolves a team that lives in the other file without a diagnostic: a foreign kind is legal", () => {
		const set = load((a) => {
			expect((risk(a).team as { $ref: string }).$ref).toBe(
				"b.json#/teams/platform",
			);
		});
		expect(unresolved(set)).toEqual([]);
		const a = set.byPath("a.json") as Workspace;
		const b = set.byPath("b.json") as Workspace;
		expect(a.getBoundedContextByRefOrThrow("#/boundedcontexts/risk").team).toBe(
			b.getTeamByRefOrThrow("#/teams/platform"),
		);
	});

	it("says the foreign target is in b.json and what kind was expected, without claiming the expected kind belongs to this workspace", () => {
		const set = load((a) => {
			(risk(a).team as { $ref: string }).$ref =
				"b.json#/boundedcontexts/ledger";
		});
		const [found, ...rest] = unresolved(set);
		expect(rest).toEqual([]);
		expect(found.file).toBe("a.json");
		expect(found.message).toContain(
			'"b.json#/boundedcontexts/ledger" in "team"',
		);
		expect(found.message).toContain(", which is in b.json but is not a team;");
		expect(found.message).not.toContain("of this workspace");
	});

	it("drops the workspace qualifier from a foreign kind that carries it mid-label too", () => {
		const set = load((a) => {
			(risk(a).subdomains as { $ref: string }[])[1] = {
				$ref: "b.json#/boundedcontexts/ledger",
			};
		});
		const [found] = unresolved(set);
		expect(found.message).toContain(
			", which is in b.json but is not a subdomain of a domain;",
		);
		expect(found.message).not.toContain("this workspace");
	});

	it("keeps the local wording exactly: a wrong kind in this very file is still of this workspace", () => {
		const set = load((a) => {
			(risk(a).team as { $ref: string }).$ref = "#/boundedcontexts/ledger";
		});
		const [found] = unresolved(set);
		expect(found.message).toContain(", which is not a team of this workspace;");
		expect(found.message).not.toContain("which is in");
	});
});

/**
 * What every exposed kind says of every kind of thing a pointer can name:
 * nothing there, something else there, and the right thing. A relationship,
 * a consumption and an answer are found by lookups of their own, which find
 * nothing for any other element, so the difference between "nothing there"
 * and "something else there" has to come from somewhere other than that
 * lookup.
 */
describe("every exposed kind tells nothing there from something else there", () => {
	const { a, b, links, set } = linkedPair();
	const answer = a.post.returned();
	const KINDS = Object.keys(REF_KINDS) as Array<keyof typeof REF_KINDS>;

	/** What exists in file A, and the kinds that name it. */
	const TARGETS: Array<
		[string, { ref: string }, Array<keyof typeof REF_KINDS>]
	> = [
		["a bounded context", a.ledger, ["context", "identityTarget", "element"]],
		["a team", a.team, ["team", "element"]],
		["a subdomain", a.sub, ["subdomain", "element"]],
		["a service", a.payments, ["element"]],
		["an aggregate", a.account, ["element"]],
		[
			"an entity",
			a.root,
			[
				"entity",
				"relationTarget",
				"identityTarget",
				"constrainable",
				"element",
			],
		],
		[
			"a value object",
			a.money,
			["valueObject", "relationTarget", "constrainable", "element"],
		],
		["a schema", a.receipt, ["schema", "identityTarget", "element"]],
		["an attribute", a.rootId, ["constrainable", "element"]],
		[
			"an operation",
			a.post,
			[
				"consumable",
				"caller",
				"constrainable",
				"reactionTrigger",
				"startingTrigger",
				"element",
			],
		],
		["a policy", a.react, ["caller", "element"]],
		["a process", a.settle, ["caller", "element"]],
		["a deadline", a.late, ["element"]],
		["an answer", answer, ["answer", "reactionTrigger", "element"]],
		["a relationship", a.agreement, ["relationship"]],
		["a consumption", links.consumption, ["consumption"]],
	];
	/** The same shape of pointer as each kind of thing, naming nothing. */
	const GHOSTS: Array<[string, string]> = [
		["a context", "#/boundedcontexts/ghost"],
		[
			"an operation",
			"#/boundedcontexts/ledger/services/payments/provides/ghost",
		],
		["an answer", `${a.post.ref}/returns-ghost`],
		["a relationship", "#/relationships/ledger/upstream-downstream/ghost"],
		["a consumption", `${a.account.ref}/consumes/ghost`],
	];

	describe.each(KINDS)("%s", (name) => {
		const kind: RefKind<object> = REF_KINDS[name];

		it.each(GHOSTS)(
			"names nothing at the pointer of %s: missing-target in the file asked",
			(_, ghost) => {
				expect(set.resolve(b.ws, `a.json${ghost}`, kind)).toMatchObject({
					ok: false,
					cause: "missing-target",
					file: "a.json",
				});
				expect(set.resolve(a.ws, ghost, kind)).toMatchObject({
					ok: false,
					cause: "missing-target",
				});
			},
		);

		it.each(TARGETS)(
			"meets %s: right or wrong kind, found and in its own file",
			(_, target, accepted) => {
				const expected = accepted.includes(name);
				const across = set.resolve(b.ws, `a.json${target.ref}`, kind);
				const local = set.resolve(a.ws, target.ref, kind);
				for (const result of [across, local]) {
					if (expected) {
						expect(result).toMatchObject({ ok: true });
						if (result.ok) expect(result.target).toBe(target);
					} else {
						expect(result).toMatchObject({ ok: false, cause: "wrong-kind" });
						if (!result.ok && result.cause === "wrong-kind") {
							expect(result.found).toBe(target);
							expect(result.file).toBe("a.json");
						}
					}
				}
			},
		);
	});

	it("takes the specialised kinds at their word: nothing but the thing itself is one", () => {
		expect(REF_KINDS.relationship.is(a.ledger)).toBe(false);
		expect(REF_KINDS.relationship.is(a.agreement)).toBe(true);
		expect(REF_KINDS.consumption.is(a.ledger)).toBe(false);
		expect(REF_KINDS.consumption.is(links.consumption)).toBe(true);
		expect(REF_KINDS.answer.is(a.ledger)).toBe(false);
		expect(REF_KINDS.answer.is(answer)).toBe(true);
	});

	it("tells the triggers that depend on a process the same way", () => {
		const own = processTrigger(a.settle);
		const anchor = deadlineAnchor(a.settle);
		expect(set.resolve(b.ws, `a.json${a.late.ref}`, own)).toMatchObject({
			ok: true,
		});
		expect(set.resolve(a.ws, `b.json${b.late.ref}`, own)).toMatchObject({
			ok: false,
			cause: "wrong-kind",
		});
		expect(set.resolve(a.ws, a.late.ref, own)).toMatchObject({ ok: true });
		expect(set.resolve(a.ws, a.agreement.ref, own)).toMatchObject({
			ok: false,
			cause: "wrong-kind",
		});
		expect(set.resolve(a.ws, a.agreement.ref, anchor)).toMatchObject({
			ok: false,
			cause: "wrong-kind",
		});
		expect(set.resolve(a.ws, "#/boundedcontexts/ghost", anchor)).toMatchObject({
			ok: false,
			cause: "missing-target",
		});
	});
});
