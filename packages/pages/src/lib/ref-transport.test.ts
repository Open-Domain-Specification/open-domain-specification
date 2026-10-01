import { describe, expect, it } from "vitest";
import { hashToModelRef, modelRefToHash } from "./ref-transport";

describe("model ref URL transport", () => {
	it.each([
		"#",
		"#/boundedcontexts/a~1b",
		"#/boundedcontexts/a~01b",
		"#/boundedcontexts/%2F",
		"#/boundedcontexts/returns",
		"#/boundedcontexts/",
		"#/boundedcontexts/é",
		"#/boundedcontexts/.",
		"#/boundedcontexts/a\\b",
	])("round trips %s through exactly one percent-encoding layer", (ref) => {
		expect(hashToModelRef(modelRefToHash(ref))).toBe(ref);
	});

	it("keeps literal percent text distinct from an encoded slash", () => {
		expect(modelRefToHash("#/boundedcontexts/%2F")).toBe(
			"#/boundedcontexts/%252F",
		);
		expect(modelRefToHash("#/boundedcontexts/a~1b")).toBe(
			"#/boundedcontexts/a~1b",
		);
	});

	it("leaves ordinary structural slashes unchanged", () => {
		expect(modelRefToHash("#/boundedcontexts/sales")).toBe(
			"#/boundedcontexts/sales",
		);
		expect(hashToModelRef("#/boundedcontexts/sales")).toBe(
			"#/boundedcontexts/sales",
		);
	});

	it("rejects malformed or non-route fragment payloads", () => {
		expect(hashToModelRef("#/boundedcontexts/100%")).toBeUndefined();
		expect(hashToModelRef("#overview")).toBeUndefined();
		expect(hashToModelRef("#/!utf16/xyz")).toBeUndefined();
	});

	it("round trips unpaired UTF-16 without throwing or replacement", () => {
		for (const ref of [
			"#/boundedcontexts/\ud800",
			"#/boundedcontexts/\udc00",
		]) {
			const hash = modelRefToHash(ref);
			expect(hash).toMatch(/^#\/!utf16\//);
			expect(hashToModelRef(hash)).toBe(ref);
		}
	});
});
