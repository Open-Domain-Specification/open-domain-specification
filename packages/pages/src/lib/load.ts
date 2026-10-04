import {
	type Diagnostic,
	type SetDiagnostic,
	type SetPath,
	Workspace,
	type WorkspaceSchema,
	WorkspaceSet,
} from "@open-domain-specification/core";
import type { WorkspacePayload } from "../protocol";
import type { Model } from "./model";

/**
 * What the app does with the workspaces a host hands it. A payload with no
 * `set` is a workspace opened alone, exactly as the app has always read it.
 * Payloads that share a `set` are the files of one folder: they are loaded
 * together, so a `$ref` that names another file reaches that file, and each
 * file keeps its own page, its own diagnostics and its own identity. Nothing is
 * ever merged into one workspace and no id is looked up across files.
 */

/** One file of a set as the reader sees it. */
export type SetFile = {
	/** The raw set path of the file, relative to the set's folder. */
	path: SetPath;
	/** What the file is called where it is shown. */
	fileLabel: string;
	workspace: Workspace;
	/** What is wrong with this file, judged together with the files it names. */
	diagnostics: Diagnostic[];
	/** Set when the file's current text does not load and this is its last good load. */
	stale?: string;
	model: Model;
};

/** A file the host offered that could not become a workspace of the set. */
export type ExcludedFile = {
	path: string;
	fileLabel: string;
	/** What is wrong, with what to do about it. */
	message: string;
};

/** Everything the app holds for one set of files. */
export type LoadedSet = {
	set: WorkspaceSet;
	/** In the order the host gave them; the set keeps the same order. */
	files: SetFile[];
	excluded: ExcludedFile[];
	/** What may make the set less than the whole project, shown on every page of it. */
	notices: string[];
	/** The model of one of the set's workspaces. */
	modelOf(workspace: Workspace): Model | undefined;
};

/** What the app is showing: one workspace, or one set. */
export type Loaded =
	| { kind: "workspace"; model: Model }
	| { kind: "set"; loaded: LoadedSet };

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * What core's loader assumes of a workspace file and would otherwise throw a
 * TypeError on: the top two levels only. Returns what is wrong, or undefined.
 * Anything deeper that still throws is caught by the trial load.
 */
export function shapeProblem(value: unknown): string | undefined {
	if (!isPlain(value)) return "the file is not a JSON object";
	if (typeof value.name !== "string")
		return 'the workspace needs a string "name"';
	for (const key of ["id", "description", "version"])
		if (key in value && typeof value[key] !== "string")
			return `"${key}" must be a string`;
	for (const key of ["domains", "boundedcontexts", "teams"]) {
		if (!(key in value)) continue;
		const group = value[key];
		if (!isPlain(group)) return `"${key}" must be an object keyed by id`;
		for (const [id, entry] of Object.entries(group))
			if (!isPlain(entry)) return `"${key}.${id}" must be an object`;
	}
	if ("relationships" in value) {
		const list = value.relationships;
		if (!Array.isArray(list)) return '"relationships" must be an array';
		for (const [i, entry] of list.entries())
			if (!isPlain(entry)) return `"relationships[${i}]" must be an object`;
	}
	return undefined;
}

const messageOf = (e: unknown): string =>
	e instanceof Error ? e.message : String(e);

/** A workspace opened alone, as the app has always loaded one. */
function loadWorkspace(payload: WorkspacePayload): Model {
	const workspace = Workspace.fromSchema(payload.schema as WorkspaceSchema);
	return {
		workspace,
		fileLabel: payload.fileLabel,
		diagnostics: payload.diagnostics ?? workspace.validate(),
		...(payload.stale && { stale: payload.stale }),
	};
}

const NEXT = "Fix it, or leave the file out of the folder.";

/** Why a payload cannot be a member of the set, or undefined when it can. */
function trial(path: SetPath, payload: WorkspacePayload): string | undefined {
	const problem = shapeProblem(payload.schema);
	if (problem) return `${path} is not a workspace file: ${problem}. ${NEXT}`;
	try {
		const alone = WorkspaceSet.fromSchemas([
			[path, payload.schema as WorkspaceSchema],
		]);
		alone.toSchemas();
		return undefined;
	} catch (e) {
		return `${path} could not be loaded as a workspace (${messageOf(e)}). Check the element it names against the schema. ${NEXT}`;
	}
}

