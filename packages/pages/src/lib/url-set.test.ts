import { describe, expect, it, vi } from "vitest";
import {
	commonRoot,
	type FetchLike,
	incompleteness,
	LIMITS,
	loadFromUrls,
	type ResponseLike,
	setPathUnder,
	urlOf,
} from "./url-set";

const ROOT = "https://h.test/p/.ods/";

/** A workspace file that names others with qualified `$ref`s, as the metamodel writes them. */
const file = (...names: string[]) => ({
	name: "w",
	boundedcontexts: Object.fromEntries(
		names.map((n, i) => [
			`c${i}`,
			{ consumes: [{ consumable: { $ref: `${n}#/boundedcontexts/x` } }] },
		]),
	),
});

const ok = (value: unknown): ResponseLike => ({
	ok: true,
	status: 200,
	json: async () => value,
	text: async () => JSON.stringify(value),
});

/** A fake host: the files it serves by url, and a log of what was asked. */
function host(files: Record<string, unknown | ResponseLike | Error>) {
	const asked: string[] = [];
	const fetchFn: FetchLike = async (url) => {
		asked.push(url);
		const found = files[url];
		if (found === undefined)
			return { ok: false, status: 404, json: async () => ({}) };
		if (found instanceof Error) throw found;
		const response = found as ResponseLike;
		return typeof response.ok === "boolean" &&
			typeof response.json === "function"
			? response
			: ok(found);
	};
	return { fetchFn, asked };
}

describe("the folder a set of URLs lies under", () => {
	it("is the longest folder every address shares, on a segment boundary", () => {
		expect(commonRoot(["https://h.test/p/.ods/a.json"])).toBe(ROOT);
		expect(
			commonRoot([
				"https://h.test/p/.ods/a.json",
				"https://h.test/p/.ods/n/b.json",
			]),
		).toBe(ROOT);
		expect(
			commonRoot([
				"https://h.test/p/.ods/x/a.json",
				"https://h.test/p/.ods/y/b.json",
			]),
		).toBe(ROOT);
		expect(
			commonRoot([
				"https://h.test/p/.ods-a/a.json",
				"https://h.test/p/.ods/b.json",
			]),
		).toBe("https://h.test/p/");
		expect(commonRoot(["https://h.test/a.json"])).toBe("https://h.test/");
	});

	it("is nothing across hosts", () => {
		expect(
			commonRoot(["https://a.test/x/a.json", "https://b.test/x/a.json"]),
		).toBeUndefined();
	});

	it("reads each URL segment once, so an encoded space or # or % is the raw name", () => {
		expect(setPathUnder(ROOT, `${ROOT}my%20team.json`)).toEqual({
			ok: true,
			path: "my team.json",
		});
		expect(setPathUnder(ROOT, `${ROOT}a%23%25.json`)).toEqual({
			ok: true,
			path: "a#%.json",
		});
		expect(setPathUnder(ROOT, `${ROOT}%C3%BC/%C3%A9.json`)).toEqual({
			ok: true,
			path: "ü/é.json",
		});
		expect(setPathUnder(ROOT, `${ROOT}a%2541.json`)).toEqual({
			ok: true,
			path: "a%41.json",
		});
	});

	it("says why an address is not a path of the folder", () => {
		expect(setPathUnder(ROOT, "https://h.test/p/other/a.json")).toMatchObject({
			ok: false,
			detail: expect.stringContaining("not under"),
		});
		expect(setPathUnder(ROOT, "https://x.test/p/.ods/a.json")).toMatchObject({
			ok: false,
		});
		expect(setPathUnder(ROOT, `${ROOT}%E0%A4%A.json`)).toMatchObject({
			ok: false,
			detail: expect.stringContaining("percent-encoding"),
		});
		expect(setPathUnder(ROOT, `${ROOT}notes.txt`)).toMatchObject({
			ok: false,
			detail: expect.stringContaining("not-json"),
		});
		expect(setPathUnder(ROOT, ROOT)).toMatchObject({ ok: false });
	});

	it("writes a fetch address from the canonical path, never from a string handed to URL", () => {
		expect(urlOf(ROOT, "a#%.json")).toBe(`${ROOT}a%23%25.json`);
		expect(urlOf(ROOT, "ü/é.json")).toBe(`${ROOT}%C3%BC/%C3%A9.json`);
		expect(urlOf(ROOT, "my team.json")).toBe(`${ROOT}my%20team.json`);
	});
});

