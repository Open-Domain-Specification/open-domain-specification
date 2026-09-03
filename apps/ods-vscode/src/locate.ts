import { findNodeAtLocation, type Node, parseTree } from "jsonc-parser";

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
 * Character span of the element a ref points at inside a workspace file. Falls back to the
 * deepest existing ancestor, then the workspace name, then the start of the file.
 */
export function locateRef(text: string, ref: string): Span {
	const tree = parseTree(text);
	if (!tree) return { start: 0, end: 0 };
	const segments = refToPath(ref);
	for (let n = segments.length; n > 0; n--) {
		const node = findNodeAtLocation(tree, segments.slice(0, n));
		if (node) return spanOf(node);
	}
	const name = findNodeAtLocation(tree, ["name"]);
	return name ? spanOf(name) : { start: 0, end: 0 };
}
