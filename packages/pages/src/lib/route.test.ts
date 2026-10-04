import {
	identityKeyOf,
	Workspace,
	WorkspaceSet,
} from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { hashToModelRef, modelRefToHash } from "./ref-transport";
import {
	fileOfRoute,
	qualifies,
	routeIn,
	routeInFiles,
	routeOf,
	routeOfKey,
	routeTarget,
} from "./route";
import { linkedPair } from "./set-fixture";

/** Every file name the contract names, raw as a host holds it. */
const NAMES = [
	"a.json",
	"my team.json",
	"a#%.json",
	"ü/é.json",
	"a%41.json",
	"a/team.json",
	"😀.json",
];

describe("routes into a set", () => {
	it("keeps the route a one-file reader has always had", () => {
		expect(routeInFiles(1, "a.json", "#/boundedcontexts/ledger")).toBe(
			"#/boundedcontexts/ledger",
		);
		expect(routeInFiles(0, "a.json", "#")).toBe("#");
		expect(routeIn(undefined, "a.json", "#/health")).toBe("#/health");
	});

	it("names the file first once the reader holds more than one", () => {
		expect(routeInFiles(2, "a.json", "#/boundedcontexts/ledger")).toBe(
			"#/workspaces/a.json/boundedcontexts/ledger",
		);
		expect(routeInFiles(2, "a.json", "#")).toBe("#/workspaces/a.json");
		expect(routeInFiles(2, "a.json", "#/health")).toBe(
			"#/workspaces/a.json/health",
		);
	});

	it.each([
		["a#%.json", "#/workspaces/a%23%25.json/boundedcontexts/ledger"],
		["my team.json", "#/workspaces/my%20team.json/boundedcontexts/ledger"],
		["a%41.json", "#/workspaces/a%2541.json/boundedcontexts/ledger"],
		["ü/é.json", "#/workspaces/%C3%BC~1%C3%A9.json/boundedcontexts/ledger"],
		["a/team.json", "#/workspaces/a~1team.json/boundedcontexts/ledger"],
	])("writes %s as one pointer segment of the wire path", (file, route) => {
		expect(routeInFiles(2, file, "#/boundedcontexts/ledger")).toBe(route);
		expect(fileOfRoute(route)).toEqual({
			file,
			ref: "#/boundedcontexts/ledger",
		});
	});

	it.each(NAMES)(
		"round trips %s through the route and through exactly one layer of URL encoding",
		(file) => {
			const route = routeInFiles(2, file, "#/boundedcontexts/ledger");
			expect(hashToModelRef(modelRefToHash(route))).toBe(route);
			expect(
				fileOfRoute(hashToModelRef(modelRefToHash(route)) as string),
			).toEqual({ file, ref: "#/boundedcontexts/ledger" });
		},
	);

	it("encodes each layer once: a# %.json is %2523 in the address bar, not %23", () => {
		const route = routeInFiles(2, "a#%.json", "#/boundedcontexts/ledger");
		expect(modelRefToHash(route)).toBe(
			"#/workspaces/a%2523%2525.json/boundedcontexts/ledger",
		);
		// A hash that was encoded twice is not a route.
		expect(
			hashToModelRef("#/workspaces/a%252523%252525.json/boundedcontexts/x"),
		).not.toBe(route);
	});

	it("reads no file from a route that names none, or one that is not a path", () => {
		for (const route of [
			"#",
			"#/health",
			"#/workspaces",
			"#/workspaces/",
			"#/boundedcontexts/ledger",
			"#/workspaces/~2.json/x",
			"#/workspaces/%zz.json/x",
			"#/workspaces/%2E%2E~1x.json/x",
			"#/workspaces/x.txt/x",
		])
			expect(fileOfRoute(route)).toBeUndefined();
	});

	it("keeps the pointer a route carries after the file exactly as it was", () => {
		const pointer = "#/boundedcontexts/a~1b/aggregates/c~0d";
		expect(fileOfRoute(routeInFiles(3, "x.json", pointer))?.ref).toBe(pointer);
	});
});

