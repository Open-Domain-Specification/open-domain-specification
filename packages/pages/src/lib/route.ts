import {
	decodeRefSegment,
	decodeWirePath,
	encodeRefSegment,
	encodeWirePath,
	parseRef,
	type SetPath,
	validateSetPath,
	type Workspace,
	type WorkspaceSet,
	workspaceOf,
} from "@open-domain-specification/core";

/**
 * Routes into a set of workspace files.
 *
 * A reader that holds one workspace (a file opened alone, or a set of one)
 * keeps the route grammar it always had: `#/boundedcontexts/<context>`. A
 * reader that holds more than one names the file first, because two files may
 * both have a `ledger` and a local ref says nothing about which:
 *
 *   `#`                                  the set (its workspaces)
 *   `#/workspaces/<file>`                the workspace of that file
 *   `#/workspaces/<file>/boundedcontexts/<context>/...`   an element in it
 *
 * `<file>` is the wire path of the file (`encodeWirePath`, so `a#%.json` is
 * `a%23%25.json` and `a/team.json` stays two segments), carried as one
 * pointer segment. Nothing here looks an id up anywhere but in the file the
 * route names: there is no search across files and no fallback.
 */
export const WORKSPACES = "workspaces";

/** A route is qualified exactly when its reader holds more than one file. */
export const qualifies = (set: WorkspaceSet | undefined): boolean =>
	set !== undefined && set.workspaces.length > 1;

/**
 * The route of the element `pointer` names in the file `file`, as a reader
 * that holds `files` files writes it: unqualified for one file, qualified for
 * more. A host that posts the files itself (the extension) uses this to say
 * where a page is without building the set the app builds.
 */
export function routeInFiles(
	files: number,
	file: SetPath,
	pointer: string,
): string {
	if (files <= 1) return pointer;
	const wire = encodeRefSegment(encodeWirePath(file));
	return `#/${WORKSPACES}/${wire}${pointer === "#" ? "" : pointer.slice(1)}`;
}

/**
 * The file and the local ref a qualified route names, read without a set; the
 * reverse of {@link routeInFiles}. Undefined for a route that names no file:
 * the set's own page, or a route of a reader that holds one file.
 */
export function fileOfRoute(
	route: string,
): { file: SetPath; ref: string } | undefined {
	const parts = route.split("/");
	if (parts[0] !== "#" || parts[1] !== WORKSPACES || parts.length < 3)
		return undefined;
	const wire = decodeRefSegment(parts[2]);
	const decoded = wire === undefined ? undefined : decodeWirePath(wire);
	// A route names a file by its path under the folder: nothing relative to
	// another file, and nothing that cannot be the path of a workspace file.
	if (!decoded?.ok || !validateSetPath(decoded.path).ok) return undefined;
	const tail = parts.slice(3);
	return {
		file: decoded.path,
		ref: tail.length ? `#/${tail.join("/")}` : "#",
	};
}

/**
 * The route of the element `pointer` names in the file `file`, as a reader of
 * `set` writes it. `pointer` is a local pointer (`#`, `#/boundedcontexts/x`).
 */
export function routeIn(
	set: WorkspaceSet | undefined,
	file: SetPath,
	pointer: string,
): string {
	return routeInFiles(set?.workspaces.length ?? 1, file, pointer);
}

/**
 * The route of an element: its own local ref for a standalone workspace or a
 * set of one, and the file-qualified route inside a larger set.
 */
export function routeOf(element: { ref: string }): string {
	const owner = workspaceOf(element);
	const set = owner?.set;
	if (!owner || !qualifies(set)) return element.ref;
	return routeIn(set, owner.file as SetPath, element.ref);
}

/**
 * The route a key made by `identityKeyOf` stands for. Map nodes and edges are
 * identified by it, so a click on one lands on the page of the exact owner.
 * A key with no file (an element of a workspace in no set) is its own route.
 */
export function routeOfKey(set: WorkspaceSet | undefined, key: string): string {
	const parsed = parseRef(key);
	if (!parsed.ok || parsed.local) return key;
	// `parseRef` has decoded the wire path already, so this cannot fail.
	const { path } = decodeWirePath(parsed.wire) as { ok: true; path: string };
	return routeIn(set, path, parsed.pointer);
}

/** What a route in a qualified set means: the file's workspace and the local ref in it. */
export type RouteTarget =
	| { kind: "set" }
	| { kind: "workspace"; workspace: Workspace; ref: string }
	| { kind: "unknown-file"; file: string };

/**
 * Reads a route of a set. A set of one has only local routes (the one file is
 * implied). In a larger set `#` is the set and `#/workspaces/<file>...` names
 * one file; a route with no file in it (`#/health`, a bare element ref) is the
 * set, never read in some default file, because that would be a global
 * fallback. A file the set does not have is reported with its path.
 */
export function routeTarget(set: WorkspaceSet, route: string): RouteTarget {
	if (!qualifies(set)) {
		return { kind: "workspace", workspace: set.workspaces[0], ref: route };
	}
	if (!route.startsWith(`#/${WORKSPACES}/`)) return { kind: "set" };
	const named = fileOfRoute(route);
	const workspace = named ? set.byPath(named.file) : undefined;
	if (!named || !workspace)
		return { kind: "unknown-file", file: route.split("/")[2] };
	return { kind: "workspace", workspace, ref: named.ref };
}
