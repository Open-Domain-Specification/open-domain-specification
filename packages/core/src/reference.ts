import { decodeWirePath, type PathCause, type WirePath } from "./path-codec";
import type { ContextRelationshipType } from "./schema";

/** Encodes one raw model identity as one JSON Pointer segment. */
export function encodeRefSegment(value: string): string {
	return value.replace(/~/g, "~0").replace(/\//g, "~1");
}

/**
 * Decodes one JSON Pointer segment, or returns undefined when it contains an
 * escape other than `~0` or `~1`.
 */
export function decodeRefSegment(segment: string): string | undefined {
	if (segment.includes("/") || /~(?:[^01]|$)/.test(segment)) return undefined;
	return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

/**
 * What a ref spells before anything is looked up: the pointer after the first
 * `#`, and the wire path before it when the ref is file-qualified. A wire path
 * can never hold a raw `#` (it is `%23`), so the first one ends the path.
 */
export type ParsedRef =
	| { ok: true; local: true; pointer: string }
	| { ok: true; local: false; wire: WirePath; pointer: string }
	| { ok: false; cause: PathCause | "malformed-pointer"; detail: string };

/** Splits a ref into its wire path and pointer without resolving either. */
export function parseRef(ref: string): ParsedRef {
	const hash = ref.indexOf("#");
	if (hash < 0)
		return {
			ok: false,
			cause: "malformed-pointer",
			detail: "a ref holds a `#/...` pointer",
		};
	const pointer = ref.slice(hash);
	if (!pointer.startsWith("#/"))
		return {
			ok: false,
			cause: "malformed-pointer",
			detail: "the pointer after `#` starts with `/`",
		};
	if (hash === 0) return { ok: true, local: true, pointer };
	const wire = ref.slice(0, hash);
	const decoded = decodeWirePath(wire);
	if (!decoded.ok) return decoded;
	return { ok: true, local: false, wire, pointer };
}

/**
 * One end of a relationship whose contexts are not both in the declaring
 * file: the id, and the wire path of its file relative to the declaring file,
 * with `.` standing for the declaring file itself.
 */
export type RelationshipEnd = { path: WirePath; id: string };

export type RelationshipRef = {
	sourceId: string;
	type: ContextRelationshipType;
	targetId: string;
	nameId?: string;
	/** Present only on the seven and eight segment form. */
	sourcePath?: WirePath;
	targetPath?: WirePath;
};

/** Constructs the canonical ref of a relationship. */
export function relationshipRef(
	sourceId: string,
	type: ContextRelationshipType,
	targetId: string,
	nameId?: string,
): string {
	const base = `#/relationships/${encodeRefSegment(sourceId)}/${type}/${encodeRefSegment(targetId)}`;
	return nameId ? `${base}/${encodeRefSegment(nameId)}` : base;
}

/**
 * Constructs the canonical ref of a relationship with an end in another file:
 * `#/relationships/<E(path)>/<src>/<type>/<E(path)>/<tgt>[/<name>]`, where `E`
 * encodes one pointer segment and the paths are relative to the declaring file.
 * The segment count (7 or 8, against 5 or 6) says which form it is.
 */
export function qualifiedRelationshipRef(
	source: RelationshipEnd,
	type: ContextRelationshipType,
	target: RelationshipEnd,
	nameId?: string,
): string {
	const base = `#/relationships/${encodeRefSegment(source.path)}/${encodeRefSegment(source.id)}/${type}/${encodeRefSegment(target.path)}/${encodeRefSegment(target.id)}`;
	return nameId ? `${base}/${encodeRefSegment(nameId)}` : base;
}

function relationshipPath(segment: string): WirePath | undefined {
	const path = decodeRefSegment(segment);
	if (path === undefined) return undefined;
	return path === "." || decodeWirePath(path).ok ? path : undefined;
}

function parseQualifiedRelationshipRef(
	segments: string[],
): RelationshipRef | undefined {
	if (segments[1] !== "relationships" || segments[0] !== "#") return undefined;
	const sourcePath = relationshipPath(segments[2]);
	const sourceId = decodeRefSegment(segments[3]);
	const type = relationshipType(segments[4]);
	const targetPath = relationshipPath(segments[5]);
	const targetId = decodeRefSegment(segments[6]);
	const nameId =
		segments.length === 8 ? decodeRefSegment(segments[7]) : undefined;
	if (
		sourcePath === undefined ||
		sourceId === undefined ||
		type === undefined ||
		targetPath === undefined ||
		targetId === undefined ||
		(segments.length === 8 && !nameId)
	)
		return undefined;
	const ref = { sourceId, type, targetId, sourcePath, targetPath };
	return nameId ? { ...ref, nameId } : ref;
}

/** Parses a canonical relationship ref into its raw identities. */
export function parseRelationshipRef(ref: string): RelationshipRef | undefined {
	const segments = ref.split("/");
	if (segments.length === 7 || segments.length === 8)
		return parseQualifiedRelationshipRef(segments);
	if (
		(segments.length !== 5 && segments.length !== 6) ||
		segments[0] !== "#" ||
		segments[1] !== "relationships" ||
		segments[3] === "" ||
		(segments.length === 6 && segments[5] === "")
	)
		return undefined;
	const sourceId = decodeRefSegment(segments[2]);
	const targetId = decodeRefSegment(segments[4]);
	const type = relationshipType(segments[3]);
	const nameId =
		segments.length === 6 ? decodeRefSegment(segments[5]) : undefined;
	if (
		sourceId === undefined ||
		targetId === undefined ||
		type === undefined ||
		(nameId === undefined && segments.length === 6)
	)
		return undefined;
	return segments.length === 6
		? { sourceId, type, targetId, nameId }
		: { sourceId, type, targetId };
}

function relationshipType(value: string): ContextRelationshipType | undefined {
	switch (value) {
		case "upstream-downstream":
		case "customer-supplier":
		case "partnership":
		case "shared-kernel":
		case "separate-ways":
			return value;
		default:
			return undefined;
	}
}

export type ConsumptionRef = {
	consumerRef: string;
	consumableRef: string;
	callerRef?: string;
};

/** Constructs the canonical ref of a consumption. */
export function consumptionRef(
	consumerRef: string,
	consumableRef: string,
	callerRef?: string,
): string {
	const pair = `${consumerRef}/consumes/${encodeRefSegment(consumableRef)}`;
	return callerRef === undefined
		? pair
		: `${pair}/by/${encodeRefSegment(callerRef)}`;
}

/** Parses a canonical consumption ref into its full nested refs. */
export function parseConsumptionRef(ref: string): ConsumptionRef | undefined {
	const segments = ref.split("/");
	if (
		(segments.length !== 7 && segments.length !== 9) ||
		segments[0] !== "#" ||
		segments[1] !== "boundedcontexts" ||
		(segments[3] !== "services" && segments[3] !== "aggregates") ||
		segments[5] !== "consumes" ||
		(segments.length === 9 && segments[7] !== "by")
	)
		return undefined;
	if (
		decodeRefSegment(segments[2]) === undefined ||
		decodeRefSegment(segments[4]) === undefined
	)
		return undefined;
	const consumerRef = segments.slice(0, 5).join("/");
	const consumableRef = decodeRefSegment(segments[6]);
	const callerRef =
		segments.length === 9 ? decodeRefSegment(segments[8]) : undefined;
	if (!consumableRef || (segments.length === 9 && !callerRef)) return undefined;
	return segments.length === 9
		? { consumerRef, consumableRef, callerRef }
		: { consumerRef, consumableRef };
}