describe("reading a set from URLs", () => {
	it("reads one file with no ref to another as just that file", async () => {
		const h = host({ [`${ROOT}a.json`]: { name: "a" } });
		const load = await loadFromUrls({
			entries: [`${ROOT}a.json`],
			fetchFn: h.fetchFn,
		});
		expect(load.files.map((f) => f.path)).toEqual(["a.json"]);
		expect(load.failures).toEqual([]);
		expect(load.linked).toBe(false);
		expect(load.root).toBe(ROOT);
	});

	it("follows a qualified ref to its sibling and builds the sibling's address from the path", async () => {
		const h = host({
			[`${ROOT}a.json`]: file("b.json"),
			[`${ROOT}b.json`]: { name: "b" },
		});
		const load = await loadFromUrls({
			entries: [`${ROOT}a.json`],
			fetchFn: h.fetchFn,
		});
		expect(load.files.map((f) => f.path)).toEqual(["a.json", "b.json"]);
		expect(load.linked).toBe(true);
		expect(h.asked).toEqual([`${ROOT}a.json`, `${ROOT}b.json`]);
	});

	it("ends a cycle between two files by fetching each once", async () => {
		const h = host({
			[`${ROOT}a.json`]: file("b.json"),
			[`${ROOT}b.json`]: file("a.json", "b.json"),
		});
		const load = await loadFromUrls({
			entries: [`${ROOT}a.json`],
			fetchFn: h.fetchFn,
		});
		expect(load.files.map((f) => f.path)).toEqual(["a.json", "b.json"]);
		expect(h.asked).toEqual([`${ROOT}a.json`, `${ROOT}b.json`]);
		expect(load.failures).toEqual([]);
	});

	it("ends a cycle however long it is, and names no file twice in the result", async () => {
		const h = host({
			[`${ROOT}a.json`]: file("b.json", "c.json"),
			[`${ROOT}b.json`]: file("c.json", "a.json"),
			[`${ROOT}c.json`]: file("a.json", "b.json", "a.json"),
		});
		const load = await loadFromUrls({
			entries: [`${ROOT}a.json`],
			fetchFn: h.fetchFn,
		});
		expect(load.files.map((f) => f.path)).toEqual([
			"a.json",
			"b.json",
			"c.json",
		]);
		expect(h.asked).toHaveLength(3);
	});

	it("resolves a nested sibling with .. against the file that names it, inside the explicit root", async () => {
		const h = host({
			[`${ROOT}a/team.json`]: file("../b/team.json"),
			[`${ROOT}b/team.json`]: file("../a/team.json"),
		});
		const load = await loadFromUrls({
			entries: [`${ROOT}a/team.json`],
			root: ROOT,
			fetchFn: h.fetchFn,
		});
		expect(load.files.map((f) => f.path)).toEqual([
			"a/team.json",
			"b/team.json",
		]);
		expect(h.asked).toEqual([`${ROOT}a/team.json`, `${ROOT}b/team.json`]);
		expect(load.failures).toEqual([]);
	});

	it("does not fetch a path that leaves the root, and says which file wrote it", async () => {
		const h = host({
			[`${ROOT}a/team.json`]: file("../../x.json", "../../x.json"),
		});
		const load = await loadFromUrls({
			entries: [`${ROOT}a/team.json`],
			root: ROOT,
			fetchFn: h.fetchFn,
		});
		expect(h.asked).toEqual([`${ROOT}a/team.json`]);
		expect(load.failures).toHaveLength(1);
		expect(load.failures[0]).toMatchObject({
			kind: "invalid-path",
			from: "a/team.json",
			message: expect.stringContaining("escapes-root"),
		});
		expect(load.failures[0].message).toContain("Fix the $ref in a/team.json");
	});

	it("takes the encoded names of the contract, fetching each at its encoded address", async () => {
		const names = ["my team.json", "a#%.json", "ü/é.json", "a%41.json"];
		const files: Record<string, unknown> = {
			[`${ROOT}entry.json`]: file(
				"my%20team.json",
				"a%23%25.json",
				"%C3%BC/%C3%A9.json",
				"a%2541.json",
			),
		};
		for (const n of names) files[urlOf(ROOT, n)] = { name: n };
		const h = host(files);
		const load = await loadFromUrls({
			entries: [`${ROOT}entry.json`],
			fetchFn: h.fetchFn,
		});
		expect(load.files.map((f) => f.path)).toEqual([
			"a#%.json",
			"a%41.json",
			"entry.json",
			"my team.json",
			"ü/é.json",
		]);
		expect(h.asked).toEqual([
			`${ROOT}entry.json`,
			`${ROOT}my%20team.json`,
			`${ROOT}a%23%25.json`,
			`${ROOT}%C3%BC/%C3%A9.json`,
			`${ROOT}a%2541.json`,
		]);
	});

	it("keeps the same order whichever fetch finishes first", async () => {
		const files: Record<string, unknown> = {
			[`${ROOT}z.json`]: file("a.json", "m.json"),
			[`${ROOT}a.json`]: { name: "a" },
			[`${ROOT}m.json`]: { name: "m" },
		};
		const slowFirst: FetchLike = async (url) => {
			await new Promise((r) => setTimeout(r, url.endsWith("a.json") ? 20 : 0));
			return ok(files[url]);
		};
		const load = await loadFromUrls({
			entries: [`${ROOT}z.json`],
			fetchFn: slowFirst,
		});
		expect(load.files.map((f) => f.path)).toEqual([
			"a.json",
			"m.json",
			"z.json",
		]);
	});

	it("reads several entries and the files they name, each once", async () => {
		const h = host({
			[`${ROOT}a.json`]: file("c.json"),
			[`${ROOT}b.json`]: file("c.json"),
			[`${ROOT}c.json`]: { name: "c" },
		});
		const load = await loadFromUrls({
			entries: [`${ROOT}a.json`, `${ROOT}b.json`, `${ROOT}a.json`],
			fetchFn: h.fetchFn,
		});
		expect(load.files.map((f) => f.path)).toEqual([
			"a.json",
			"b.json",
			"c.json",
		]);
		expect(h.asked.filter((u) => u.endsWith("c.json"))).toHaveLength(1);
		expect(h.asked.filter((u) => u.endsWith("a.json"))).toHaveLength(1);
	});
});

