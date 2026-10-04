import {
	encodeWirePath,
	type PathCause,
	resolveWirePath,
	type SetPath,
	validateSetPath,
} from "./path-codec";
import { type ParsedRef, parseRef } from "./reference";
import type { WorkspaceSchema } from "./schema";
import { type Scope, scopeOf } from "./scope";
import { joinSet, membershipOf, wirePathBetween } from "./set-membership";
import {
	type RuleDescription,
	type SetDiagnostic,
	validateSet,
} from "./validate";
import type { Visitable } from "./visitable";
import type { Visitor } from "./visitor";
import { type Referenceable, type Workspace, workspaceOf } from "./workspace";
import { beginLoading, linkLoadings } from "./workspace-from-schema";

/**
 * What a ref is expected to name: how to find a candidate by pointer in one
 * workspace, and whether the candidate is the kind wanted. Keeping the two
 * apart is what lets a resolution say `missing-target` (nothing there) from
 * `wrong-kind` (something else there). A lookup that finds only its own kind
 * says `undefined` for both, so {@link resolveWritten} asks the file what
 * else stands at the pointer before it reports nothing.
 */
export type RefKind<T extends object> = {
	readonly label: string;
	lookup(workspace: Workspace, pointer: string): object | undefined;
	is(found: object): found is T;
};

/** Builds a {@link RefKind} from a lookup and a type guard. */
export function refKind<T extends object>(
	label: string,
	lookup: (workspace: Workspace, pointer: string) => object | undefined,
	is: (found: object) => found is T,
): RefKind<T> {
	return { label, lookup, is };
}

type ElementClass = abstract new (...args: never[]) => object;

/**
 * The kind "an instance of one of these classes", found by the workspace's own
 * pointer lookup (`getByRef`), so a pointer is read exactly as it is in a
 * single workspace.
 */
export function kindOfClass<C extends readonly ElementClass[]>(
	label: string,
	...classes: C
): RefKind<InstanceType<C[number]>> {
	return refKind(
		label,
		(workspace, pointer) => workspace.getByRef(pointer),
		(found): found is InstanceType<C[number]> =>
			classes.some((it) => found instanceof it),
	);
}

/** The outcome of resolving one written ref. A mistake in the model is a result, never a throw. */
export type Resolution<T extends object> =
	| { ok: true; target: T; workspace: Workspace }
	| {
			ok: false;
			cause: "invalid-path";
			reason: Extract<ParsedRef, { ok: false }>["cause"];
			detail: string;
	  }
	| { ok: false; cause: "missing-file"; file: SetPath; detail: string }
	| { ok: false; cause: "missing-target"; file: SetPath; detail: string }
	| {
			ok: false;
			cause: "wrong-kind";
			file: SetPath;
			found: object;
			detail: string;
	  };

/** A file the host offered that the set could not take. */
export type RejectedFile = {
	/** The path exactly as the host gave it. */
	file: string;
	cause: PathCause | "duplicate-path";
	detail: string;
};

/**
 * N complete workspaces, each one file, and nothing else: no root manifest, no
 * merged model. Local ids stay scoped to their own workspace; a ref reaches
 * another workspace only by naming its file.
 */
export class WorkspaceSet implements Visitable {
	private readonly files = new Map<SetPath, Workspace>();

	/** The workspaces in the order they were given, never sorted. */
	readonly workspaces: ReadonlyArray<Workspace>;

	/**
	 * The entries a host offered through {@link fromSchemas} that were left
	 * out, in the order offered; each is a `file-path-invalid` diagnostic of
	 * {@link validate}. Always empty for a set built from workspaces.
	 */
	readonly rejected: ReadonlyArray<RejectedFile>;

	/**
	 * What a rule or a derived map may look across: these workspaces, as they
	 * are, in the order given. Never a merged workspace.
	 */
	readonly scope: Scope;

