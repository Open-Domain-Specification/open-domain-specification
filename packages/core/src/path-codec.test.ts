import { describe, expect, it } from "vitest";
import {
	decodeWirePath,
	encodeWirePath,
	relativeWirePath,
	resolveWirePath,
	validateSetPath,
} from "./path-codec";

const roundTrips: Array<[string, string]> = [
	["a.json", "a.json"],
	["my team.json", "my%20team.json"],
	["a#%.json", "a%23%25.json"],
	["ü/é.json", "%C3%BC/%C3%A9.json"],
	["a%41.json", "a%2541.json"],
	["😀/team.json", "%F0%9F%98%80/team.json"],
	["a/team.json", "a/team.json"],
	["we~ird-name_1.json", "we~ird-name_1.json"],
	["\uFEFFa.json", "%EF%BB%BFa.json"],
	["x/\uFEFFa.json", "x/%EF%BB%BFa.json"],
	["\uFEFFx/\uFEFFy/\uFEFFa.json", "%EF%BB%BFx/%EF%BB%BFy/%EF%BB%BFa.json"],
	["\uFEFF\uFEFFa.json", "%EF%BB%BF%EF%BB%BFa.json"],
	["a\uFEFFb.json", "a%EF%BB%BFb.json"],
];

describe("SetPath and WirePath", () => {
	it.each(roundTrips)(
		"raw %s is wire %s, encoded once and decoded to the raw path",
		(raw, wire) => {
			expect(validateSetPath(raw)).toEqual({ ok: true, path: raw });
			expect(encodeWirePath(raw)).toBe(wire);
			expect(decodeWirePath(wire)).toEqual({ ok: true, path: raw });
		},
	);

	it("keeps the raw path and the wire path distinct: a raw %41 is never the letter A", () => {
		const wire = encodeWirePath("a%41.json");
		expect(wire).not.toBe("a%41.json");
		const decoded = decodeWirePath("a%41.json");
		expect(decoded).toEqual({ ok: true, path: "aA.json" });
		expect(decodeWirePath(wire)).toEqual({ ok: true, path: "a%41.json" });
	});

	it("accepts lowercase hex and normalises it to uppercase on the next encode", () => {
		const decoded = decodeWirePath("%c3%bc.json");
		expect(decoded).toEqual({ ok: true, path: "ü.json" });
		expect(encodeWirePath("ü.json")).toBe("%C3%BC.json");
	});

	const invalidSetPaths: Array<[string, string]> = [
		["", "empty-segment"],
		["/a.json", "absolute"],
		["a//b.json", "empty-segment"],
		["a/", "empty-segment"],
		["a/../b.json", "escapes-root"],
		["./a.json", "invalid-character"],
		["a\\b.json", "forbidden-character"],
		["a\u0000.json", "forbidden-character"],
		["a\nb.json", "forbidden-character"],
		["a.txt", "not-json"],
		["A.JSON", "not-json"],
		[".json", "not-json"],
		["x/schema.json", "reserved-name"],
		["\ud800.json", "invalid-utf8"],
	];
	it.each(invalidSetPaths)(
		"refuses the raw set path %j as %s",
		(raw, cause) => {
			const result = validateSetPath(raw);
			expect(result).toMatchObject({ ok: false, cause });
		},
	);
});

describe("decodeWirePath", () => {
	const invalid: Array<[string, string]> = [
		["%", "malformed-percent"],
		["%G1.json", "malformed-percent"],
		["%2", "malformed-percent"],
		["a%zz.json", "malformed-percent"],
		["%C3.json", "invalid-utf8"],
		["%C0%AF.json", "invalid-utf8"],
		["%ED%A0%80.json", "invalid-utf8"],
		["%EF%BB%BF%C3.json", "invalid-utf8"],
		["a%00.json", "forbidden-character"],
		["a%0A.json", "forbidden-character"],
		["a%2Fb.json", "forbidden-character"],
		["a%5Cb.json", "forbidden-character"],
		["a\\b.json", "forbidden-character"],
		["/abs.json", "absolute"],
		["x//b.json", "empty-segment"],
		["x/", "empty-segment"],
		["", "empty-segment"],
		["http://x/b.json", "invalid-character"],
		["file:b.json", "invalid-character"],
		["C:/b.json", "invalid-character"],
		["ü.json", "invalid-character"],
		["my team.json", "invalid-character"],
		["a?x.json", "invalid-character"],
		["a#b.json", "invalid-character"],
	];
	it.each(invalid)(
		"refuses the wire path %j as %s without throwing",
		(wire, cause) => {
			let result: ReturnType<typeof decodeWirePath> | undefined;
			expect(() => {
				result = decodeWirePath(wire);
			}).not.toThrow();
			expect(result).toMatchObject({ ok: false, cause });
		},
	);
});

describe("resolveWirePath", () => {
	const valid: Array<[string, string, string]> = [
		["a.json", "b.json", "b.json"],
		["a.json", "./b.json", "b.json"],
		["x/a.json", "b.json", "x/b.json"],
		["a/team.json", "../b/team.json", "b/team.json"],
		["x.json", "a/../b.json", "b.json"],
		["a/x.json", "%2E%2E/b.json", "b.json"],
		["a/x.json", "%2e%2e/b.json", "b.json"],
		["a.json", "%C3%BC/%C3%A9.json", "ü/é.json"],
	];
	it.each(valid)(
		"from %s the wire path %s names %s",
		(from, wire, expected) => {
			expect(resolveWirePath(from, wire)).toEqual({ ok: true, path: expected });
		},
	);

	const refused: Array<[string, string, string]> = [
		["a.json", "../b.json", "escapes-root"],
		["a/team.json", "../../x.json", "escapes-root"],
		["a.json", "%2E%2E/b.json", "escapes-root"],
		["a.json", "b.txt", "not-json"],
		["a.json", "b/..", "not-json"],
		["a.json", ".", "not-json"],
		["a.json", "schema.json", "reserved-name"],
		["a/b.json", "../schema.json", "reserved-name"],
		["a.json", "%2E%2E%2Fb.json", "forbidden-character"],
		["a.json", "x//b.json", "empty-segment"],
	];
	it.each(refused)(
		"from %s the wire path %s is refused as %s",
		(from, wire, cause) => {
			expect(resolveWirePath(from, wire)).toMatchObject({ ok: false, cause });
		},
	);
});

describe("relativeWirePath", () => {
	const pairs: Array<[string, string, string]> = [
		["a.json", "b.json", "b.json"],
		["a/team.json", "b/team.json", "../b/team.json"],
		["b/team.json", "a/team.json", "../a/team.json"],
		["a.json", "ü/é.json", "%C3%BC/%C3%A9.json"],
		["a/x.json", "a/y.json", "y.json"],
		["a/b/x.json", "c.json", "../../c.json"],
		["x.json", "a#%.json", "a%23%25.json"],
		["a/x.json", "a/b/y.json", "b/y.json"],
	];
	it.each(pairs)(
		"from %s the file %s is written %s and resolves back",
		(from, to, wire) => {
			expect(relativeWirePath(from, to)).toBe(wire);
			expect(resolveWirePath(from, wire)).toEqual({ ok: true, path: to });
		},
	);
});
