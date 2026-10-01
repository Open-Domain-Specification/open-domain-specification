import { describe, expect, it } from "vitest";
import { graphIdentifier } from "./identifier";

describe("graphIdentifier", () => {
	it("leaves ordinary scalar canonical refs unchanged", () => {
		expect(graphIdentifier("#/boundedcontexts/sales")).toBe(
			"#/boundedcontexts/sales",
		);
	});

	it("keeps malformed units, replacement text and reserved-prefix text distinct", () => {
		const ids = ["\ud800", "\udc00", "�", "__ods_utf16_d800"];
		expect(new Set(ids.map(graphIdentifier)).size).toBe(ids.length);
	});

	it("keeps DOT controls and their literal escape spellings distinct", () => {
		const ids = ["a\nb", "a\\nb", "a\0b", "a\\0b", "a\u007fb", "a\u0085b"];
		expect(new Set(ids.map(graphIdentifier)).size).toBe(ids.length);
		expect(ids.slice(0, 3).map(graphIdentifier)).not.toContain(ids[0]);
	});
});
