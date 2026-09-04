import { describe, expect, it } from "vitest";
import { makeRichTestWs } from "./makeTestWs";
import { Workspace } from "./workspace";

const rulesOf = (ws: Workspace) =>
	ws.validate().map((d) => `${d.severity}:${d.rule}`);

function emptyWorkspace() {
	return new Workspace("V", {
		odsVersion: "1.0.0",
		description: "",
		version: "0",
	});
}

describe("Workspace.validate", () => {
	it("only warns about the deliberately unserved reporting context in the rich fixture", () => {
		const { ws, reportingBc } = makeRichTestWs();
		expect(ws.validate()).toEqual([
			expect.objectContaining({
				rule: "context-serves-subdomain",
				severity: "warning",
				ref: reportingBc.ref,
			}),
		]);
	});

	it("requires exactly one root entity per aggregate", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const none = bc.addAggregate("None", { description: "" });
		none.addEntity("E", { description: "" });
		const two = bc.addAggregate("Two", { description: "" });
		two.addRootEntity("A", { description: "" });
		two.addRootEntity("B", { description: "" });
		const diagnostics = ws
			.validate()
			.filter((d) => d.rule === "aggregate-root");
		expect(diagnostics.map((d) => [d.severity, d.ref])).toEqual([
			["warning", none.ref],
			["error", two.ref],
		]);
	});

	it("only allows references to another aggregate's root", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const a = bc.addAggregate("A", { description: "" });
		const aRoot = a.addRootEntity("A", { description: "" });
		const b = bc.addAggregate("B", { description: "" });
		const bRoot = b.addRootEntity("B", { description: "" });
		const bLine = b.addEntity("Line", { description: "" });
		aRoot.references(bRoot, "ok");
		aRoot.references(bLine, "not root");
		aRoot.includes(bRoot, "not allowed");
		const messages = ws
			.validate()
			.filter((d) => d.rule === "cross-aggregate-reference")
			.map((d) => d.message);
		expect(messages).toHaveLength(2);
		expect(messages[0]).toContain("is not the root");
		expect(messages[1]).toContain('only "references" is allowed');
	});

	it("warns when cross-context consumptions lack roles", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const svc = up.addService("S", { description: "", type: "application" });
		const op = svc.provides("Op", { description: "", type: "operation" });
		down
			.addService("T", { description: "", type: "application" })
			.consumes(op, {});
		const rules = ws.validate().filter((d) => d.rule === "role-coherence");
		expect(rules).toHaveLength(2);
	});

	it("flags consumptions between contexts that declared separate ways", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		up.separateWaysFrom(down);
		const op = up
			.addService("S", { description: "", type: "application" })
			.provides("Op", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			});
		down
			.addService("T", { description: "", type: "application" })
			.consumes(op, { pattern: "conformist" });
		expect(rulesOf(ws)).toContain("error:separate-ways");
	});

	it("flags internal consumables consumed or joined from another context", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const evt = up
			.addService("S", { description: "", type: "application" })
			.provides("Happened", { description: "", type: "event", internal: true });
		down
			.addService("T", { description: "", type: "application" })
			.consumes(evt, { pattern: "conformist" });
		down.addPolicy("React", { description: "" }).on(evt);
		const rules = ws.validate().filter((d) => d.rule === "internal-consumable");
		expect(rules).toHaveLength(2);
		// Internal consumables are exempt from the upstream-role warning.
		expect(rulesOf(ws)).not.toContain("warning:role-coherence");
	});

	it("keeps payload schemas inside the publishing context", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const shape = a.addSchema("Shape");
		b.addService("S", { description: "", type: "application" }).provides("Op", {
			description: "",
			type: "operation",
			internal: true,
			pattern: "open-host-service",
			schema: shape,
		});
		expect(rulesOf(ws)).toContain("error:schema-context");
		expect(rulesOf(ws)).toContain("warning:internal-consumable");
	});

	it("checks consumable kinds on policies and raises", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const svc = bc.addService("S", { description: "", type: "application" });
		const evt = svc.provides("Evt", { description: "", type: "event" });
		const op = svc.provides("Op", { description: "", type: "operation" });
		bc.addPolicy("Backwards", { description: "" }).on(op).then(evt);
		evt.raises(op);
		const rules = ws.validate().filter((d) => d.rule === "consumable-kind");
		expect(rules.map((d) => d.message)).toEqual([
			expect.stringContaining("is an operation, not an event"),
			expect.stringContaining("is an event, not an operation"),
			expect.stringContaining("declares raises"),
			expect.stringContaining('raises "Op", which is an operation'),
		]);
	});

	it("warns about incomplete policies", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		bc.addPolicy("Idle", { description: "" });
		expect(rulesOf(ws)).toContain("warning:policy-complete");
	});
});

