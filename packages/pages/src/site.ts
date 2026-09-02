import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { Diagnostic, Workspace } from "@open-domain-specification/core";

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
};

export type SiteInput = { sources: SiteSource[]; outDir: string };

export type SiteResult = { workspaces: number; indexPath: string };

/** The Vite build output shipped with the package. */
const APP_DIR = path.resolve(__dirname, "../app");

/** What the app reads from `window.__ODS__` when a host hands it workspaces up front. */
export type SiteBootstrap = {
	workspaces: {
		schema: unknown;
		fileLabel: string;
		diagnostics: Diagnostic[];
	}[];
};

/** The built `index.html` with the bootstrap inlined before the app script. */
export async function bootstrapHtml(bootstrap: SiteBootstrap): Promise<string> {
	const html = await fs.readFile(path.join(APP_DIR, "index.html"), "utf8");
	const json = JSON.stringify(bootstrap).replace(/</g, "\\u003c");
	return html.replace(
		"<script",
		`<script>window.__ODS__=${json};</script>\n\t<script`,
	);
}

export async function exportSite(input: SiteInput): Promise<SiteResult> {
	const { outDir, sources } = input;
	await fs.mkdir(outDir, { recursive: true });
	await fs.cp(path.join(APP_DIR, "assets"), path.join(outDir, "assets"), {
		recursive: true,
	});
	const indexPath = path.join(outDir, "index.html");
	await fs.writeFile(
		indexPath,
		await bootstrapHtml({
			workspaces: sources.map((s) => ({
				schema: s.workspace.toSchema(),
				fileLabel: s.fileLabel,
				diagnostics: s.diagnostics,
			})),
		}),
		"utf8",
	);
	return { workspaces: sources.length, indexPath };
}
