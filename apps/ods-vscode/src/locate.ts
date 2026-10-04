import {
	decodeRefSegment,
	parseConsumptionRef,
	parseRef,
	parseRelationshipRef,
	resolveWirePath,
	type SetPath,
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
 * The file a link written in `owner` names, as the resolver reads it. A
 * diagnostic's ref carries the canonical spelling of the files it links
 * (`b.json`, `../x/%C3%A9.json`) while the file may write any spelling the
 * resolver accepts (`./b.json`, `%2E%2E/x/b.json`, lowercase hex), so two
 * spellings are the same link exactly when they resolve to one set path from
 * the owning file. `.` is the owner itself. Undefined when the resolver
 * refuses it, which names no file at all.
 */
function fileOf(owner: SetPath, wire: string): SetPath | undefined {
	if (wire === ".") return owner;
	const resolved = resolveWirePath(owner, wire);
	return resolved.ok ? resolved.path : undefined;
}

/**
 * Whether two wire paths, each written in `owner`, name one file. Without an
 * owner there is nothing to resolve against and only identical text is the same
 * file, which is exact for a document core wrote itself.
 */
function sameFile(owner: SetPath | undefined, a: string, b: string): boolean {
	if (owner === undefined) return a === b;
	const file = fileOf(owner, a);
	return file !== undefined && file === fileOf(owner, b);
}

/**
 * Whether two full refs written in `owner` name one element: the same file,
 * as the resolver reads it, and the same pointer. A ref without a path stays
 * in the owner, so an equal pointer in another file is not it. A ref the
 * resolver refuses matches only identical text.
 */
function sameRef(
	owner: SetPath | undefined,
	written: string | undefined,
	identity: string,
): boolean {
	if (written === undefined) return false;
	if (written === identity) return true;
	if (owner === undefined) return false;
	const a = parseRef(written);
	const b = parseRef(identity);
	if (!a.ok || !b.ok || a.pointer !== b.pointer) return false;
	return sameFile(owner, a.local ? "." : a.wire, b.local ? "." : b.wire);
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

/** One end of a relationship as written: the file it names (`.` for the declaring file) and its context id. */
type End = { path: string; id: string };

function endOf($ref?: string): End | undefined {
	if (!$ref) return undefined;
	const hash = $ref.indexOf("#");
	if (hash < 0) return undefined;
	const path = refToPath($ref.slice(hash));
	if (path?.length !== 2 || path[0] !== "boundedcontexts") return undefined;
	return { path: hash === 0 ? "." : $ref.slice(0, hash), id: path[1] };
}

/** The two ends of a relationship element, in the order its ref uses. */
function endsOf(value: RelationshipJson): [End, End] | undefined {
	// Directed: source is the upstream side. Symmetric: the order as written.
	const [a, b] = value.participants
		? [endOf(value.participants[0]?.$ref), endOf(value.participants[1]?.$ref)]
		: [endOf(value.upstream?.$ref), endOf(value.downstream?.$ref)];
	return a && b ? [a, b] : undefined;
}

const relationshipNameId = (name?: string) =>
	name
		?.replace(/([a-z])([A-Z])/g, "$1_$2")
		.replace(/[\s-]+/g, "_")
		.toLowerCase();

type RelationshipIdentity = NonNullable<
	ReturnType<typeof parseRelationshipRef>
>;

function matchesRelationship(
	value: RelationshipJson,
	identity: RelationshipIdentity,
	owner?: SetPath,
): boolean {
	const ends = endsOf(value);
	if (!ends) return false;
	const nameId = value.name ? relationshipNameId(value.name) : undefined;
	// The five and six segment form names only this file; the seven and eight
	// segment form states the file of each end, `.` for the declaring one.
	const [source, target] = ends;
	return (
		value.type === identity.type &&
		source.id === identity.sourceId &&
		target.id === identity.targetId &&
		sameFile(owner, source.path, identity.sourcePath ?? ".") &&
		sameFile(owner, target.path, identity.targetPath ?? ".") &&
		nameId === identity.nameId
	);
}

function locateRelationship(
	tree: Node,
	ref: string,
	owner?: SetPath,
): Span | undefined {
	const identity = parseRelationshipRef(ref);
	if (!identity) return undefined;
	const array = findNodeAtLocation(tree, ["relationships"]);
	for (const element of array?.children ?? []) {
		if (
			matchesRelationship(
				getNodeValue(element) as RelationshipJson,
				identity,
				owner,
			)
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

type ConsumptionIdentity = NonNullable<ReturnType<typeof parseConsumptionRef>>;

function matchesConsumption(
	value: ConsumptionJson,
	identity: ConsumptionIdentity,
	owner?: SetPath,
): boolean {
	if (!sameRef(owner, value.consumable?.$ref, identity.consumableRef))
		return false;
	return (
		identity.callerRef === undefined ||
		sameRef(owner, value.by?.[0]?.$ref, identity.callerRef)
	);
}

function locateConsumption(
	tree: Node,
	ref: string,
	owner?: SetPath,
): Span | undefined {
	const identity = parseConsumptionRef(ref);
	if (!identity) return undefined;
	const consumerPath = refToPath(identity.consumerRef);
	if (!consumerPath) return undefined;
	const array = findNodeAtLocation(tree, [...consumerPath, "consumes"]);
	for (const element of array?.children ?? []) {
		if (
			matchesConsumption(
				getNodeValue(element) as ConsumptionJson,
				identity,
				owner,
			)
		)
			return { start: element.offset, end: element.offset + element.length };
	}
	return undefined;
}

/**
 * Character span of the element a ref points at inside a workspace file. Falls back to the
 * deepest existing ancestor, then the workspace name, then the start of the file.
 *
 * `owner` is the set path of the file whose text this is. Links to other files
 * are compared as the files they resolve to from it, so a file may write
 * `./b.json` or `%c3%a9.json` for what the ref spells `b.json` or `%C3%A9.json`.
 * Without it a link is matched only by identical text.
 */
export function locateRef(text: string, ref: string, owner?: SetPath): Span {
	const tree = parseTree(text);
	if (!tree) return { start: 0, end: 0 };
	const relationship = locateRelationship(tree, ref, owner);
	if (relationship) return relationship;
	const consumption = locateConsumption(tree, ref, owner);
	if (consumption) return consumption;
	const segments = refToPath(ref) ?? [];
	for (let n = segments.length; n > 0; n--) {
		const node = findNodeAtLocation(tree, segments.slice(0, n));
		if (node) return spanOf(node);
	}
	const name = findNodeAtLocation(tree, ["name"]);
	return name ? spanOf(name) : { start: 0, end: 0 };
}

/** A location inside parsed workspace JSON: object keys and array indexes. */
export type JsonPath = Array<string | number>;

const own = (value: unknown, key: string | number): unknown => {
	if (Array.isArray(value))
		return typeof key === "number" ? value[key] : undefined;
	if (typeof value === "object" && value !== null)
		return Object.hasOwn(value, key) ? (value as never)[key] : undefined;
	return undefined;
};

/** The value at `path` in parsed JSON, or undefined when any step is absent. */
export function valueAtPath(root: unknown, path: JsonPath): unknown {
	let at = root;
	for (const key of path) at = own(at, key);
	return at;
}

/**
 * Where the element a ref names sits inside already-parsed workspace JSON:
 * the same addressing as {@link locateRef} (relationship and consumption refs
 * match an array element, everything else is an object path), but returning a
 * path to edit instead of a span to show. Undefined when nothing is there.
 */
export function jsonPathOfRef(
	root: unknown,
	ref: string,
	owner?: SetPath,
): JsonPath | undefined {
	if (ref === "#") return [];
	const relationship = parseRelationshipRef(ref);
	if (relationship) {
		const list = own(root, "relationships");
		const index = Array.isArray(list)
			? list.findIndex((v) => matchesRelationship(v, relationship, owner))
			: -1;
		return index < 0 ? undefined : ["relationships", index];
	}
	const consumption = parseConsumptionRef(ref);
	if (consumption) {
		// parseConsumptionRef has already checked the consumer segments decode.
		const consumer = refToPath(consumption.consumerRef) as string[];
		const list = own(valueAtPath(root, consumer), "consumes");
		const index = Array.isArray(list)
			? list.findIndex((v) => matchesConsumption(v, consumption, owner))
			: -1;
		return index >= 0 ? [...consumer, "consumes", index] : undefined;
	}
	const path = refToPath(ref);
	return path && valueAtPath(root, path) !== undefined ? path : undefined;
}
