/**
 * The path codec of a workspace set.
 *
 * Two types, one codec. A {@link SetPath} is what a host holds: the raw,
 * set-root-relative, forward-slash-joined Unicode path of one workspace file.
 * A {@link WirePath} is what a `$ref`, a URL or a link writes: every segment
 * of the raw path as UTF-8, with each byte outside the RFC 3986 unreserved set
 * written once as `%` and two uppercase hex digits. Neither is the JSON
 * Pointer that follows a `#` in a ref; that layer keeps its own codec
 * (`encodeRefSegment`) and is never decoded here.
 *
 * Every function is total: a mistake in a path comes back as a result naming
 * its cause, never as an exception (decision 29).
 */

export type SetPath = string;
export type WirePath = string;

/** Why a path was refused. Each cause names exactly one kind of mistake. */
export type PathCause =
	/** A `%` not followed by two hex digits. */
	| "malformed-percent"
	/** Percent-decoded bytes (or a raw string) that are not well-formed UTF-8. */
	| "invalid-utf8"
	/** A NUL or other control character, or a `/` or `\` where a name is. */
	| "forbidden-character"
	/** An empty segment (`x//a.json`, a trailing `/`, an empty path). */
	| "empty-segment"
	/** A leading `/`. */
	| "absolute"
	/** A `..` that would leave the explicit set root. */
	| "escapes-root"
	/** A path whose last segment is not a `.json` file name. */
	| "not-json"
	/** `schema.json`, which belongs to the generated schema, not to a workspace. */
	| "reserved-name"
	/** A character outside the wire grammar, or a `.` in a raw set path. */
	| "invalid-character";

export type PathFailure = { ok: false; cause: PathCause; detail: string };

export type PathResult = { ok: true; path: string } | PathFailure;

const RESERVED_NAME = "schema.json";
const HEX = /^[0-9A-Fa-f]{2}$/;
const UNRESERVED = /^[A-Za-z0-9\-._~]$/;
const CONTROL = /\p{Cc}/u;

function refuse(cause: PathCause, detail: string): PathFailure {
	return { ok: false, cause, detail };
}

function hasLoneSurrogate(value: string): boolean {
	for (let i = 0; i < value.length; i++) {
		const unit = value.charCodeAt(i);
		if (unit >= 0xd800 && unit <= 0xdbff) {
			const next = value.charCodeAt(i + 1);
			if (next >= 0xdc00 && next <= 0xdfff) i++;
			else return true;
		} else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
	}
	return false;
}

/** Checks the file-name rules shared by raw and resolved paths. */
function checkFileName(segments: string[]): PathFailure | undefined {
	const last = segments[segments.length - 1];
	if (last === RESERVED_NAME)
		return refuse("reserved-name", `${RESERVED_NAME} is not a workspace file`);
	if (!last.endsWith(".json") || last === ".json")
		return refuse("not-json", `${JSON.stringify(last)} is not a .json file`);
	return undefined;
}

/**
 * Validates a raw host path and returns it unchanged when canonical: relative,
 * no empty, `.` or `..` segment, no control character, no `\`, well-formed
 * Unicode, ending in a case-sensitive `.json` that is not `schema.json`.
 */
export function validateSetPath(raw: SetPath): PathResult {
	if (raw === "") return refuse("empty-segment", "the path is empty");
	if (raw.startsWith("/"))
		return refuse("absolute", "a set path is relative to the set root");
	if (hasLoneSurrogate(raw))
		return refuse("invalid-utf8", "the path is not well-formed Unicode");
	const segments = raw.split("/");
	for (const segment of segments) {
		if (segment === "")
			return refuse("empty-segment", "a path has an empty segment");
		if (segment === "..")
			return refuse("escapes-root", "a canonical set path has no `..`");
		if (segment === ".")
			return refuse("invalid-character", "a canonical set path has no `.`");
		if (segment.includes("\\"))
			return refuse("forbidden-character", "a path segment holds a backslash");
		if (CONTROL.test(segment))
			return refuse("forbidden-character", "a path segment holds a control");
	}
	return checkFileName(segments) ?? { ok: true, path: raw };
}

/**
 * Encodes a validated {@link SetPath} once: per segment, UTF-8 bytes, every
 * byte outside the unreserved set as `%` and two uppercase hex digits. No
 * Unicode normalisation and no case folding, so `a%41.json` (raw `%41`) is
 * `a%2541.json` and never `aA.json`.
 */
