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

export type RelationshipRef = {
	sourceId: string;
	type: ContextRelationshipType;
	targetId: string;
	nameId?: string;
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

/** Parses a canonical relationship ref into its raw identities. */
export function parseRelationshipRef(ref: string): RelationshipRef | undefined {
	const segments = ref.split("/");
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
