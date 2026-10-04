import * as path from "node:path";
import type {
	Diagnostic,
	SetPath,
	Workspace,
} from "@open-domain-specification/core";
import {
	fileOfRoute,
	routeInFiles,
	type WorkspacePayload,
} from "@open-domain-specification/pages";
import type { SiteSource } from "@open-domain-specification/pages/site";

/**
 * What the extension hands the shared pages app, and how it reads back what
 * the app says. vscode-free, so a test can drive it with plain values.
 *
 * The app is given the whole folder: every file of the `.ods` folder that has
 * a workspace to show, each at its own path, so a `$ref` that names another
 * file reaches that file there exactly as it does in the folder. A file that
 * does not load now is given as its last good load and labelled so.
 */

/** One file of the folder as the project knows it. */
export type ReaderFile = {
	/** The set path: relative to the `.ods` folder, forward slashes, raw. */
	relativePath: SetPath;
	/** What the project shows for the file: the fresh member of the folder's set, or the last good load. */
	workspace?: Workspace;
	/** True when `workspace` is the last good load and the current text does not load. */
	stale?: boolean;
	/** Why the file does not load, when it does not. */
	error?: string;
	/** What the folder's set found wrong with this file. */
	diagnostics: Diagnostic[];
};

/** The files that can be shown, as the payloads of one set. */
export function readerPayloads(
	set: string,
	files: ReaderFile[],
): WorkspacePayload[] {
	return files.flatMap((f) =>
		f.workspace
			? [
					{
						schema: f.workspace.toSchema(),
						fileLabel: f.relativePath,
						path: f.relativePath,
						set,
						diagnostics: f.diagnostics,
						...(f.stale && {
							stale: `${staleReason(f.error)} Fix the file to see its current state.`,
						}),
					},
				]
			: [],
	);
}

/** What a stale file says about itself, in one place so the panel and the export say the same thing. */
const staleReason = (error?: string) =>
	`Its current text does not load${error ? `: ${error}` : "."}`;

/**
 * The files of a folder as the sources of a static site: each one a file of
 * the folder's set, at its own path, so a ref between files reaches the file
 * it names in the site as it does in the folder. A file that does not load is
 * exported as its last good load, labelled, and one with nothing to show is
 * left out.
 */
export function exportSources(set: string, files: ReaderFile[]): SiteSource[] {
	return files.flatMap((f) =>
		f.workspace
			? [
					{
						workspace: f.workspace,
						fileLabel: f.relativePath,
						path: f.relativePath,
						set,
						diagnostics: f.diagnostics,
						...(f.stale && { stale: staleReason(f.error) }),
					},
				]
			: [],
	);
}

/** The route of an element of `file` as the app writes it, given the files it was handed. */
export function routeOfLocation(
	members: readonly SetPath[],
	file: SetPath,
	ref: string,
): string {
	return routeInFiles(members.length, file, ref);
}

/**
 * The file and local ref a route of the app names, given the files it was
 * handed. A reader of one file has only local routes; in a larger one a route
 * that names no file, or one the folder does not have, names no location.
 */
export function locationOfRoute(
	members: readonly SetPath[],
	route: string,
): { file: SetPath; ref: string } | undefined {
	if (members.length === 1) return { file: members[0], ref: route };
	const named = fileOfRoute(route);
	return named && members.includes(named.file) ? named : undefined;
}

/**
 * Whether `file` is the selected `folder` or lies under it, on a path-segment
 * boundary: `/p/app2/x` is not in `/p/app`.
 */
export function isInFolder(folder: string, file: string): boolean {
	const relative = path.relative(folder, file);
	return (
		relative !== ".." &&
		!relative.startsWith(`..${path.sep}`) &&
		!path.isAbsolute(relative)
	);
}
