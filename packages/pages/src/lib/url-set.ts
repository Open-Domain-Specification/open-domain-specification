import {
	decodeWirePath,
	encodeWirePath,
	parseRef,
	resolveWirePath,
	type SetPath,
	validateSetPath,
} from "@open-domain-specification/core";
import { codePoint } from "./order";

/**
 * Reading a set of workspace files by URL.
 *
 * A static host lists nothing and there is no root manifest, so the viewer
 * works from what it is told and from what the files say: the entries it is
 * given (`url=`, repeatable), the folder they lie under (an explicit `root`, or
 * the longest folder they share), and every file the entries name with a
 * file-qualified `$ref`, found breadth first. A file is fetched once however
 * many files name it, which is also what ends a cycle between two files.
 *
 * Everything here is host metadata. The entries and the root say where to
 * look and never become part of the model, and nothing is guessed: a file that
 * cannot be fetched, is not JSON, is too large, or is named by an invalid path
 * is reported with what to do about it and left out, so the refs that name it
 * are `unresolved-ref` of the file that wrote them.
 */

/** The bounds of one read: how many files, how large one may be, and how many are fetched at once. */
export const LIMITS = {
	files: 64,
	bytes: 2 * 1024 * 1024,
	concurrency: 4,
} as const;

export type FailureKind =
	| "network"
	| "http"
	| "not-json"
	| "too-large"
	| "invalid-path"
	| "outside-root"
	| "over-bound";

/** A file that is not in the result, with what went wrong and what to do about it. */
export type Failure = {
	kind: FailureKind;
	/** The canonical set path, or the entry as given when it has none. */
	path: string;
	url: string;
	/** The file whose `$ref` named it; absent for an entry. */
	from?: string;
	message: string;
};

/** One fetched, parsed file. */
export type FetchedFile = {
	path: SetPath;
	url: string;
	schema: unknown;
	/** Set on an entry whose address cannot be a path of the folder; it is kept only when it is the one file read. */
	pathProblem?: string;
};

export type UrlLoad = {
	/** In code-point order of path, whatever order the fetches finished in. */
	files: FetchedFile[];
	failures: Failure[];
	/** The folder every path is relative to, with a trailing slash. */
	root: string;
	/** True when some loaded file names another file with a qualified `$ref`. */
	linked: boolean;
};

/** What a fetch must answer with; a subset of `Response`, so a test can hand in less. */
export type FetchLike = (url: string) => Promise<ResponseLike>;
export type ResponseLike = {
	ok: boolean;
	status?: number;
	headers?: { get(name: string): string | null };
	body?: { getReader(): ReadableStreamDefaultReader<Uint8Array> } | null;
	text?: () => Promise<string>;
	json: () => Promise<unknown>;
};

/** The wording a reader sees for a file that could not be fetched. */
const MESSAGES = {
	network: (url: string) =>
		`Could not reach ${url}. Check the address and your connection, and that the host allows cross-origin requests, then choose Load to try again.`,
	http: (url: string, status: number | undefined) =>
		`The server answered ${status} for ${url}. Check the address is correct and the file is public, then choose Load to try again.`,
	notJson: (url: string) =>
		`${url} is not valid JSON. Point it at the workspace file in a project's .ods folder, not at a web page, then choose Load.`,
	tooLarge: (url: string) =>
		`${url} is larger than ${LIMITS.bytes / (1024 * 1024)} MiB, so it was not loaded. Host a smaller workspace file, or split the workspace into files.`,
};

/** Whether `address` is a URL at all; the reader's own typing can be anything. */
function isUrl(address: string): boolean {
	try {
		new URL(address);
		return true;
	} catch {
		return false;
	}
}

const withSlash = (href: string) => (href.endsWith("/") ? href : `${href}/`);

/** The folder a URL's path is in: everything up to its last slash. */
const folderOf = (url: URL) =>
	`${url.origin}${url.pathname.slice(0, url.pathname.lastIndexOf("/") + 1)}`;

/** The longest folder, on a segment boundary, that every URL is under. Undefined across hosts. */
export function commonRoot(urls: string[]): string | undefined {
	const parsed = urls.map((u) => new URL(u));
	if (new Set(parsed.map((u) => u.origin)).size > 1) return undefined;
	const folders = parsed.map((u) => folderOf(u).slice(u.origin.length));
	let common = folders[0].split("/").slice(0, -1);
	for (const folder of folders.slice(1)) {
		const parts = folder.split("/").slice(0, -1);
		let n = 0;
		while (n < common.length && n < parts.length && common[n] === parts[n])
			n += 1;
		common = common.slice(0, n);
	}
	return `${parsed[0].origin}${common.join("/")}/`;
}

/**
 * The raw set path of `url` under `root`, or why it has none. Each segment of
 * the URL is percent-decoded once by the core wire codec, so `my%20team.json`
 * is `my team.json` and `a%2Fb.json` has no path, and the result must be a
 * canonical set path.
 */
