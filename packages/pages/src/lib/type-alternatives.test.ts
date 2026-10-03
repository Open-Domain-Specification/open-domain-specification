import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { typeAlternatives } from "./type-alternatives";

describe("typeAlternatives", () => {
	it.each([
		["a union of quoted literals", "'a' | 'b'", ["'a' | ", "'b'"]],
		["a union with no spaces", "A|B", ["A|", "B"]],
		[
			"three alternatives",
			"'pacs.008' | 'pacs.002' | 'pain.001'",
			["'pacs.008' | ", "'pacs.002' | ", "'pain.001'"],
		],
		["a run of whitespace after the pipe", "A |   B", ["A |   ", "B"]],
		["a tab after the pipe", "A |\tB", ["A |\t", "B"]],
		["a pipe with no space before it", "A| B", ["A| ", "B"]],
		[
			"a pipe inside angle brackets is not top level",
			"Array<'a' | 'b'> | null",
			["Array<'a' | 'b'> | ", "null"],
		],
		[
			"a pipe inside braces and a trailing array mark is one piece",
			"{source: 'subscription' | 'discs', amount: Money}[]",
			["{source: 'subscription' | 'discs', amount: Money}[]"],
		],
		["a pipe inside parentheses", "(A | B) | C", ["(A | B) | ", "C"]],
		["a pipe inside square brackets", "[A | B]", ["[A | B]"]],
		["a pipe inside double quotes", '"a | b" | "c"', ['"a | b" | ', '"c"']],
		["a pipe inside backticks", "`a | b` | `c`", ["`a | b` | ", "`c`"]],
		[
			"an escaped quote does not end the literal",
			"'it\\'s | x'",
			["'it\\'s | x'"],
		],
		[
			"an escaped quote followed by a real pipe",
			"'it\\'s' | 'x'",
			["'it\\'s' | ", "'x'"],
		],
		[
			"a backslash escape of a backslash",
			"'a\\\\' | 'b'",
			["'a\\\\' | ", "'b'"],
		],
		[
			"nesting of different brackets balances",
			"{a: [1 | 2], b: (C | D)} | E",
			["{a: [1 | 2], b: (C | D)} | ", "E"],
		],
		[
			"generic closers inside nesting",
			"Map<K, List<V>> | Z",
			["Map<K, List<V>> | ", "Z"],
		],
		["no top-level pipe", "date-time", ["date-time"]],
		["a type with spaces and no pipe", "ISO 4217 code", ["ISO 4217 code"]],
		["a type with a trailing array mark", "string[]", ["string[]"]],
		["the empty string", "", [""]],
	])("splits %s losslessly", (_name, input, expected) => {
		const pieces = typeAlternatives(input);
		expect(pieces).toEqual(expected);
		expect(pieces.join("")).toBe(input);
	});

	it.each([
		["an unterminated single quote", "'a | b"],
		["an unterminated double quote", '"a" | "b'],
		["an unterminated backtick", "`a | b"],
		["a quote that ends on its own escape", "'a | b\\"],
		["a stray closing paren", "A) | B"],
		["a stray closing square bracket", "A] | B"],
		["a stray closing brace", "A} | B"],
		["a wrong closer", "(A] | B"],
		["a wrong closer for braces", "{A) | B"],
		["an unclosed paren", "(A | B"],
		["an unclosed brace", "{a: A | B"],
		["an unclosed square bracket", "[A | B"],
		["an unclosed angle bracket", "<A | B"],
		["a closing angle bracket with no opener", "int > 0 | string"],
		["an arrow function", "() => A | B"],
		["a leading pipe", "| A"],
		["a trailing pipe", "A |"],
		["a trailing pipe with whitespace", "A |  "],
		["a doubled pipe", "A || B"],
		["a whitespace-only alternative", "A |   | B"],
		["only a pipe", "|"],
	])("falls back to the whole text for %s", (_name, input) => {
		expect(typeAlternatives(input)).toEqual([input]);
	});

	it("never changes the text and never yields an empty piece, over every attribute type the reference models author", () => {
		const types = new Set<string>();
		const collect = (node: unknown): void => {
			if (Array.isArray(node)) {
				for (const item of node) collect(item);
			} else if (node && typeof node === "object") {
				const record = node as Record<string, unknown>;
				const attributes = record.attributes;
				if (attributes && typeof attributes === "object") {
					for (const attribute of Object.values(attributes)) {
						const type = (attribute as { type?: unknown } | null)?.type;
						if (typeof type === "string") types.add(type);
					}
				}
				for (const value of Object.values(record)) collect(value);
			}
		};
		const models = join(__dirname, "../../../../models");
		const files = readdirSync(models, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.flatMap((entry) => {
				const ods = join(models, entry.name, ".ods");
				try {
					return readdirSync(ods)
						.filter((f) => f.endsWith(".json") && f !== "schema.json")
						.map((f) => join(ods, f));
				} catch {
					return [];
				}
			});
		expect(files.length).toBeGreaterThanOrEqual(5);
		for (const file of files) collect(JSON.parse(readFileSync(file, "utf8")));
		// The corpus must contain the shapes this work is about, or the loop proves nothing.
		expect(types.has("'passport' | 'driving-licence'")).toBe(true);
		expect(types.has("ISO 4217 code")).toBe(true);
		expect(types.has("date-time")).toBe(true);
		expect(types.size).toBeGreaterThan(50);
		let split = 0;
		for (const type of types) {
			const pieces = typeAlternatives(type);
			expect(pieces.join(""), type).toBe(type);
			for (const piece of pieces) expect(piece, type).not.toBe("");
			if (pieces.length > 1) split += 1;
		}
		expect(split).toBeGreaterThan(20);
	});
});
