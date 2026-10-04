import { membershipOf } from "./set-membership";
import type {
	BoundedContext,
	ContextRelationship,
	Workspace,
} from "./workspace";

/**
 * What a rule or a derived map may look across: a read-only view of the real
 * workspaces and the real objects in them.
 *
 * A scope is never a merged workspace. Nothing here is copied or renamed, a
 * local ref means what it means in its own workspace, and the contexts and
 * relationships it lists are the objects the workspaces hold, in the order the
 * workspaces were given and then the order each declares them. Walking a scope
 * of one workspace is walking that workspace, exactly.
 */
export interface Scope {
	/** The workspaces in scope, in the order they were given. */
	readonly workspaces: ReadonlyArray<Workspace>;
	/** Every bounded context of every workspace in scope. */
	contexts(): Iterable<BoundedContext>;
	/** Every relationship of every workspace in scope, for lookups across them. */
	readonly relationships: ReadonlyArray<ContextRelationship>;
}

class WorkspaceScope implements Scope {
	private joined: ContextRelationship[] = [];
	private joinedFrom: number[] = [];

	constructor(readonly workspaces: ReadonlyArray<Workspace>) {}

	*contexts(): Iterable<BoundedContext> {
		for (const workspace of this.workspaces)
			yield* workspace.boundedcontexts.values();
	}

	get relationships(): ReadonlyArray<ContextRelationship> {
		if (this.workspaces.length === 1) return this.workspaces[0].relationships;
		// The lists are plain arrays a model may still be adding to, so the join
		// is kept only while no list has changed length.
		const lengths = this.workspaces.map((it) => it.relationships.length);
		if (
			lengths.length !== this.joinedFrom.length ||
			lengths.some((it, i) => it !== this.joinedFrom[i])
		) {
			this.joined = this.workspaces.flatMap((it) => it.relationships);
			this.joinedFrom = lengths;
		}
		return this.joined;
	}
}

/** The scope of exactly these workspaces. */
export function scopeOf(workspaces: ReadonlyArray<Workspace>): Scope {
	return new WorkspaceScope(workspaces);
}

const solo = new WeakMap<Workspace, Scope>();

/**
 * The scope of one workspace read by itself, whatever set it is in. One is
 * kept for each, so a caller in a loop does not rebuild it.
 */
export function soloScope(workspace: Workspace): Scope {
	let scope = solo.get(workspace);
	if (!scope) {
		scope = scopeOf([workspace]);
		solo.set(workspace, scope);
	}
	return scope;
}

/**
 * What a helper that reads across workspaces may be handed: a scope, or a
 * workspace, which is read as the scope of itself alone and never as the set
 * it may be in. A caller that means the set hands the set's scope.
 */
export type InScope = Scope | Workspace;

/** The scope an {@link InScope} stands for. */
export function toScope(from: InScope): Scope {
	return "workspaces" in from ? from : soloScope(from);
}

/**
 * The scope a workspace is read in when it is a member of a set: every
 * workspace of its set, or itself alone when it is in none.
 */
export function scopeAround(workspace: Workspace): Scope {
	const set = membershipOf(workspace)?.set;
	return set ? set.scope : soloScope(workspace);
}
