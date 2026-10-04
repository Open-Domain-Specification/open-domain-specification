import { describe, expect, it } from "vitest";
import { encodeWirePath } from "./path-codec";
import {
	decodeRefSegment,
	encodeRefSegment,
	parseRef,
	parseRelationshipRef,
	qualifiedRelationshipRef,
	relationshipRef,
} from "./reference";

describe("parseRef", () => {
	it("reads a fragment-only ref as local", () => {
		expect(parseRef("#/boundedcontexts/ledger")).toEqual({
			ok: true,
			local: true,
			pointer: "#/boundedcontexts/ledger",
		});
	});

	it("splits a qualified ref at the first # and leaves the pointer untouched", () => {
		const pointer = `#/boundedcontexts/${encodeRefSegment("a/~#%")}`;
		const written = `${encodeWirePath("a#%.json")}${pointer}`;
		expect(written).toBe("a%23%25.json#/boundedcontexts/a~1~0#%");
		expect(parseRef(written)).toEqual({
			ok: true,
			local: false,
			wire: "a%23%25.json",
			pointer,
		});
		expect(decodeRefSegment("a~1~0#%")).toBe("a/~#%");
	});

	const refused: Array<[string, string]> = [
		["a.json", "malformed-pointer"],
		["#x", "malformed-pointer"],
		["a.json#x", "malformed-pointer"],
		["%zz.json#/x", "malformed-percent"],
		["/a.json#/x", "absolute"],
		["x//a.json#/x", "empty-segment"],
		["http://x/a.json#/x", "invalid-character"],
		["a\\b.json#/x", "forbidden-character"],
	];
	it.each(refused)("refuses %j as %s without throwing", (ref, cause) => {
		let parsed: ReturnType<typeof parseRef> | undefined;
		expect(() => {
			parsed = parseRef(ref);
		}).not.toThrow();
		expect(parsed).toMatchObject({ ok: false, cause });
	});
});

describe("relationship refs with an end in another file", () => {
	it("keeps the five and six segment forms byte-identical", () => {
		expect(relationshipRef("a", "partnership", "b")).toBe(
			"#/relationships/a/partnership/b",
		);
		expect(parseRelationshipRef("#/relationships/a/partnership/b/n")).toEqual({
			sourceId: "a",
			type: "partnership",
			targetId: "b",
			nameId: "n",
		});
	});

	it("writes paths as one pointer segment each, encoded once, and reads them back", () => {
		const ref = qualifiedRelationshipRef(
			{ path: ".", id: "ledger" },
			"upstream-downstream",
			{ path: "../b/my%20team.json", id: "a/~#%" },
			"feed",
		);
		expect(ref).toBe(
			"#/relationships/./ledger/upstream-downstream/..~1b~1my%20team.json/a~1~0#%/feed",
		);
		expect(parseRelationshipRef(ref)).toEqual({
			sourceId: "ledger",
			sourcePath: ".",
			type: "upstream-downstream",
			targetId: "a/~#%",
			targetPath: "../b/my%20team.json",
			nameId: "feed",
		});
	});

	it("reads the seven segment form without a name", () => {
		const ref = qualifiedRelationshipRef(
			{ path: "b.json", id: "x" },
			"partnership",
			{ path: ".", id: "y" },
		);
		expect(parseRelationshipRef(ref)).toEqual({
			sourceId: "x",
			sourcePath: "b.json",
			type: "partnership",
			targetId: "y",
			targetPath: ".",
		});
	});

	const malformed = [
		"#/relationships/./a/nope/./b",
		"#/relationships/%zz/a/partnership/./b",
		"#/relationships/./a/partnership/./b/",
		"#/relationships/./a/partnership/~2/b",
		"#/relationships/./a/partnership/./b/n/extra",
		"#/relationships/x/./a/partnership/./b",
	];
	it.each(malformed)("does not parse %s", (ref) => {
		expect(parseRelationshipRef(ref)).toBeUndefined();
	});
});
