import type { SetPath } from "@open-domain-specification/core";
import type { WorkspacePayload } from "../protocol";
import { codePoint } from "./order";

/**
 * Reading workspace files a reader picked from their own computer: several
 * files, or a folder. The pick is complete by construction, so no file is
 * guessed at; each file keeps the path it has under the folder they chose,
 * raw (a space, `#`, `%` or non-ASCII letter stays what it is), and the set
 * encodes it where a ref or a route needs it.
 */

/** What the reader picked, and what could not be taken. */
export type Upload = {
	/** One per workspace file, in code-point order of path. */
	payloads: WorkspacePayload[];
	/** Files that are not workspace files at all (not `.json`, or the folder's own `schema.json`). */
	skipped: string[];
	/** Workspace files that could not be read as JSON, each with what to do about it. */
	problems: string[];
};

/**
 * The path of a picked file under the folder the reader chose: the browser's
 * relative path with the chosen folder's own name taken off, or the file's
 * name when the files were picked one by one.
 */
export function uploadPath(file: File): SetPath {
	const relative = file.webkitRelativePath;
	if (!relative) return file.name;
	const slash = relative.indexOf("/");
	return slash < 0 ? relative : relative.slice(slash + 1);
}

const isWorkspaceFile = (path: SetPath) =>
	path.endsWith(".json") && path.split("/").at(-1) !== "schema.json";

export async function readUpload(files: File[]): Promise<Upload> {
	const named = files
		.map((file) => ({ file, path: uploadPath(file) }))
		.sort((a, b) => codePoint(a.path, b.path));
	const upload: Upload = { payloads: [], skipped: [], problems: [] };
	for (const { file, path } of named) {
		if (!isWorkspaceFile(path)) {
			upload.skipped.push(path);
			continue;
		}
		try {
			const schema: unknown = JSON.parse(await file.text());
			upload.payloads.push({
				schema,
				fileLabel: path,
				path,
				set: "upload",
			});
		} catch {
			upload.problems.push(
				`${path} is not valid JSON, so it was left out. Fix the file, or leave it out of the folder, then choose it again.`,
			);
		}
	}
	return upload;
}
