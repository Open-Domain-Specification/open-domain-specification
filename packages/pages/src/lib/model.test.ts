import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { nameOf } from "./model";
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
