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

	it("warns about incomplete policies", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		bc.addPolicy("Idle", { description: "" });
		expect(rulesOf(ws)).toContain("warning:policy-complete");
	});
});
