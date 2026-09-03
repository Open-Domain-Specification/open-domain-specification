import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { Diagnostic, Workspace } from "@open-domain-specification/core";
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

export type SiteResult = { workspaces: number; indexPath: string };

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
	const { outDir, sources, appDir } = input;
	await fs.mkdir(outDir, { recursive: true });
	await fs.cp(path.join(appDir, "assets"), path.join(outDir, "assets"), {
		recursive: true,
	});
	await fs.copyFile(
		path.join(appDir, "favicon.svg"),
		path.join(outDir, "favicon.svg"),
	);
	const indexPath = path.join(outDir, "index.html");
	await fs.writeFile(
		indexPath,
		await bootstrapHtml(appDir, {
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
