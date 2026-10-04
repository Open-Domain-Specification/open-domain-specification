import {
	decodeRefSegment,
	parseConsumptionRef,
	parseRelationshipRef,
} from "@open-domain-specification/core";
import {
	findNodeAtLocation,
	getNodeValue,
	type Node,
	parseTree,
} from "jsonc-parser";

export type Span = { start: number; end: number };

/** Splits a canonical model ref into its raw JSON path segments. */
export function refToPath(ref: string): string[] | undefined {
	if (ref === "#") return [];
	if (!ref.startsWith("#/")) return undefined;
	const decoded = ref.slice(2).split("/").map(decodeRefSegment);
	return decoded.every((segment) => segment !== undefined)
		? (decoded as string[])
		: undefined;
}

function spanOf(node: Node): Span {
	// Prefer the property key so a squiggle sits on the id rather than the whole object.
	const key =
		node.parent?.type === "property" ? node.parent.children?.[0] : undefined;
	const target = key ?? node;
	return { start: target.offset, end: target.offset + target.length };
}

/**
 * Relationships are stored in an array, so their parsed identity is matched
 * against each element rather than looked up as an object path.
 */
type RelationshipJson = {
	type?: string;
	name?: string;
	upstream?: { $ref?: string };
	downstream?: { $ref?: string };
	participants?: { $ref?: string }[];
};

/** The two context ids of a relationship element, in the order its ref uses. */
function endsOf(value: RelationshipJson): [string, string] | undefined {
	const id = ($ref?: string) => {
		const path = $ref ? refToPath($ref) : undefined;
		return path?.length === 2 && path[0] === "boundedcontexts"
			? path[1]
			: undefined;
	};
	// Directed: source is the upstream side. Symmetric: the order as written.
	const [a, b] = value.participants
		? [id(value.participants[0]?.$ref), id(value.participants[1]?.$ref)]
		: [id(value.upstream?.$ref), id(value.downstream?.$ref)];
	return a !== undefined && b !== undefined ? [a, b] : undefined;
}

const relationshipNameId = (name?: string) =>
	name
		?.replace(/([a-z])([A-Z])/g, "$1_$2")
		.replace(/[\s-]+/g, "_")
		.toLowerCase();

function locateRelationship(tree: Node, ref: string): Span | undefined {
	const identity = parseRelationshipRef(ref);
	if (!identity) return undefined;
	const array = findNodeAtLocation(tree, ["relationships"]);
	for (const element of array?.children ?? []) {
		const value = getNodeValue(element) as RelationshipJson;
		const ends = endsOf(value);
		const nameId = value.name ? relationshipNameId(value.name) : undefined;
		if (
			value.type === identity.type &&
			ends?.[0] === identity.sourceId &&
			ends[1] === identity.targetId &&
			nameId === identity.nameId
		)
			return { start: element.offset, end: element.offset + element.length };
	}
	return undefined;
}

/**
 * Consumptions are stored in an array, so their parsed full target and caller
 * refs are matched exactly against the element rather than treated as paths.
 */
type ConsumptionJson = {
	consumable?: { $ref?: string };
	by?: { $ref?: string }[];
};

function locateConsumption(tree: Node, ref: string): Span | undefined {
	const identity = parseConsumptionRef(ref);
	if (!identity) return undefined;
	const consumerPath = refToPath(identity.consumerRef);
	if (!consumerPath) return undefined;
	const array = findNodeAtLocation(tree, [...consumerPath, "consumes"]);
	for (const element of array?.children ?? []) {
		const value = getNodeValue(element) as ConsumptionJson;
		if (value.consumable?.$ref !== identity.consumableRef) continue;
		if (
			identity.callerRef !== undefined &&
			value.by?.[0]?.$ref !== identity.callerRef
		)
			continue;
		return { start: element.offset, end: element.offset + element.length };
	}
	return undefined;
}

/**
 * Character span of the element a ref points at inside a workspace file. Falls back to the
 * deepest existing ancestor, then the workspace name, then the start of the file.
 */
export function locateRef(text: string, ref: string): Span {
	const tree = parseTree(text);
	if (!tree) return { start: 0, end: 0 };
	const relationship = locateRelationship(tree, ref);
	if (relationship) return relationship;
	const consumption = locateConsumption(tree, ref);
	if (consumption) return consumption;
	const segments = refToPath(ref) ?? [];
	for (let n = segments.length; n > 0; n--) {
		const node = findNodeAtLocation(tree, segments.slice(0, n));
		if (node) return spanOf(node);
	}
	const name = findNodeAtLocation(tree, ["name"]);
	return name ? spanOf(name) : { start: 0, end: 0 };
}