/**
 * Loads the payloads of one set. A payload that cannot be a workspace (not an
 * object, an element of the wrong shape, a path the set cannot hold) is left
 * out and reported against its own path; the rest still form the set, so one
 * broken file does not take the project's others with it. A ref that names a
 * file left out is an `unresolved-ref` of the file that wrote it.
 *
 * `notices` are what the host knows about how complete the set is.
 */
export function loadSet(
	payloads: WorkspacePayload[],
	notices: string[] = [],
): LoadedSet {
	const entries: Array<[SetPath, WorkspaceSchema, WorkspacePayload]> = [];
	const excluded: ExcludedFile[] = [];
	for (const payload of payloads) {
		const path = payload.path ?? payload.fileLabel;
		const message = trial(path, payload);
		if (message) excluded.push({ path, fileLabel: payload.fileLabel, message });
		else entries.push([path, payload.schema as WorkspaceSchema, payload]);
	}
	const set = WorkspaceSet.fromSchemas(entries.map(([p, s]) => [p, s]));
	for (const rejected of set.rejected) {
		const payload = payloads.find(
			(p) => (p.path ?? p.fileLabel) === rejected.file,
		) as WorkspacePayload;
		excluded.push({
			path: rejected.file,
			fileLabel: payload.fileLabel,
			message: `${rejected.file} cannot be a workspace file of this set: ${rejected.detail}. Rename or move it.`,
		});
	}
	// Hosts that already judged the set hand each file its findings; otherwise
	// the set is judged once here and split by the file each finding is about.
	const judged = entries.every(([, , payload]) => payload.diagnostics);
	const byFile = new Map<string, SetDiagnostic[]>();
	if (!judged)
		for (const finding of set.validate()) {
			const list = byFile.get(finding.file) ?? [];
			list.push(finding);
			byFile.set(finding.file, list);
		}
	const loaded: LoadedSet = {
		set,
		files: [],
		excluded,
		// Each thing the reader is told once, however many files it came up for.
		notices: [...new Set(notices)],
		modelOf: (workspace) =>
			loaded.files.find((f) => f.workspace === workspace)?.model,
	};
	const given = new Set<SetPath>();
	for (const [path, , payload] of entries) {
		// A path given twice is one file of the set (the first) and one refusal.
		if (given.has(path)) continue;
		given.add(path);
		const workspace = set.byPath(path);
		if (!workspace) continue;
		const diagnostics = payload.diagnostics ?? byFile.get(path) ?? [];
		const model: Model = {
			workspace,
			fileLabel: payload.fileLabel,
			diagnostics,
			loaded,
			...(payload.stale && { stale: payload.stale }),
		};
		loaded.files.push({
			path,
			fileLabel: payload.fileLabel,
			workspace,
			diagnostics,
			...(payload.stale && { stale: payload.stale }),
			model,
		});
	}
	return loaded;
}

/**
 * Groups the payloads a host handed in: each workspace opened alone is its
 * own entry, and the payloads sharing a `set` are one entry, placed where the
 * first of them was.
 */
export function loadPayloads(
	payloads: WorkspacePayload[],
	notices: string[] = [],
): Loaded[] {
	const order: Array<WorkspacePayload | string> = [];
	const members = new Map<string, WorkspacePayload[]>();
	for (const payload of payloads) {
		if (payload.set === undefined) order.push(payload);
		else if (members.has(payload.set)) members.get(payload.set)?.push(payload);
		else {
			members.set(payload.set, [payload]);
			order.push(payload.set);
		}
	}
	return order.map((slot) =>
		typeof slot === "string"
			? {
					kind: "set",
					loaded: loadSet(members.get(slot) as WorkspacePayload[], notices),
				}
			: { kind: "workspace", model: loadWorkspace(slot) },
	);
}
