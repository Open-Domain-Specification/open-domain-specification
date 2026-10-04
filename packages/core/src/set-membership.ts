import { relativeWirePath, type SetPath, type WirePath } from "./path-codec";
import type { Workspace } from "./workspace";
import type { WorkspaceSet } from "./workspace-set";

/** The one set a workspace belongs to, and the file it is there. */
export type SetMembership = { set: WorkspaceSet; file: SetPath };

const memberships = new WeakMap<Workspace, SetMembership>();

/** Records that `workspace` is the file `file` of `set`. Called by the set only. */
export function joinSet(
	workspace: Workspace,
	set: WorkspaceSet,
	file: SetPath,
): void {
	memberships.set(workspace, { set, file });
}

export function membershipOf(workspace: Workspace): SetMembership | undefined {
	return memberships.get(workspace);
}

/**
 * The wire path `from` writes for the file of `to`, both members of one set.
 * Linking an element of another workspace is only meaningful inside a set, so
 * asking for an identity before the set exists is the author's mistake and
 * throws, as the DSL does for any programming error (decision 29).
 */
export function wirePathBetween(from: Workspace, to: Workspace): WirePath {
	const here = membershipOf(from);
	const there = membershipOf(to);
	if (!here || !there || here.set !== there.set)
		throw new Error(
			`Workspace ${to.id} is linked from workspace ${from.id}; put both in one WorkspaceSet before reading an identity that spans them`,
		);
	return relativeWirePath(here.file, there.file);
}