	private constructor(
		entries: ReadonlyArray<[SetPath, Workspace]>,
		rejected: ReadonlyArray<RejectedFile> = [],
	) {
		for (const [file, workspace] of entries) {
			this.files.set(file, workspace);
			joinSet(workspace, this, file);
		}
		this.workspaces = entries.map(([, workspace]) => workspace);
		this.rejected = rejected;
		this.scope = scopeOf(this.workspaces);
	}

	/**
	 * Loads files as written: each `[path, schema]` entry is one complete
	 * workspace, and a `$ref` that names a file is linked to the workspace
	 * that file is. A mistake in what the host offered or what a file says is
	 * a diagnostic of {@link validate}, never a throw: a path that is not
	 * canonical, or given twice, leaves its entry out (`file-path-invalid`);
	 * two files with one workspace id are both kept and the later one reported
	 * (`workspace-id-unique`); a ref that reaches nothing is an `unresolved-ref`
	 * at its file. A file that refers back to the file that refers to it is
	 * legal.
	 *
	 * Every workspace is made and joined to the set before any ref is read,
	 * so an element's identity is never read before the set that gives it one.
	 */
	static fromSchemas(
		entries: Iterable<[SetPath, WorkspaceSchema]>,
	): WorkspaceSet {
		const accepted: Array<[SetPath, WorkspaceSchema]> = [];
		const rejected: RejectedFile[] = [];
		const paths = new Set<SetPath>();
		for (const [file, schema] of entries) {
			const checked = validateSetPath(file);
			if (!checked.ok)
				rejected.push({ file, cause: checked.cause, detail: checked.detail });
			else if (paths.has(file))
				rejected.push({
					file,
					cause: "duplicate-path",
					detail: "the same path was offered twice, and the first was kept",
				});
			else {
				paths.add(file);
				accepted.push([file, schema]);
			}
		}
		const loadings = accepted.map(([, schema]) => beginLoading(schema));
		const set = new WorkspaceSet(
			accepted.map(([file], i) => [file, loadings[i].workspace]),
			rejected,
		);
		linkLoadings(loadings);
		return set;
	}

	accept(v: Visitor) {
		if (v.visitWorkspaceSet) return v.visitWorkspaceSet(this);
		for (const workspace of this.workspaces) workspace.accept(v);
	}

	/**
	 * Every workspace as the file it is, keyed by its raw set path in the order
	 * of the set. A ref to another file is written by {@link refTo}, so what
	 * comes out loads back to the same set.
	 */
	toSchemas(): Map<SetPath, WorkspaceSchema> {
		return new Map(
			this.workspaces.map((workspace) => [
				workspace.file as SetPath,
				workspace.toSchema(),
			]),
		);
	}

	/**
	 * Checks the files together against every rule, each diagnostic carrying
	 * the file of the element it is about. A set of one file answers as that
	 * workspace does alone.
	 */
	validate(): SetDiagnostic[] {
		return validateSet(this);
	}

	/**
	 * Builds a set from workspaces the DSL made. Each path is the raw
	 * {@link SetPath} of its file. This is authored code, so a path that is not
	 * canonical, a path or workspace given twice, or a workspace already in a
	 * set is a programming error and throws (decision 29); nothing is joined
	 * unless every entry is accepted.
	 */
	static fromWorkspaces(entries: Iterable<[SetPath, Workspace]>): WorkspaceSet {
		const accepted: Array<[SetPath, Workspace]> = [];
		const paths = new Set<SetPath>();
		const members = new Set<Workspace>();
		for (const [file, workspace] of entries) {
			const checked = validateSetPath(file);
			if (!checked.ok)
				throw new Error(
					`Invalid set path ${JSON.stringify(file)}: ${checked.cause} (${checked.detail})`,
				);
			if (paths.has(file))
				throw new Error(`Set path ${JSON.stringify(file)} is given twice`);
			if (members.has(workspace) || membershipOf(workspace))
				throw new Error(
					`Workspace ${workspace.id} is already in a set and cannot be ${JSON.stringify(file)} too`,
				);
			paths.add(file);
			members.add(workspace);
			accepted.push([file, workspace]);
		}
		return new WorkspaceSet(accepted);
	}