describe("what goes wrong, and what the reader is told", () => {
	it("leaves a dependency that answers 404 out and says which file named it", async () => {
		const h = host({ [`${ROOT}a.json`]: file("gone.json") });
		const load = await loadFromUrls({
			entries: [`${ROOT}a.json`],
			fetchFn: h.fetchFn,
		});
		expect(load.files.map((f) => f.path)).toEqual(["a.json"]);
		expect(load.failures).toEqual([
			{
				kind: "http",
				path: "gone.json",
				url: `${ROOT}gone.json`,
				from: "a.json",
				message: `gone.json (named by a.json): The server answered 404 for ${ROOT}gone.json. Check the address is correct and the file is public, then choose Load to try again.`,
			},
		]);
	});

	it("reports a host that refuses cross-origin reads as unreachable, with the CORS action", async () => {
		const h = host({
			[`${ROOT}a.json`]: file("b.json"),
			[`${ROOT}b.json`]: new TypeError("Failed to fetch"),
		});
		const load = await loadFromUrls({
			entries: [`${ROOT}a.json`],
			fetchFn: h.fetchFn,
		});
		expect(load.failures).toHaveLength(1);
		expect(load.failures[0].kind).toBe("network");
		expect(load.failures[0].message).toContain("allows cross-origin requests");
		expect(load.failures[0].message).toContain("b.json (named by a.json)");
	});

	it("reports an entry that is not reachable as the whole error, in the words it always had", async () => {
		const h = host({ [`${ROOT}a.json`]: new TypeError("x") });
		const load = await loadFromUrls({
			entries: [`${ROOT}a.json`],
			fetchFn: h.fetchFn,
		});
		expect(load.files).toEqual([]);
		expect(load.failures[0].message).toBe(
			`Could not reach ${ROOT}a.json. Check the address and your connection, and that the host allows cross-origin requests, then choose Load to try again.`,
		);
	});

	it("reports a response that is not JSON, from a stream or from text or from json()", async () => {
		const enc = new TextEncoder();
		const stream = (chunks: Uint8Array[]): ResponseLike => {
			let i = 0;
			return {
				ok: true,
				json: async () => ({}),
				body: {
					getReader: () =>
						({
							read: async () =>
								i < chunks.length
									? { done: false, value: chunks[i++] }
									: { done: true, value: undefined },
							cancel: async () => undefined,
						}) as unknown as ReadableStreamDefaultReader<Uint8Array>,
				},
			};
		};
		const h = host({
			[`${ROOT}a.json`]: file("b.json", "c.json", "d.json"),
			[`${ROOT}b.json`]: stream([enc.encode("<html>")]),
			[`${ROOT}c.json`]: {
				ok: true,
				json: async () => ({}),
				text: async () => "nope",
			},
			[`${ROOT}d.json`]: {
				ok: true,
				json: async () => {
					throw new SyntaxError("Unexpected token <");
				},
			},
		});
		const load = await loadFromUrls({
			entries: [`${ROOT}a.json`],
			fetchFn: h.fetchFn,
		});
		expect(load.failures.map((f) => [f.kind, f.path])).toEqual([
			["not-json", "b.json"],
			["not-json", "c.json"],
			["not-json", "d.json"],
		]);
		expect(load.failures[0].message).toContain("is not valid JSON");
	});

	it("reads a streamed body in parts", async () => {
		const enc = new TextEncoder();
		const chunks = [enc.encode('{"na'), enc.encode('me":"s"}')];
		let i = 0;
		const h = host({
			[`${ROOT}a.json`]: {
				ok: true,
				json: async () => ({}),
				body: {
					getReader: () =>
						({
							read: async () =>
								i < chunks.length
									? { done: false, value: chunks[i++] }
									: { done: true, value: undefined },
						}) as unknown as ReadableStreamDefaultReader<Uint8Array>,
				},
			},
		});
		const load = await loadFromUrls({
			entries: [`${ROOT}a.json`],
			fetchFn: h.fetchFn,
		});
		expect(load.files[0].schema).toEqual({ name: "s" });
	});

	it("refuses a file over the byte bound, by its declared length, by its stream and by its text", async () => {
		const TWO_MIB = 2 * 1024 * 1024;
		const big = TWO_MIB + 1;
		const cancel = vi.fn(async () => undefined);
		const h = host({
			[`${ROOT}a.json`]: file(
				"declared.json",
				"streamed.json",
				"texted.json",
				"exact.json",
			),
			[`${ROOT}declared.json`]: {
				ok: true,
				headers: { get: () => String(big) },
				json: async () => ({}),
			},
			[`${ROOT}streamed.json`]: {
				ok: true,
				headers: { get: () => null },
				json: async () => ({}),
				body: {
					getReader: () =>
						({
							read: async () => ({ done: false, value: new Uint8Array(big) }),
							cancel,
						}) as unknown as ReadableStreamDefaultReader<Uint8Array>,
				},
			},
			[`${ROOT}texted.json`]: {
				ok: true,
				json: async () => ({}),
				text: async () => `"${"x".repeat(big)}"`,
			},
			[`${ROOT}exact.json`]: {
				ok: true,
				json: async () => ({}),
				text: async () => `"${"x".repeat(TWO_MIB - 2)}"`,
			},
		});
		const load = await loadFromUrls({
			entries: [`${ROOT}a.json`],
			fetchFn: h.fetchFn,
		});
		expect(load.failures.map((f) => [f.kind, f.path])).toEqual([
			["too-large", "declared.json"],
			["too-large", "streamed.json"],
			["too-large", "texted.json"],
		]);
		expect(cancel).toHaveBeenCalledOnce();
		expect(load.failures[0].message).toContain("larger than 2 MiB");
		// A file of exactly the bound is read.
		expect(load.files.map((f) => f.path)).toEqual(["a.json", "exact.json"]);
	});

	it("takes a header that is not a number as no declaration", async () => {
		const h = host({
			[`${ROOT}a.json`]: {
				ok: true,
				headers: { get: () => "many" },
				json: async () => ({ name: "a" }),
				text: async () => '{"name":"a"}',
			},
		});
		const load = await loadFromUrls({
			entries: [`${ROOT}a.json`],
			fetchFn: h.fetchFn,
		});
		expect(load.files).toHaveLength(1);
	});

	it("reports an entry outside the explicit root without fetching it", async () => {
		const h = host({});
		const load = await loadFromUrls({
			entries: ["https://h.test/elsewhere/a.json"],
			root: ROOT,
			fetchFn: h.fetchFn,
		});
		expect(h.asked).toEqual([]);
		expect(load.failures).toEqual([
			expect.objectContaining({
				kind: "outside-root",
				message: expect.stringContaining(`is not under the folder ${ROOT}`),
			}),
		]);
	});

	it("reports entries on several hosts as having no folder in common", async () => {
		const h = host({});
		const load = await loadFromUrls({
			entries: ["https://a.test/a.json", "https://b.test/b.json"],
			fetchFn: h.fetchFn,
		});
		expect(h.asked).toEqual([]);
		expect(load.failures).toHaveLength(1);
		expect(load.failures[0].message).toContain("more than one host");
	});

	it("accepts a root without its trailing slash", async () => {
		const h = host({ [`${ROOT}a.json`]: { name: "a" } });
		const load = await loadFromUrls({
			entries: [`${ROOT}a.json`],
			root: ROOT.slice(0, -1),
			fetchFn: h.fetchFn,
		});
		expect(load.root).toBe(ROOT);
		expect(load.files).toHaveLength(1);
	});

	it("reads an entry that is no path of the folder alone, and refuses it beside other files", async () => {
		const alone = await loadFromUrls({
			entries: ["https://h.test/dir/"],
			fetchFn: host({ "https://h.test/dir/": { name: "a" } }).fetchFn,
		});
		expect(alone.files).toHaveLength(1);
		expect(alone.failures).toEqual([]);
		const beside = await loadFromUrls({
			entries: ["https://h.test/dir/", "https://h.test/dir/b.json"],
			fetchFn: host({
				"https://h.test/dir/": { name: "a" },
				"https://h.test/dir/b.json": { name: "b" },
			}).fetchFn,
		});
		expect(beside.files.map((f) => f.path)).toEqual(["b.json"]);
		expect(beside.failures).toEqual([
			expect.objectContaining({
				kind: "invalid-path",
				message: expect.stringContaining(
					"Point it at a .json file of the folder",
				),
			}),
		]);
	});

	it("reads no ref that is not a file-qualified $ref", async () => {
		const h = host({
			[`${ROOT}a.json`]: {
				name: "a",
				description: "mentions b.json#/x in prose",
				boundedcontexts: {
					x: {
						consumes: [{ consumable: { $ref: "#/local" } }, { $ref: 5 }, null],
					},
				},
			},
		});
		const load = await loadFromUrls({
			entries: [`${ROOT}a.json`],
			fetchFn: h.fetchFn,
		});
		expect(h.asked).toEqual([`${ROOT}a.json`]);
		expect(load.linked).toBe(false);
	});
});

