/**
 * Whether the nodes of a map come from more than one workspace. The first
 * namespace of every node is the workspace it is in, so a map across the files
 * of a set says so, and a map inside one file (the only kind there was) does
 * not: its labels stay as they have always been, and a label names a workspace
 * only where two of them could otherwise read the same.
 */
export function spansWorkspaces(
	nodes: Iterable<{ namespace: ReadonlyArray<{ id: string }> }>,
): boolean {
	let first: string | undefined;
	for (const node of nodes) {
		const workspace = node.namespace[0]?.id;
		if (workspace === undefined) continue;
		if (first === undefined) first = workspace;
		else if (first !== workspace) return true;
	}
	return false;
}
