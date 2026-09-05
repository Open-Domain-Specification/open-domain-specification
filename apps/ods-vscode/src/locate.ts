import {
	findNodeAtLocation,
	getNodeValue,
	type Node,
	parseTree,
} from "jsonc-parser";

export type Span = { start: number; end: number };

/** Splits a model ref such as `#/boundedcontexts/x/aggregates/y` into JSON path segments. */
export function refToPath(ref: string): string[] {
	return ref
		.replace(/^#\/?/, "")
		.split("/")
		.filter(Boolean)
		.map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function spanOf(node: Node): Span {
	// Prefer the property key so a squiggle sits on the id rather than the whole object.
	const key =
		node.parent?.type === "property" ? node.parent.children?.[0] : undefined;
	const target = key ?? node;
	return { start: target.offset, end: target.offset + target.length };
}

/**
 * A relationship's ref is `#/relationships/<source>~<type>~<target>`, but in the
 * file relationships are an array with no keys, so the triple has to be matched
 * against each element rather than looked up by path.
 */
const RELATIONSHIP = /^#\/relationships\/([^~]+)~([^~]+)~([^~]+)$/;

type RelationshipJson = {
	type?: string;
	upstream?: { $ref?: string };
	downstream?: { $ref?: string };
	participants?: { $ref?: string }[];
};

/** The two context ids of a relationship element, in the order its ref uses. */
function endsOf(value: RelationshipJson): [string, string] | undefined {
	const id = ($ref?: string) => $ref?.replace("#/boundedcontexts/", "");
	// Directed: source is the upstream side. Symmetric: the order as written.
	const [a, b] = value.participants
		? [id(value.participants[0]?.$ref), id(value.participants[1]?.$ref)]
		: [id(value.upstream?.$ref), id(value.downstream?.$ref)];
	return a && b ? [a, b] : undefined;
}

function locateRelationship(tree: Node, ref: string): Span | undefined {
	const match = ref.match(RELATIONSHIP);
	if (!match) return undefined;
	const [, source, type, target] = match;
	const array = findNodeAtLocation(tree, ["relationships"]);
	for (const element of array?.children ?? []) {
		const value = getNodeValue(element) as RelationshipJson;
		const ends = endsOf(value);
		if (value.type === type && ends?.[0] === source && ends[1] === target)
			return { start: element.offset, end: element.offset + element.length };
	}
	return undefined;
}

/**
 * A consumption's ref is `<consumer>/consumes/<consumable path with ~ for />`,
 * but in the file `consumes` is an array with no keys, so the consumable has
 * to be matched against each element's `$ref` rather than looked up by path.
 */
const CONSUMPTION = /^(#\/.+)\/consumes\/([^/]+)$/;

type ConsumptionJson = { consumable?: { $ref?: string } };

function locateConsumption(tree: Node, ref: string): Span | undefined {
	const match = ref.match(CONSUMPTION);
	if (!match) return undefined;
	const [, consumer, flattened] = match;
	const consumable = `#/${flattened.split("~").join("/")}`;
	const array = findNodeAtLocation(tree, [...refToPath(consumer), "consumes"]);
	for (const element of array?.children ?? []) {
		const value = getNodeValue(element) as ConsumptionJson;
		if (value.consumable?.$ref === consumable)
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
	const segments = refToPath(ref);
	for (let n = segments.length; n > 0; n--) {
		const node = findNodeAtLocation(tree, segments.slice(0, n));
		if (node) return spanOf(node);
	}
	const name = findNodeAtLocation(tree, ["name"]);
	return name ? spanOf(name) : { start: 0, end: 0 };
}