export function setPathUnder(
	root: string,
	url: string,
): { ok: true; path: SetPath } | { ok: false; detail: string } {
	const target = new URL(url);
	const base = new URL(root);
	if (
		target.origin !== base.origin ||
		!target.pathname.startsWith(base.pathname)
	)
		return { ok: false, detail: `it is not under ${root}` };
	const relative = target.pathname.slice(base.pathname.length);
	// A URL may leave sub-delimiters such as `(`, `,` or `+` unescaped; write
	// them as the codec spells them, then decode with core's own codec, which
	// refuses a decoded `/`, `\` or control character that `decodeURIComponent`
	// would turn into a nested path.
	const wire = relative.replace(
		/[^A-Za-z0-9\-._~%/]/g,
		(c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
	);
	const decoded = decodeWirePath(wire);
	if (!decoded.ok)
		return {
			ok: false,
			detail:
				decoded.cause === "malformed-percent"
					? "its path is not valid percent-encoding"
					: `${decoded.cause}: ${decoded.detail}`,
		};
	const raw = decoded.path;
	const checked = validateSetPath(raw);
	return checked.ok
		? { ok: true, path: raw }
		: { ok: false, detail: `${checked.cause}: ${checked.detail}` };
}

/** The fetch URL of a canonical path: the root and the encoded path, never a user string handed to `new URL`. */
export const urlOf = (root: string, path: SetPath) =>
	`${root}${encodeWirePath(path)}`;

/** Every file-qualified `$ref` written anywhere in `value`, in document order. */
function qualifiedRefs(value: unknown, out: string[] = []): string[] {
	if (Array.isArray(value)) for (const item of value) qualifiedRefs(item, out);
	else if (typeof value === "object" && value !== null)
		for (const [key, item] of Object.entries(value))
			if (key === "$ref" && typeof item === "string") {
				const parsed = parseRef(item);
				if (parsed.ok && !parsed.local) out.push(item);
			} else qualifiedRefs(item, out);
	return out;
}

const encoder = new TextEncoder();

/** Reads and parses a response within the byte bound, or says why not. */
async function readJson(
	res: ResponseLike,
): Promise<
	{ ok: true; value: unknown } | { ok: false; kind: "too-large" | "not-json" }
> {
	const declared = Number(res.headers?.get("content-length"));
	if (Number.isFinite(declared) && declared > LIMITS.bytes)
		return { ok: false, kind: "too-large" };
	let text: string;
	try {
		const reader = res.body?.getReader();
		if (reader) {
			const decoder = new TextDecoder();
			let total = 0;
			text = "";
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				total += value.byteLength;
				if (total > LIMITS.bytes) {
					await reader.cancel();
					return { ok: false, kind: "too-large" };
				}
				text += decoder.decode(value, { stream: true });
			}
			text += decoder.decode();
		} else if (res.text) {
			text = await res.text();
			if (encoder.encode(text).byteLength > LIMITS.bytes)
				return { ok: false, kind: "too-large" };
		} else return { ok: true, value: await res.json() };
		return { ok: true, value: JSON.parse(text) };
	} catch {
		return { ok: false, kind: "not-json" };
	}
}

type Wanted = {
	path: SetPath;
	url: string;
	from?: string;
	entry: boolean;
	/** Why an entry's address is not a canonical path of the folder, though it may still be read alone. */
	pathProblem?: string;
};

/**
 * Runs `work` over `items` with at most `limit` in flight at once, answering
 * in the order of `items` whatever order they finish in.
 */
async function pool<T, R>(
	items: T[],
	limit: number,
	work: (item: T) => Promise<R>,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const at = next;
			next += 1;
			results[at] = await work(items[at]);
		}
	};
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, worker),
	);
	return results;
}

/**
 * Loads the entries and, breadth first, every file they name. A wave is
 * fetched with at most {@link LIMITS.concurrency} requests at once; what it
 * names is then read in the order of the files that named it, so the files
 * kept when {@link LIMITS.files} is reached are the same on every run.
 * `root` is the explicit folder, or the folder the entries share.
 */