describe("comments-required", () => {
	/** Two contexts, one commented relationship and one bare one. */
	function twoRelationships(options?: Workspace["options"]) {
		const ws = new Workspace("V", {
			odsVersion: "1.0.0",
			description: "",
			version: "0",
			options,
		});
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const c = ws.addBoundedContext("C", { description: "" });
		a.upstreamOf(b, { comments: [{ text: "B reads A through an ACL." }] });
		const bare = a.partnerOf(c);
		return { ws, bare };
	}

	const commentsRequiredIn = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "comments-required");

	it("is off unless the workspace opts in", () => {
		expect(commentsRequiredIn(twoRelationships().ws)).toEqual([]);
		expect(commentsRequiredIn(twoRelationships({}).ws)).toEqual([]);
		expect(commentsRequiredIn(twoRelationships({ rules: {} }).ws)).toEqual([]);
		expect(
			commentsRequiredIn(
				twoRelationships({ rules: { commentsRequired: false } }).ws,
			),
		).toEqual([]);
	});

	it("warns once per uncommented relationship, at that relationship's ref", () => {
		const { ws, bare } = twoRelationships({
			rules: { commentsRequired: true },
		});
		expect(commentsRequiredIn(ws)).toEqual([
			{
				severity: "warning",
				rule: "comments-required",
				message: expect.stringContaining("nothing is written down"),
				ref: bare.ref,
			},
		]);
	});

	it("names both contexts and the type, so the Problems row reads on its own", () => {
		const { ws } = twoRelationships({ rules: { commentsRequired: true } });
		const [warning] = commentsRequiredIn(ws);
		expect(warning.message).toContain('"A"');
		expect(warning.message).toContain('"C"');
		expect(warning.message).toContain("partnership");
	});

	it("goes quiet once the relationship carries a comment", () => {
		const { ws, bare } = twoRelationships({
			rules: { commentsRequired: true },
		});
		bare.comments.push({ text: "A and C release together, see ADR-014." });
		expect(commentsRequiredIn(ws)).toEqual([]);
	});

	it("ignores uncommented consumables and consumptions, which are not relationships", () => {
		const { ws, bare } = twoRelationships({
			rules: { commentsRequired: true },
		});
		bare.comments.push({ text: "Documented." });
		const a = ws.getBoundedContextByRefOrThrow("#/boundedcontexts/a");
		const b = ws.getBoundedContextByRefOrThrow("#/boundedcontexts/b");
		const svc = a.addService("S", { description: "", type: "application" });
		const op = svc.provides("Op", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		b.addService("T", { description: "", type: "application" }).consumes(op, {
			pattern: "conformist",
		});

		expect(op.comments).toEqual([]);
		expect(commentsRequiredIn(ws)).toEqual([]);
	});

	it("survives the round trip, so the option is a property of the file", () => {
		const { ws } = twoRelationships({ rules: { commentsRequired: true } });
		const rebuilt = Workspace.fromSchema(
			JSON.parse(JSON.stringify(ws.toSchema())),
		);
		expect(rebuilt.options).toEqual({ rules: { commentsRequired: true } });
		expect(commentsRequiredIn(rebuilt)).toHaveLength(1);
	});

	it("writes no options key when the workspace sets none", () => {
		const schema = JSON.parse(JSON.stringify(twoRelationships().ws.toSchema()));
		expect(schema).not.toHaveProperty("options");
	});
});
