import type {
	BoundedContext,
	Workspace,
} from "@open-domain-specification/core";

/**
 * The crumbs above a page owned by a bounded context: the workspace, then the
 * context. `ownerCrumbs` in `templates/elements.ts` is the same line for a
 * page owned by an aggregate; this is the shorter pair, which five of the
 * tactical pages need and each was spelling out for itself.
 */
export const contextCrumbs = (
	ws: Workspace,
	bc: BoundedContext,
): [string, string][] => [
	["#", ws.name],
	[bc.ref, bc.name],
];