describe("routes of elements in a set", () => {
	const { a, b, set } = linkedPair();

	it("qualifies a reader of two files and not a reader of one or none", () => {
		expect(qualifies(set)).toBe(true);
		expect(qualifies(undefined)).toBe(false);
		const one = WorkspaceSet.fromWorkspaces([
			["only.json", new Workspace("Only", { description: "", version: "1" })],
		]);
		expect(qualifies(one)).toBe(false);
	});

	it("gives the two ledgers two routes, though their local refs are the same", () => {
		expect(a.ledger.ref).toBe(b.ledger.ref);
		expect(routeOf(a.ledger)).toBe(
			"#/workspaces/a.json/boundedcontexts/ledger",
		);
		expect(routeOf(b.ledger)).toBe(
			"#/workspaces/b.json/boundedcontexts/ledger",
		);
		expect(routeOf(a.ledger)).not.toBe(routeOf(b.ledger));
	});

	it("routes an element that is not part of a set, or a set of one, by its own ref", () => {
		const alone = new Workspace("Alone", { description: "", version: "1" });
		const domain = alone.addDomain("D", { description: "" });
		expect(routeOf(domain)).toBe(domain.ref);
		expect(routeOf({ ref: "#/anything" })).toBe("#/anything");
		const w = new Workspace("One", { description: "", version: "1" });
		const d = w.addDomain("D", { description: "" });
		WorkspaceSet.fromWorkspaces([["one.json", w]]);
		expect(routeOf(d)).toBe(d.ref);
	});

	it("reads a map key as the route of the exact file that owns the element", () => {
		expect(routeOfKey(set, identityKeyOf(a.ledger))).toBe(routeOf(a.ledger));
		expect(routeOfKey(set, identityKeyOf(b.ledger))).toBe(routeOf(b.ledger));
		expect(routeOfKey(set, identityKeyOf(b.post))).toBe(routeOf(b.post));
	});

	it("leaves a key with no file, or one that is not a key, as it is", () => {
		expect(routeOfKey(set, "#/boundedcontexts/ledger")).toBe(
			"#/boundedcontexts/ledger",
		);
		expect(routeOfKey(set, "not a ref")).toBe("not a ref");
		expect(routeOfKey(set, "%zz.json#/boundedcontexts/x")).toBe(
			"%zz.json#/boundedcontexts/x",
		);
	});

	it("reads a key as a local route in a set of one", () => {
		const w = new Workspace("One", { description: "", version: "1" });
		const bc = w
			.addDomain("D", { description: "" })
			.addSubdomain("S", { type: "core", description: "" })
			.addBoundedcontext("Ledger", { description: "" });
		const one = WorkspaceSet.fromWorkspaces([["one.json", w]]);
		expect(routeOfKey(one, identityKeyOf(bc))).toBe(bc.ref);
	});
});

describe("reading a route in a set", () => {
	const { a, b, set } = linkedPair();

	it("reads the set's own page from a route that names no file, never one file's page", () => {
		expect(routeTarget(set, "#")).toEqual({ kind: "set" });
		expect(routeTarget(set, "#/health")).toEqual({ kind: "set" });
		expect(routeTarget(set, "#/boundedcontexts/ledger")).toEqual({
			kind: "set",
		});
	});

	it("looks a qualified route up in exactly the file it names", () => {
		const inA = routeTarget(set, routeOf(a.ledger));
		const inB = routeTarget(set, routeOf(b.ledger));
		expect(inA).toEqual({
			kind: "workspace",
			workspace: a.ws,
			ref: "#/boundedcontexts/ledger",
		});
		expect(inB).toEqual({
			kind: "workspace",
			workspace: b.ws,
			ref: "#/boundedcontexts/ledger",
		});
		expect(routeTarget(set, "#/workspaces/a.json")).toEqual({
			kind: "workspace",
			workspace: a.ws,
			ref: "#",
		});
		expect(routeTarget(set, "#/workspaces/b.json/health")).toEqual({
			kind: "workspace",
			workspace: b.ws,
			ref: "#/health",
		});
	});

	it("names a file the set does not have, with the segment as written", () => {
		expect(
			routeTarget(set, "#/workspaces/gone.json/boundedcontexts/x"),
		).toEqual({
			kind: "unknown-file",
			file: "gone.json",
		});
		expect(routeTarget(set, "#/workspaces/%zz/x")).toEqual({
			kind: "unknown-file",
			file: "%zz",
		});
	});

	it("reads every route as local in a set of one", () => {
		const w = new Workspace("One", { description: "", version: "1" });
		const one = WorkspaceSet.fromWorkspaces([["one.json", w]]);
		expect(routeTarget(one, "#/boundedcontexts/ledger")).toEqual({
			kind: "workspace",
			workspace: w,
			ref: "#/boundedcontexts/ledger",
		});
	});
});
