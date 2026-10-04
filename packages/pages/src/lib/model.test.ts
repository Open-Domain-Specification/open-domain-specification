import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "./fixtures";
import { loadSet } from "./load";
import { anchorOf, localRoute, nameOf } from "./model";
import SetProbe from "./SetProbe.harness.svelte";
import { cxPayloads } from "./set-fixture";
import UseModelOutsideProvider from "./UseModelOutsideProvider.harness.svelte";

describe("useModel", () => {
	it("throws when there is no ModelProvider ancestor", () => {
		expect(() => render(UseModelOutsideProvider)).toThrow(
			/No ODS model in context/,
		);
	});
});

describe("nameOf", () => {
	it("prefers the name over the ref", () => {
		expect(nameOf({ ref: "#/x", name: "X" })).toBe("X");
	});

	it("falls back to the ref when there is no name", () => {
		expect(nameOf({ ref: "#/x" })).toBe("#/x");
	});
});

describe("routes written for the workspace on screen", () => {
	const cx = loadSet(cxPayloads());
	const [a, b] = cx.files;

	it("qualifies a ref by the file on screen when the reader holds more than one", () => {
		expect(localRoute(a.model, "#/boundedcontexts/ledger")).toBe(
			"#/workspaces/a.json/boundedcontexts/ledger",
		);
		expect(localRoute(b.model, "#/boundedcontexts/ledger")).toBe(
			"#/workspaces/b.json/boundedcontexts/ledger",
		);
		expect(localRoute(a.model, "#")).toBe("#/workspaces/a.json");
		expect(localRoute(b.model, "#/health")).toBe("#/workspaces/b.json/health");
	});

	it("leaves alone what is already a route to a file, or is no ref at all", () => {
		expect(localRoute(a.model, "#/workspaces/b.json/boundedcontexts/x")).toBe(
			"#/workspaces/b.json/boundedcontexts/x",
		);
		expect(localRoute(a.model, "https://example.com/x")).toBe(
			"https://example.com/x",
		);
	});

	it("leaves a ref as it is for a workspace alone, a set of one, or no model", () => {
		expect(localRoute(undefined, "#/boundedcontexts/ledger")).toBe(
			"#/boundedcontexts/ledger",
		);
		const alone = petstoreModel();
		expect(localRoute(alone, "#/boundedcontexts/x")).toBe(
			"#/boundedcontexts/x",
		);
		const one = loadSet([cxPayloads()[0]]);
		expect(localRoute(one.files[0].model, "#/boundedcontexts/x")).toBe(
			"#/boundedcontexts/x",
		);
		// A model whose workspace is in no set (one built outside it) has no file to qualify by.
		expect(localRoute({ ...a.model, workspace: alone.workspace }, "#/x")).toBe(
			"#/x",
		);
	});

	it("gives an anchor only to an element of the workspace on screen", () => {
		expect(
			anchorOf(a.model, a.workspace.boundedcontexts.get("ledger") as never),
		).toBe("#/boundedcontexts/ledger");
		// b's ledger has the same local ref and is not a's.
		expect(
			anchorOf(a.model, b.workspace.boundedcontexts.get("ledger") as never),
		).toBeUndefined();
	});
});

describe("the set a diagram reads its keys in", () => {
	it("is the one provided, else the model's, else none", () => {
		const set = loadSet(cxPayloads());
		const seen: Array<unknown> = [];
		render(SetProbe, { set: set.set, onsee: (s: unknown) => seen.push(s) });
		render(SetProbe, {
			model: set.files[0].model,
			onsee: (s: unknown) => seen.push(s),
		});
		render(SetProbe, { onsee: (s: unknown) => seen.push(s) });
		expect(seen).toEqual([set.set, set.set, undefined]);
	});
});