export function encodeWirePath(raw: SetPath): WirePath {
	const encoder = new TextEncoder();
	return raw
		.split("/")
		.map((segment) => {
			let out = "";
			for (const byte of encoder.encode(segment)) {
				const char = String.fromCharCode(byte);
				out +=
					byte < 0x80 && UNRESERVED.test(char)
						? char
						: `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
			}
			return out;
		})
		.join("/");
}

function decodeSegment(
	segment: string,
): { ok: true; value: string } | PathFailure {
	const bytes: number[] = [];
	const encoder = new TextEncoder();
	for (let i = 0; i < segment.length; i++) {
		const char = segment[i];
		if (char === "%") {
			const pair = segment.slice(i + 1, i + 3);
			if (!HEX.test(pair))
				return refuse(
					"malformed-percent",
					`\`%${pair}\` is not a percent escape`,
				);
			bytes.push(Number.parseInt(pair, 16));
			i += 2;
		} else if (char === "\\") {
			return refuse(
				"forbidden-character",
				"a raw backslash is not a path character",
			);
		} else if (segment.charCodeAt(i) < 0x80 && UNRESERVED.test(char)) {
			bytes.push(segment.charCodeAt(i));
		} else {
			const shown = encoder.encode(char);
			return refuse(
				"invalid-character",
				`${JSON.stringify(char)} must be written as ${[...shown].map((b) => `%${b.toString(16).toUpperCase().padStart(2, "0")}`).join("")}`,
			);
		}
	}
	let value: string;
	try {
		// ignoreBOM keeps a leading U+FEFF as part of the file name; the default
		// would strip it and make "%EF%BB%BFa.json" collide with "a.json".
		value = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
			Uint8Array.from(bytes),
		);
	} catch {
		return refuse("invalid-utf8", "the percent-encoded bytes are not UTF-8");
	}
	if (value.includes("/") || value.includes("\\") || CONTROL.test(value))
		return refuse(
			"forbidden-character",
			"a decoded segment holds a `/`, a `\\` or a control character",
		);
	return { ok: true, value };
}

/**
 * Strictly decodes a wire path into the relative path it spells, which may
 * still hold `.` and `..` segments (they fold in {@link resolveWirePath}).
 * Lowercase hex is accepted; the canonical spelling is uppercase, written by
 * {@link encodeWirePath}.
 */
export function decodeWirePath(wire: WirePath): PathResult {
	if (wire === "") return refuse("empty-segment", "the path is empty");
	if (wire.startsWith("/"))
		return refuse(
			"absolute",
			"a wire path is relative to the referencing file",
		);
	const decoded: string[] = [];
	for (const segment of wire.split("/")) {
		if (segment === "")
			return refuse("empty-segment", "a path has an empty segment");
		const result = decodeSegment(segment);
		if (!result.ok) return result;
		decoded.push(result.value);
	}
	return { ok: true, path: decoded.join("/") };
}

function directoryOf(file: SetPath): string[] {
	return file.split("/").slice(0, -1);
}

/**
 * Resolves a wire path written in `fromFile` to the canonical {@link SetPath}
 * it names. Decoding comes first and folding second, so `%2E%2E/x.json` is
 * traversal exactly like `../x.json`, and traversal is legal only while the
 * result stays inside the explicit set root.
 */
export function resolveWirePath(fromFile: SetPath, wire: WirePath): PathResult {
	const decoded = decodeWirePath(wire);
	if (!decoded.ok) return decoded;
	const stack = directoryOf(fromFile);
	for (const segment of decoded.path.split("/")) {
		if (segment === ".") continue;
		if (segment === "..") {
			if (stack.length === 0)
				return refuse("escapes-root", `${wire} leaves the set root`);
			stack.pop();
		} else stack.push(segment);
	}
	if (stack.length === 0) return refuse("not-json", `${wire} names no file`);
	const named = checkFileName(stack);
	return named ?? { ok: true, path: stack.join("/") };
}

/**
 * The wire path `fromFile` writes to name `target`: the shortest relative path
 * from `fromFile`'s directory (it may begin with `..`), encoded once. Both
 * arguments are validated {@link SetPath}s; `refTo` is its only caller.
 */
export function relativeWirePath(fromFile: SetPath, target: SetPath): WirePath {
	const from = directoryOf(fromFile);
	const to = target.split("/");
	let shared = 0;
	while (
		shared < from.length &&
		shared < to.length - 1 &&
		from[shared] === to[shared]
	)
		shared++;
	const relative = [
		...from.slice(shared).map(() => ".."),
		...to.slice(shared),
	].join("/");
	return encodeWirePath(relative);
}