	/** The workspace that is the file `path`, if the set has it. */
	byPath(path: SetPath): Workspace | undefined {
		return this.files.get(path);
	}

	/**
	 * Resolves a ref `from` one of this set's workspaces wrote. A fragment-only
	 * ref (`#/...`) is looked up in `from` alone and never anywhere else; a
	 * file-qualified one (`b.json#/...`) is looked up in exactly the file it
	 * names, resolved against `from`'s own directory. Never throws on a model
	 * mistake; `from` not being in this set is the caller's error and does.
	 */
	resolve<T extends object>(
		from: Workspace,
		written: string,
		kind: RefKind<T>,
	): Resolution<T> {
		if (membershipOf(from)?.set !== this)
			throw new Error(`Workspace ${from.id} is not in this set`);
		return resolveWritten(from, written, kind);
	}

	/**
	 * What `from` writes to name `target`, the inverse of {@link resolve}: the
	 * element's own pointer within its file, or the relative wire path of its
	 * file followed by that pointer. Both must belong to this set, which is the
	 * caller's responsibility and throws otherwise.
	 */
	refTo(from: Workspace, target: Referenceable | { ref: string }): string {
		if (membershipOf(from)?.set !== this)
			throw new Error(`Workspace ${from.id} is not in this set`);
		const owner = workspaceOf(target);
		if (!owner || membershipOf(owner)?.set !== this)
			throw new Error(
				`${target.ref} is not an element of a workspace in this set`,
			);
		return owner === from
			? target.ref
			: `${wirePathBetween(from, owner)}${target.ref}`;
	}
}

/**
 * The key of an element across a set: the wire path of its file followed by
 * its own pointer, for example `a%23%25.json#/boundedcontexts/ledger`. It
 * depends on the owning file alone, so adding, removing or reordering other
 * workspaces never changes it. Absent for an element of a workspace that is in
 * no set.
 */
export function setKeyOf(element: { ref: string }): string | undefined {
	const owner = workspaceOf(element);
	const file = owner?.file;
	return file === undefined
		? undefined
		: `${encodeWirePath(file)}${element.ref}`;
}

/**
 * The one resolver: reads a ref as `from` wrote it and finds what it names.
 * Inside a set a qualified ref is looked up in the file it names; outside one
 * (a workspace loaded alone) the same grammar is judged the same way and a
 * file-qualified ref has no file to name, so it is `missing-file`. A fragment
 * is always looked up in `from` and nowhere else.
 */
export function resolveWritten<T extends object>(
	from: Workspace,
	written: string,
	kind: RefKind<T>,
): Resolution<T> {
	const source = membershipOf(from);
	const parsed = parseRef(written);
	if (!parsed.ok)
		return {
			ok: false,
			cause: "invalid-path",
			reason: parsed.cause,
			detail: parsed.detail,
		};
	let file = source?.file ?? ALONE;
	let workspace = from;
	if (!parsed.local) {
		const resolved = resolveWirePath(file, parsed.wire);
		if (!resolved.ok)
			return {
				ok: false,
				cause: "invalid-path",
				reason: resolved.cause,
				detail: resolved.detail,
			};
		const found = source?.set.byPath(resolved.path);
		if (!found)
			return {
				ok: false,
				cause: "missing-file",
				file: resolved.path,
				detail: `${resolved.path} is not a workspace file of ${source ? "this set" : "a set; this workspace was loaded alone"}`,
			};
		file = resolved.path;
		workspace = found;
	}
	const found = kind.lookup(workspace, parsed.pointer);
	if (found !== undefined && kind.is(found))
		return { ok: true, target: found, workspace };
	// A kind that is found by a lookup of its own (a relationship, a consumption,
	// an answer) finds nothing for an element of any other kind, so what stands
	// at the pointer is asked of the file itself before it is said to be absent.
	const other = found ?? existingAt(workspace, parsed.pointer);
	if (other === undefined)
		return {
			ok: false,
			cause: "missing-target",
			file,
			detail: `${parsed.pointer} names nothing in ${file}`,
		};
	return {
		ok: false,
		cause: "wrong-kind",
		file,
		found: other,
		detail: `${parsed.pointer} in ${file} is not ${kind.label}`,
	};
}

