import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
	idOf,
	type SetPath,
	validateSetPath,
	Workspace,
	type WorkspaceSet,
} from "@open-domain-specification/core";
import { type Assembled, assemble, type SourceText } from "./assemble";
import type { TextIo } from "./writer";

/**
 * Vscode-free safe creation of a workspace file and the fresh editor-first
 * read the forms take their choices from. Both take the text io of the
 * caller (editor first in the extension, plain disk in a test), so the same
 * decisions run under vitest on real folders.
 */

const SCHEMA_FILE = "schema.json";

export type CreateRefusal = {
	ok: false;
	cause: "name" | "exists" | "duplicate-id";
	/** What is wrong and what to do next, ready to show. Names the file. */
	message: string;
};

export type CreateResult =
	| CreateRefusal
	| { ok: true; file: SetPath; id: string; text: string };

/** Test seam: runs after every check and before the write, where a race can happen. */
export type CreateHooks = { afterChecks?: () => Promise<void> };

/**
 * Windows device names, refused on every platform so a model made on one
 * machine opens on all. Windows treats the part of a file name before the
 * first dot as the device, so `con.json` and `con.x.json` are both reserved.
 */
const RESERVED_DEVICE =
	/^(con|prn|aux|nul|com[0-9\u00b9\u00b2\u00b3]|lpt[0-9\u00b9\u00b2\u00b3])$/i;

/** Why `id` cannot be the name of a file directly under the .ods folder, or undefined. */
function unsafeNameProblem(id: string): string | undefined {
	if (!/[\p{L}\p{N}]/u.test(id))
		return "it has no letters or digits to name a file by";
	if (id === "." || id === "..") return "it would name a folder, not a file";
	if (/[/\\]/.test(id)) return "it holds a path separator";
	if (id === "schema") return '"schema" is reserved for the JSON schema file';
	const device = id.split(".")[0].replace(/[ ]+$/, "");
	if (RESERVED_DEVICE.test(device))
		return `"${device}" is a reserved device name on Windows`;
	const checked = validateSetPath(`${id}.json`);
	if (!checked.ok) return checked.detail;
	return undefined;
}

/**
 * The id a member file declares, for a file the set could not take (the set
 * has no workspace for it) but whose JSON still says what it is called.
 */
function declaredId(text: string): string | undefined {
	try {
		const value: unknown = JSON.parse(text);
		if (typeof value !== "object" || value === null) return undefined;
		const { name, id } = value as { name?: unknown; id?: unknown };
		if (typeof id === "string") return id;
		return typeof name === "string" ? idOf(name) : undefined;
	} catch {
		return undefined;
	}
}

async function readSources(
	io: TextIo,
	files: ReadonlyArray<SetPath>,
): Promise<{ sources: SourceText[]; hashes: Map<SetPath, string> }> {
	const sources: SourceText[] = [];
	const hashes = new Map<SetPath, string>();
	for (const file of files) {
		const read = await io.readText(file);
		if (!read.ok) continue; // deleted since the listing
		sources.push({ file, text: read.text });
		hashes.set(file, read.hash);
	}
	return { sources, hashes };
}

export type FreshRead = {
	/** Assembled now from the text of every file, the editor's buffer where one is open. */
	assembled: Assembled;
	set: WorkspaceSet;
	/** The text each file was read as. */
	texts: Map<SetPath, string>;
	/** The set path of each member file, in set order: the identity of the file that owns each workspace. */
	members: SetPath[];
	/** Changes when any file's text changes; only ever compared for equality. */
	stamp: string;
};

/** Reads every listed file now through `io` and assembles them; never a display cache. */
export async function readFreshSet(
	io: TextIo,
	files: ReadonlyArray<SetPath>,
): Promise<FreshRead> {
	const { sources, hashes } = await readSources(io, files);
	const assembled = assemble(sources);
	const stamp = createHash("sha1");
	for (const [file, hash] of hashes) stamp.update(`${file}\0${hash}\0`);
	return {
		assembled,
		set: assembled.set,
		texts: new Map(sources.map(({ file, text }) => [file, text])),
		members: sources
			.map(({ file }) => file)
			.filter((file) => assembled.files.get(file)?.workspace),
		stamp: stamp.digest("hex"),
	};
}