describe("an address that is not a URL", () => {
	const A = `${ROOT}a.json`;
	const BAD = "http://[bad";
	const raw = (message: string) => expect(message).not.toMatch(/Invalid URL/);

	it("is reported as unreachable with the reader's wording, not as a raw URL exception, and is never fetched", async () => {
		const h = host({ [A]: file() });
		const load = await loadFromUrls({ entries: [BAD], fetchFn: h.fetchFn });
		expect(h.asked).toEqual([]);
		expect(load.files).toEqual([]);
		expect(load.failures).toHaveLength(1);
		expect(load.failures[0]).toMatchObject({
			kind: "network",
			path: BAD,
			url: BAD,
		});
		expect(load.failures[0].message).toContain(BAD);
		expect(load.failures[0].message).toContain("Check the address");
		raw(load.failures[0].message);
	});

	it("as a secondary entry loses only itself: the valid entry is still read", async () => {
		const h = host({ [A]: file() });
		const load = await loadFromUrls({
			entries: [A, BAD],
			fetchFn: h.fetchFn,
		});
		expect(h.asked).toEqual([A]);
		expect(load.files.map((f) => f.path)).toEqual(["a.json"]);
		expect(load.failures.map((f) => [f.kind, f.url])).toEqual([
			["network", BAD],
		]);
	});

	it("as the first entry does not stop a valid secondary entry", async () => {
		const h = host({ [A]: file() });
		const load = await loadFromUrls({
			entries: [BAD, A],
			fetchFn: h.fetchFn,
		});
		expect(h.asked).toEqual([A]);
		expect(load.files.map((f) => f.path)).toEqual(["a.json"]);
		expect(load.failures.map((f) => f.kind)).toEqual(["network"]);
	});

	it("as an explicit root is reported once and nothing is fetched", async () => {
		const h = host({ [A]: file() });
		const load = await loadFromUrls({
			entries: [A],
			root: BAD,
			fetchFn: h.fetchFn,
		});
		expect(h.asked).toEqual([]);
		expect(load.files).toEqual([]);
		expect(load.failures).toHaveLength(1);
		expect(load.failures[0]).toMatchObject({ kind: "network", url: BAD });
		raw(load.failures[0].message);
	});

	it("as a malformed root with no entries is reported as unreachable and nothing is fetched", async () => {
		const h = host({});
		const load = await loadFromUrls({
			entries: [],
			root: BAD,
			fetchFn: h.fetchFn,
		});
		expect(h.asked).toEqual([]);
		expect(load.failures.map((f) => f.kind)).toEqual(["network"]);
	});
});