export async function loadFromUrls(input: {
	entries: string[];
	root?: string;
	fetchFn: FetchLike;
}): Promise<UrlLoad> {
	const failures: Failure[] = [];
	const files: FetchedFile[] = [];
	// An address that is no URL cannot be asked for: it is reported as not
	// reachable, in the reader's words, and is never handed to a parser that
	// would throw or to a fetch.
	const unreachable = (address: string) =>
		failures.push({
			kind: "network",
			path: address,
			url: address,
			message: MESSAGES.network(address),
		});
	if (input.root && !isUrl(withSlash(input.root))) {
		unreachable(input.root);
		return { files, failures, root: "", linked: false };
	}
	const entries = input.entries.filter((entry) => {
		if (isUrl(entry)) return true;
		unreachable(entry);
		return false;
	});
	const common = input.root
		? withSlash(input.root)
		: entries.length
			? commonRoot(entries)
			: undefined;
	const root = common ?? "";
	const seen = new Set<SetPath>();
	const overBound: string[] = [];
	let linked = false;
	const refused = new Set<string>();

	const claim = (want: Wanted, queue: Wanted[]) => {
		if (seen.has(want.path)) return;
		if (seen.size >= LIMITS.files) {
			overBound.push(want.path);
			return;
		}
		seen.add(want.path);
		queue.push(want);
	};

	let wave: Wanted[] = [];
	if (!common && entries.length)
		failures.push({
			kind: "outside-root",
			path: entries[0],
			url: entries[0],
			message:
				"These addresses are on more than one host, so they have no folder in common. Open them one host at a time, or give the folder they share as the root.",
		});
	entries.forEach((entry, i) => {
		if (!common) return;
		const located = setPathUnder(common, entry);
		if (located.ok)
			claim({ path: located.path, url: entry, entry: true }, wave);
		else if (
			new URL(entry).origin !== new URL(common).origin ||
			!new URL(entry).pathname.startsWith(new URL(common).pathname)
		)
			failures.push({
				kind: "outside-root",
				path: entry,
				url: entry,
				message: `${entry} is not under the folder ${common}, so it was not fetched. Use a root that holds it, or fix the address.`,
			});
		else
			claim(
				{
					path: `entry-${i}.json`,
					url: entry,
					entry: true,
					pathProblem: located.detail,
				},
				wave,
			);
	});

	while (wave.length) {
		const results = await pool(wave, LIMITS.concurrency, async (want) => {
			const url = want.entry ? want.url : urlOf(root, want.path);
			let res: ResponseLike;
			try {
				res = await input.fetchFn(url);
			} catch {
				return { want, url, kind: "network" as const };
			}
			if (!res.ok)
				return { want, url, kind: "http" as const, status: res.status };
			const read = await readJson(res);
			return read.ok
				? { want, url, kind: "ok" as const, value: read.value }
				: { want, url, kind: read.kind };
		});
		const next: Wanted[] = [];
		for (const r of results) {
			const { want, url } = r;
			const fail = (kind: FailureKind, message: string) =>
				failures.push({
					kind,
					path: want.path,
					url,
					...(want.from && { from: want.from }),
					message: want.from
						? `${want.path} (named by ${want.from}): ${message}`
						: message,
				});
			if (r.kind === "network") fail("network", MESSAGES.network(url));
			else if (r.kind === "http") fail("http", MESSAGES.http(url, r.status));
			else if (r.kind === "not-json") fail("not-json", MESSAGES.notJson(url));
			else if (r.kind === "too-large")
				fail("too-large", MESSAGES.tooLarge(url));
			else {
				files.push({
					path: want.path,
					url,
					schema: r.value,
					...(want.pathProblem && { pathProblem: want.pathProblem }),
				});
				for (const written of qualifiedRefs(r.value)) {
					linked = true;
					const wire = (parseRef(written) as { wire: string }).wire;
					const resolved = resolveWirePath(want.path, wire);
					if (!resolved.ok) {
						const key = `${want.path}\n${wire}`;
						if (refused.has(key)) continue;
						refused.add(key);
						failures.push({
							kind: "invalid-path",
							path: wire,
							url,
							from: want.path,
							message: `${want.path} refers to "${wire}", which cannot be a file of this folder (${resolved.cause}: ${resolved.detail}). Fix the $ref in ${want.path}.`,
						});
						continue;
					}
					claim(
						{ path: resolved.path, url: "", from: want.path, entry: false },
						next,
					);
				}
			}
		}
		wave = next;
	}

	if (overBound.length)
		failures.push({
			kind: "over-bound",
			path: overBound[0],
			url: urlOf(root, overBound[0]),
			message: `Stopped at ${LIMITS.files} workspace files: ${overBound.length} more ${overBound.length === 1 ? "file was" : "files were"} named and not fetched, starting with ${overBound[0]}. Name a narrower set of entries, or open the folder from your computer instead.`,
		});

	// An entry whose address is no path of the folder can be read alone, and
	// nowhere else: beside other files it has no place in the set.
	const kept = files.length === 1 ? files : files.filter((f) => !f.pathProblem);
	for (const f of files)
		if (!kept.includes(f))
			failures.push({
				kind: "invalid-path",
				path: f.url,
				url: f.url,
				message: `${f.url} cannot be a workspace file of the folder ${root} (${f.pathProblem}). Point it at a .json file of the folder.`,
			});
	kept.sort((a, b) => codePoint(a.path, b.path));
	return { files: kept, failures, root, linked };
}

/**
 * What a reader is told when the files they see came from URLs: a static host
 * exposes no listing, so a file that nothing reachable names stays unseen.
 */
export function incompleteness(load: UrlLoad): string {
	const n = load.files.length;
	return `${n} ${n === 1 ? "workspace" : "workspaces"} reached from the addresses given, following the files they name. Other workspaces under ${load.root} are not discoverable by URL: a file that nothing here names, and a file that only names these, stay out of view. Add more url= entries, or open the whole folder from your computer to see the complete project.`;
}