/**
 * Writes `text` to `target` only if nothing is there, atomically and
 * exclusively: the full content goes to a temp file, then `link` gives it
 * the target name, which fails with EEXIST if anything (a file written in
 * the meantime included) holds the name. The target therefore never shows
 * partial content and an existing file is never replaced; a plain rename
 * would replace it. Returns false when the target exists. Where hard links
 * are unsupported the fallback is `open(..., "wx")`, exclusive but not
 * all-or-nothing, and the partial file is removed on a failed write.
 */
async function writeExclusive(target: string, text: string): Promise<boolean> {
	await fs.mkdir(path.dirname(target), { recursive: true });
	const tmp = `${target}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
	await fs.writeFile(tmp, text, { encoding: "utf8", flag: "wx" });
	try {
		await fs.link(tmp, target);
		return true;
	} catch (e) {
		const code = (e as NodeJS.ErrnoException).code;
		if (code === "EEXIST") return false;
		if (code !== "EPERM" && code !== "ENOTSUP" && code !== "ENOSYS") throw e;
	} finally {
		await fs.rm(tmp, { force: true });
	}
	try {
		await fs.writeFile(target, text, { encoding: "utf8", flag: "wx" });
		return true;
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code === "EEXIST") return false;
		await fs.rm(target, { force: true });
		throw e;
	}
}

/**
 * Creates `<id>.json` directly under `root` (the .ods folder) for a new
 * workspace called `name`, or refuses and changes nothing. `files` is the
 * list of the folder's present member files (set paths).
 *
 * Refuses: a name whose file name is unsafe; a target that already exists,
 * loadable or not; a workspace id a present member file already declares.
 * Other members' diagnostics and invalid models never block it.
 */
export async function createWorkspaceFile(
	root: string,
	io: TextIo,
	files: ReadonlyArray<SetPath>,
	name: string,
	description: string,
	hooks: CreateHooks = {},
): Promise<CreateResult> {
	const workspace = new Workspace(name, { description, version: "0.1.0" });
	const id = workspace.id;
	const problem = unsafeNameProblem(id);
	if (problem)
		return {
			ok: false,
			cause: "name",
			message: `"${name}" cannot name a workspace file: ${problem}. Nothing was created. Choose a name of letters, digits and spaces.`,
		};
	const file: SetPath = `${id}.json`;
	const target = path.join(root, file);

	if (await exists(target))
		return {
			ok: false,
			cause: "exists",
			message: `${file} already exists in the .ods folder and was left untouched. Choose a different workspace name, or open ${file} to edit it.`,
		};

	const fresh = await readFreshSet(io, files);
	for (const [member, text] of fresh.texts) {
		const entry = fresh.assembled.files.get(member);
		const memberId = entry?.workspace?.id ?? declaredId(text);
		if (memberId === id)
			return {
				ok: false,
				cause: "duplicate-id",
				message: `${member} already declares the workspace id "${id}", so "${name}" would clash with it. Nothing was created. Choose a different name, or open ${member} to edit it.`,
			};
	}

	await hooks.afterChecks?.();

	const text = `${JSON.stringify({ $schema: `./${SCHEMA_FILE}`, ...workspace.toSchema() }, null, 2)}\n`;
	if (!(await writeExclusive(target, text)))
		return {
			ok: false,
			cause: "exists",
			message: `${file} was created by someone else while this was running and was left untouched. Choose a different workspace name, or open ${file} to edit it.`,
		};
	return { ok: true, file, id, text };
}

async function exists(target: string): Promise<boolean> {
	try {
		await fs.lstat(target);
		return true;
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
		throw e;
	}
}
