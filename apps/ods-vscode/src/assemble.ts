import {
	type SetDiagnostic,
	type SetPath,
	type Workspace,
	type WorkspaceSchema,
	WorkspaceSet,
} from "@open-domain-specification/core";
import { type ParseError, parse as parseJsonc } from "jsonc-parser";

/**
 * Builds one {@link WorkspaceSet} from the text of every file of a project.
 * Vscode-free, so the same assembly serves the Problems panel, the display
 * model and the writer, and a test can drive it with plain strings.
 *
 * The caller decides where each text came from (the editor buffer when the
 * file is open, else the disk); nothing here reads a file or remembers a
 * previous load, so a set is always built from exactly the text it was given.
 */

/** One file of the project as the caller read it. `file` is its path relative to the set root, forward slashes. */
export type SourceText = { file: SetPath; text: string };

/** Why a file was left out of the set. */
export type Excluded = {
	/**
	 * `syntax`: not JSON. `shape`: JSON, but not a workspace file. `load`: shaped
	 * like one but core could not load it (a malformed element deep inside).
	 * `path`: the path itself is not a canonical set path.
	 */
	cause: "syntax" | "shape" | "load" | "path";
	/** What is wrong, with the action that fixes it, ready to show next to the file. */
	message: string;
	/** Character offset of the problem in the text, when known. */
	offset?: number;
};

export type AssembledFile = {
	file: SetPath;
	text: string;
	/** The parsed JSON, present exactly when the file is a member of the set. */
	schema?: WorkspaceSchema;
	/** The member workspace, present exactly when the file is in the set. */
	workspace?: Workspace;
	/** Present exactly when the file is not in the set. */
	excluded?: Excluded;
};

export type Assembled = {
	set: WorkspaceSet;
	/** Every source, in the order given. */
	files: ReadonlyMap<SetPath, AssembledFile>;
	/** `set.validate()` grouped by the file each finding is about. */
	diagnostics: ReadonlyMap<string, SetDiagnostic[]>;
	/** Set when a rule threw while validating; the diagnostics are then empty and this says why. */
	validationError?: string;
};

/** The message of whatever was thrown. */
export const messageOf = (e: unknown): string =>
	e instanceof Error ? e.message : String(e);

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * What core's loader assumes of a workspace file that it would otherwise
 * throw a TypeError on. Returns what is wrong, or undefined. Deliberately the
 * top two levels only: anything deeper that still throws is caught by the
 * trial load in {@link assemble}.
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

function syntaxOffset(text: string, message: string): number | undefined {
	const fromMessage = /position (\d+)/.exec(message);
	if (fromMessage) return Number(fromMessage[1]);
	const errors: ParseError[] = [];
	parseJsonc(text, errors);
	return errors[0]?.offset;
}

type Parsed =
	| { ok: true; schema: WorkspaceSchema }
	| { ok: false; excluded: Excluded };

function parseSource(file: SetPath, text: string): Parsed {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch (e) {
		const message = messageOf(e);
		return {
			ok: false,
			excluded: {
				cause: "syntax",
				message: `${file} is not valid JSON (${message}). Fix the syntax at the marked place, then save.`,
				offset: syntaxOffset(text, message),
			},
		};
	}
	const problem = shapeProblem(value);
	if (problem)
		return {
			ok: false,
			excluded: {
				cause: "shape",
				message: `${file} is not a workspace file: ${problem}. Fix it, or move the file out of the .ods folder.`,
			},
		};
	return { ok: true, schema: value as WorkspaceSchema };
}

/**
 * Loads one file alone to find out whether core can take it at all. A file
 * that throws here would also throw inside the set and take every other file
 * with it, so it is left out and reported against itself.
 */
function trialLoad(
	file: SetPath,
	schema: WorkspaceSchema,
): Excluded | undefined {
	try {
		const alone = WorkspaceSet.fromSchemas([[file, schema]]);
		alone.toSchemas();
		return undefined;
	} catch (e) {
		const message = messageOf(e);
		return {
			cause: "load",
			message: `${file} could not be loaded as a workspace (${message}). Check the element it names against the schema, then save.`,
		};
	}
}

export type SetBuilder = (
	entries: Array<[SetPath, WorkspaceSchema]>,
) => WorkspaceSet;

const defaultBuild: SetBuilder = (entries) => WorkspaceSet.fromSchemas(entries);

/**
 * Assembles the set. Every source is shape-checked and trial-loaded before it
 * reaches {@link WorkspaceSet.fromSchemas}; a source that fails is left out and
 * carries its own `excluded` reason, and the rest still form a set (an
 * unrelated broken file does not stop the others). `files` keeps the input
 * order and so does the set.
 */
export function assemble(
	sources: ReadonlyArray<SourceText>,
	build: SetBuilder = defaultBuild,
): Assembled {
	const files = new Map<SetPath, AssembledFile>();
	const entries: Array<[SetPath, WorkspaceSchema]> = [];
	for (const { file, text } of sources) {
		const parsed = parseSource(file, text);
		if (!parsed.ok) {
			files.set(file, { file, text, excluded: parsed.excluded });
			continue;
		}
		const excluded = trialLoad(file, parsed.schema);
		if (excluded) files.set(file, { file, text, excluded });
		else {
			files.set(file, { file, text, schema: parsed.schema });
			entries.push([file, parsed.schema]);
		}
	}

	let set: WorkspaceSet;
	try {
		set = build(entries);
	} catch (e) {
		// A set that loads file by file but not together: say so on every
		// member rather than throwing out of a reload.
		const message = messageOf(e);
		for (const [file] of entries) {
			const entry = files.get(file) as AssembledFile;
			files.set(file, {
				file,
				text: entry.text,
				excluded: {
					cause: "load",
					message: `${file} could not be loaded together with the other files (${message}). Reload after fixing the files that changed last.`,
				},
			});
		}
		set = WorkspaceSet.fromSchemas([]);
	}

	for (const rejected of set.rejected) {
		const entry = files.get(rejected.file);
		if (entry)
			files.set(rejected.file, {
				file: entry.file,
				text: entry.text,
				excluded: {
					cause: "path",
					message: `${rejected.file} cannot be a workspace file of this set: ${rejected.detail}. Rename or move it.`,
				},
			});
	}
	for (const [file, entry] of files) {
		const workspace = set.byPath(file);
		if (workspace && !entry.excluded) files.set(file, { ...entry, workspace });
	}

	const diagnostics = new Map<string, SetDiagnostic[]>();
	let findings: SetDiagnostic[] = [];
	let validationError: string | undefined;
	try {
		findings = set.validate();
	} catch (e) {
		// A rule that throws is a core defect; it is shown, never swallowed.
		validationError = messageOf(e);
	}
	for (const finding of findings) {
		const list = diagnostics.get(finding.file) ?? [];
		list.push(finding);
		diagnostics.set(finding.file, list);
	}
	return { set, files, diagnostics, validationError };
}
