import { describe, expect, it } from "vitest";
import { codePoint } from "./order";

describe("the order of a set's files", () => {
	it("is by code point, never by locale", () => {
		expect(
			["b.json", "B.json", "a.json", "é.json", "z.json"].sort(codePoint),
		).toEqual(["B.json", "a.json", "b.json", "z.json", "é.json"]);
		expect(codePoint("a", "b")).toBe(-1);
		expect(codePoint("b", "a")).toBe(1);
		expect(codePoint("a", "a")).toBe(0);
	});
});