describe("the bounds of one read", () => {
	it("has the bounds the contract fixes", () => {
		expect(LIMITS).toEqual({
			files: 64,
			bytes: 2 * 1024 * 1024,
			concurrency: 4,
		});
	});

	it("stops at 64 files, whatever the entries name, and says how many were left", async () => {
		const fan: Record<string, unknown> = {
			[`${ROOT}entry.json`]: file(
				...Array.from(
					{ length: 99 },
					(_, i) => `f${String(i).padStart(2, "0")}.json`,
				),
			),
		};
		for (let i = 0; i < 99; i++)
			fan[`${ROOT}f${String(i).padStart(2, "0")}.json`] = { name: `f${i}` };
		const h = host(fan);
		const load = await loadFromUrls({
			entries: [`${ROOT}entry.json`],
			fetchFn: h.fetchFn,
		});
		expect(h.asked).toHaveLength(64);
		expect(load.files).toHaveLength(64);
		// The same 63 siblings every run: the first 63 the entry names, in the order it names them.
		expect(load.files.map((f) => f.path)).toContain("f62.json");
		expect(load.files.map((f) => f.path)).not.toContain("f63.json");
		const over = load.failures.find((f) => f.kind === "over-bound");
		expect(over?.message).toBe(
			`Stopped at 64 workspace files: 36 more files were named and not fetched, starting with f63.json. Name a narrower set of entries, or open the folder from your computer instead.`,
		);
		expect(load.failures).toHaveLength(1);
	});

	it("counts the entries toward the 64", async () => {
		const entries = Array.from({ length: 70 }, (_, i) => `${ROOT}e${i}.json`);
		const files = Object.fromEntries(entries.map((u) => [u, { name: u }]));
		const h = host(files);
		const load = await loadFromUrls({ entries, fetchFn: h.fetchFn });
		expect(load.files).toHaveLength(64);
		expect(load.failures.map((f) => f.kind)).toEqual(["over-bound"]);
		expect(load.failures[0].message).toContain("6 more files");
		expect(load.failures[0].message).toContain("e64.json");
	});

	it("says a single file left over in the singular", async () => {
		const names = Array.from(
			{ length: 64 },
			(_, i) => `f${String(i).padStart(2, "0")}.json`,
		);
		const fan: Record<string, unknown> = {
			[`${ROOT}entry.json`]: file(...names),
		};
		for (const n of names) fan[`${ROOT}${n}`] = { name: n };
		const load = await loadFromUrls({
			entries: [`${ROOT}entry.json`],
			fetchFn: host(fan).fetchFn,
		});
		expect(load.failures[0].message).toContain("1 more file was named");
	});

	it("fetches at most four files at once, and does use all four", async () => {
		const names = Array.from(
			{ length: 21 },
			(_, i) => `g${String(i).padStart(2, "0")}.json`,
		);
		const files: Record<string, unknown> = {
			[`${ROOT}entry.json`]: file(...names),
		};
		for (const n of names) files[`${ROOT}${n}`] = { name: n };
		let inFlight = 0;
		let peak = 0;
		const fetchFn: FetchLike = async (url) => {
			inFlight += 1;
			peak = Math.max(peak, inFlight);
			await new Promise((r) => setTimeout(r, 2));
			inFlight -= 1;
			return ok(files[url]);
		};
		const load = await loadFromUrls({
			entries: [`${ROOT}entry.json`],
			fetchFn,
		});
		expect(load.files).toHaveLength(22);
		expect(peak).toBe(4);
	});

	it("fetches fewer at once when there are fewer to fetch", async () => {
		let peak = 0;
		let inFlight = 0;
		const fetchFn: FetchLike = async () => {
			inFlight += 1;
			peak = Math.max(peak, inFlight);
			await new Promise((r) => setTimeout(r, 2));
			inFlight -= 1;
			return ok({ name: "x" });
		};
		await loadFromUrls({
			entries: [`${ROOT}a.json`, `${ROOT}b.json`],
			fetchFn,
		});
		expect(peak).toBe(2);
	});
});

describe("what the reader is told about the files they cannot see", () => {
	it("says the files came from addresses, how many, and that others under the folder are not discoverable", async () => {
		const h = host({
			[`${ROOT}a.json`]: file("b.json"),
			[`${ROOT}b.json`]: { name: "b" },
		});
		const load = await loadFromUrls({
			entries: [`${ROOT}a.json`],
			fetchFn: h.fetchFn,
		});
		const notice = incompleteness(load);
		expect(notice).toContain("2 workspaces reached from the addresses given");
		expect(notice).toContain(
			`Other workspaces under ${ROOT} are not discoverable by URL`,
		);
		expect(notice).toContain("a file that only names these");
		expect(notice).toContain("open the whole folder from your computer");
	});

	it("says a single workspace in the singular", () => {
		expect(
			incompleteness({
				files: [{ path: "a.json", url: "u", schema: {} }],
				failures: [],
				root: ROOT,
				linked: true,
			}),
		).toContain("1 workspace reached");
	});
});