/**
 * Whatever a file has at a pointer, of any kind: an element it names, an
 * answer, or one of the two pairings it finds by a ref of their own.
 */
function existingAt(workspace: Workspace, pointer: string): object | undefined {
	return (
		workspace.getByRef(pointer) ??
		workspace.findRelationship(pointer) ??
		workspace.findConsumption(pointer)
	);
}

/** The place a workspace loaded alone is judged to sit: the root of nothing. */
const ALONE: SetPath = "workspace.json";

/**
 * What tells one element from another across everything a rule or a map may
 * look at: its {@link setKeyOf} when its workspace is in a set, and its own
 * `ref` when it is not, where that ref is already unique. The one place a key
 * for "this element, wherever it is" is made, so nothing is keyed by a local
 * `ref` or `id` that two files may share.
 */
export function identityKeyOf(element: { ref: string }): string {
	return setKeyOf(element) ?? element.ref;
}

/**
 * The faults of a set as a set: the entries a host offered that were refused,
 * and files that claim one workspace id. Both are errors, because a path that
 * cannot be resolved against and an id two files share leave refs and routes
 * that name them unable to say which file they mean.
 */
export function setFaults(set: WorkspaceSet): SetDiagnostic[] {
	const refused = set.rejected.map(
		(it): SetDiagnostic => ({
			severity: "error",
			rule: "file-path-invalid",
			message: `${JSON.stringify(it.file)} cannot be a workspace file of this set (${it.cause}: ${it.detail}); it was left out, so a ref to it is reported unresolved`,
			ref: "#",
			file: it.file,
		}),
	);
	const firstOf = new Map<string, SetPath>();
	const shared: SetDiagnostic[] = [];
	for (const workspace of set.workspaces) {
		const file = workspace.file as SetPath;
		const first = firstOf.get(workspace.id);
		if (first === undefined) {
			firstOf.set(workspace.id, file);
			continue;
		}
		shared.push({
			severity: "error",
			rule: "workspace-id-unique",
			message: `Workspace id "${workspace.id}" is also the id of ${JSON.stringify(first)}; each file of a set is one workspace with an id of its own, so give one of them another`,
			ref: "#/id",
			file,
		});
	}
	return [...refused, ...shared];
}

/**
 * The two rules that are about a set rather than a workspace, described the
 * way {@link RULE_CATALOG} describes the others. They are not in that
 * catalogue because they are not asked of a workspace: a workspace alone has
 * no sibling file to share an id with, and no host to offer it a path.
 */
export const SET_RULE_CATALOG: ReadonlyArray<RuleDescription> = [
	{
		rule: "file-path-invalid",
		severities: ["error"],
		summary:
			"Every file a host offers a set has a canonical, unique, relative path to a .json file inside the set's folder.",
		why: "A ref between files is a path, resolved against the file that writes it, so a file whose path cannot be written that way, or that another file already has, can never be named. It is left out of the set rather than guessed at, and every ref that would have reached it is reported unresolved at the file that wrote it.",
		fix: "Rename the file so its path is relative, uses forward slashes, holds no control character, ends in .json and is not schema.json, and give no two files one path.",
	},
	{
		rule: "workspace-id-unique",
		severities: ["error"],
		summary: "Every file of a set is a workspace with an id of its own.",
		why: "A workspace id names a file in routes, in folders of generated documentation and in the cluster a context is drawn under. Two files that claim one id cannot be told apart by any of them, although their elements stay apart by file.",
		fix: "Give one of the files a different id, and leave the ids of elements inside as they are: local ids may repeat across files.",
	},
];
