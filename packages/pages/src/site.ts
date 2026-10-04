import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
	type Diagnostic,
	validateSetPath,
	type Workspace,
} from "@open-domain-specification/core";
import { codePoint } from "./lib/order";
import type { Bootstrap } from "./protocol";

/**
 * Static site export: the built app bundle beside the workspaces, inlined into
 * `index.html` so the site runs from a folder, a `file://` URL or any static host.
 * The same bundle serves the viewer and the extension webview.
 */

export type SiteSource = {
	workspace: Workspace;
	/** Path relative to the .ods folder, e.g. `petstore.json`; shown in the page header. */
	fileLabel: string;
	diagnostics: Diagnostic[];
	/**
	 * Names the set this file is one of. Sources that share it are exported as
	 * the files of one set, each at its `path`, so a file-qualified `$ref`
	 * between them keeps reaching the file it names; without it a source is a
	 * workspace opened alone.
	 */
	set?: string;
	/** The raw path of the file under the set's folder, e.g. `nested/a#%.json`; `fileLabel` by default. */
	path?: string;
	/** Present when `workspace` is the last good load of a file that does not load now: what is wrong, shown beside its pages. */
	stale?: string;
};

export type SiteInput = {
	sources: SiteSource[];
	outDir: string;
	/**
	 * The Vite build of the app (this package's `app/` folder, or wherever the
	 * host copied it). Passed explicitly so the entry has no module-level path
	 * resolution, which breaks when a host bundles it.
	 */
	appDir: string;
};

export type SiteResult = {
	workspaces: number;
	indexPath: string;
	/** Where each set file was also written as plain JSON, so the folder can be read by URL as well as opened. */
	files: string[];
};

/** Folder of the plain JSON copies of a set's files, under the site. */
export const WORKSPACES_DIR = "workspaces";

/**
 * The files of a set in the one order every reader gives a folder: by code
 * point of their path, whatever order the host listed them in, so an
 * aggregated listing reads the same in the site, the extension and the
 * viewer. A workspace opened alone keeps its place among them.
 */
function inFolderOrder(
	sources: SiteSource[],
	pathOf: (s: SiteSource) => string,
): SiteSource[] {
	const slots = sources.flatMap((s, i) => (s.set === undefined ? [] : [i]));
	const sorted = slots
		.map((i) => sources[i])
		.sort((a, b) => codePoint(pathOf(a), pathOf(b)));
	const out = [...sources];
	slots.forEach((slot, n) => {
		out[slot] = sorted[n];
	});
	return out;
}

/** The built `index.html` with the bootstrap inlined before the app script. */
export async function bootstrapHtml(
	appDir: string,
	bootstrap: Bootstrap,
): Promise<string> {
	const html = await fs.readFile(path.join(appDir, "index.html"), "utf8");
	const json = JSON.stringify(bootstrap).replace(/</g, "\\u003c");
	return html.replace(
		"<script",
		`<script>window.__ODS__=${json};</script>\n\t<script`,
	);
}

export async function exportSite(input: SiteInput): Promise<SiteResult> {
	const { outDir, appDir } = input;
	const pathOf = (s: SiteSource) => s.path ?? s.fileLabel;
	const describe = (s: SiteSource) =>
		`${JSON.stringify(s.fileLabel)} (set ${JSON.stringify(s.set)})`;
	const sources = inFolderOrder(input.sources, pathOf);
	for (const source of sources) {
		if (source.set === undefined) continue;
		const checked = validateSetPath(pathOf(source));
		if (!checked.ok)
			throw new Error(
				`${JSON.stringify(pathOf(source))} cannot be a file of an exported set: ${checked.cause} (${checked.detail})`,
			);
	}
	// Two files may not share one copy: compared as written, by the exact joined
	// path. Refused here, before anything is written or removed.
	const owners = new Map<string, string>();
	for (const source of sources) {
		if (source.set === undefined) continue;
		const target = path.join(
			outDir,
			WORKSPACES_DIR,
			...pathOf(source).split("/"),
		);
		const other = owners.get(target);
		if (other !== undefined)
			throw new Error(
				`${other} and ${describe(source)} would both be copied to ${WORKSPACES_DIR}/${pathOf(source)}. Give the files different paths, or export them separately.`,
			);
		owners.set(target, describe(source));
	}
	await fs.mkdir(outDir, { recursive: true });
	// The copies are exactly the current set: the generated folder is replaced,
	// and nothing else in outDir is touched.
	await fs.rm(path.join(outDir, WORKSPACES_DIR), {
		recursive: true,
		force: true,
	});
	await fs.cp(path.join(appDir, "assets"), path.join(outDir, "assets"), {
		recursive: true,
	});
	await fs.copyFile(
		path.join(appDir, "favicon.svg"),
		path.join(outDir, "favicon.svg"),
	);
	const schemas = sources.map((s) => s.workspace.toSchema());
	const files: string[] = [];
	for (const [i, source] of sources.entries()) {
		if (source.set === undefined) continue;
		const target = path.join(
			outDir,
			WORKSPACES_DIR,
			...pathOf(source).split("/"),
		);
		await fs.mkdir(path.dirname(target), { recursive: true });
		await fs.writeFile(
			target,
			`${JSON.stringify(schemas[i], null, 2)}\n`,
			"utf8",
		);
		files.push(target);
	}
	const indexPath = path.join(outDir, "index.html");
	await fs.writeFile(
		indexPath,
		await bootstrapHtml(appDir, {
			workspaces: sources.map((s, i) => ({
				schema: schemas[i],
				fileLabel: s.fileLabel,
				diagnostics: s.diagnostics,
				...(s.set !== undefined && { set: s.set, path: pathOf(s) }),
				...(s.stale && { stale: s.stale }),
			})),
		}),
		"utf8",
	);
	return { workspaces: sources.length, indexPath, files };
}
