import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { Diagnostic, Workspace } from "@open-domain-specification/core";
import {
	diagramModal,
	esc,
	ICONS,
	icon,
	resolveRefLinks,
	tocList,
} from "./html";
import { type RenderedPage, renderPage, resolvePage } from "./render";

/**
 * Static site export. Runs the same page renderer as the VS Code detail panel
 * and writes one HTML file per element, with a navigation sidebar in place of
 * the extension's tree view. No host APIs: it only needs the workspaces, a
 * Graphviz function; the page assets ship with this package.
 */

/** Folder holding page.css, page.js, site.css and codicons/, shipped with the package. */
const ASSETS_DIR = path.resolve(__dirname, "../assets");

export type SiteSource = {
	workspace: Workspace;
	/** Path relative to the .ods folder, e.g. `petstore.json`; names the output folder. */
	fileLabel: string;
	diagnostics: Diagnostic[];
};

export type SiteInput = {
	sources: SiteSource[];
	outDir: string;
	svg: (dot: string) => Promise<string>;
};

/** Every ref that owns a page: workspace, teams, domains, subdomains, contexts and everything inside them. */
export function pageRefs(ws: Workspace): string[] {
	const refs = ["#"];
	for (const t of ws.teams.values()) refs.push(t.ref);
	for (const d of ws.domains.values()) {
		refs.push(d.ref);
		for (const s of d.subdomains.values()) refs.push(s.ref);
	}
	for (const bc of ws.boundedcontexts.values()) {
		refs.push(bc.ref);
		for (const a of bc.aggregates.values()) {
			refs.push(a.ref);
			for (const m of [
				...a.entities.values(),
				...a.valueobjects.values(),
				...a.invariants.values(),
				...a.consumables.values(),
			])
				refs.push(m.ref);
		}
		for (const s of bc.services.values()) {
			refs.push(s.ref);
			for (const c of s.consumables.values()) refs.push(c.ref);
		}
		for (const p of bc.policies.values()) refs.push(p.ref);
		for (const s of bc.schemas.values()) refs.push(s.ref);
		for (const t of bc.glossary.values()) refs.push(t.ref);
	}
	return refs;
}

/** Output folder for a workspace file: `petstore.json` becomes `petstore/`. */
const siteFolder = (fileLabel: string) =>
	fileLabel
		.replace(/\.json$/i, "")
		.split(/[\\/]/)
		.join("/");

/** Site-relative file path of a page: `#` is `index.html`, `#/domains/sales` is `domains/sales.html`. */
export function pagePath(fileLabel: string, pageRef: string): string {
	const folder = siteFolder(fileLabel);
	if (pageRef === "#") return `${folder}/index.html`;
	return `${folder}/${pageRef.replace(/^#\//, "")}.html`;
}

/** The same path with each segment URL-encoded, for use in hrefs. */
const encodePath = (p: string) =>
	p.split("/").map(encodeURIComponent).join("/");

/** Relative href from one site path to another, forward slashes, for `file://` and any static host. */
function relative(from: string, to: string): string {
	const rel = path.posix.relative(
		path.posix.dirname(encodePath(from)),
		encodePath(to),
	);
	return rel.startsWith(".") ? rel : `./${rel}`;
}

/**
 * Href for a ref from the page at `from`. A leaf ref points at its owner's page
 * with the ref as the fragment, which page.js scrolls to the same way the
 * panel does with `data-anchor`.
 */
function hrefFor(
	ws: Workspace,
	fileLabel: string,
	from: string,
	ref: string,
): string {
	const { pageRef } = resolvePage(ws, ref);
	const hash = ref !== pageRef ? encodeURI(`#${ref}`) : "";
	return `${relative(from, pagePath(fileLabel, pageRef))}${hash}`;
}

type NavItem = {
	ref: string;
	label: string;
	icon: string;
	children?: NavItem[];
};

function navTree(ws: Workspace): NavItem[] {
	const items: NavItem[] = [];
	const domains: NavItem[] = [...ws.domains.values()].map((d) => ({
		ref: d.ref,
		label: d.name,
		icon: ICONS.domain,
		children: [...d.subdomains.values()].map((s) => ({
			ref: s.ref,
			label: s.name,
			icon: ICONS.subdomain,
		})),
	}));
	if (domains.length) items.push(...domains);
	const contexts: NavItem[] = [...ws.boundedcontexts.values()].map((bc) => ({
		ref: bc.ref,
		label: bc.name,
		icon: ICONS.boundedcontext,
		children: [
			...[...bc.aggregates.values()].map((a) => ({
				ref: a.ref,
				label: a.name,
				icon: ICONS.aggregate,
			})),
			...[...bc.services.values()].map((s) => ({
				ref: s.ref,
				label: s.name,
				icon: ICONS.service,
			})),
		],
	}));
	items.push(...contexts);
	const teams: NavItem[] = [...ws.teams.values()].map((t) => ({
		ref: t.ref,
		label: t.name,
		icon: ICONS.team,
	}));
	items.push(...teams);
	return items;
}

function navHtml(
	items: NavItem[],
	fileLabel: string,
	from: string,
	current: string,
): string {
	if (!items.length) return "";
	return `<ul>${items
		.map((i) => {
			const href = relative(from, pagePath(fileLabel, i.ref));
			const active = current === i.ref || current.startsWith(`${i.ref}/`);
			return `<li><a href="${esc(href)}"${active ? ' class="active"' : ""}>${icon(i.icon)} ${esc(i.label)}</a>${i.children ? navHtml(i.children, fileLabel, from, current) : ""}</li>`;
		})
		.join("")}</ul>`;
}

function shell(
	page: RenderedPage,
	nav: string,
	from: string,
	siteTitle: string,
): string {
	const media = (p: string) => esc(relative(from, `assets/${p}`));
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${media("codicons/codicon.css")}">
<link rel="stylesheet" href="${media("site.css")}">
<link rel="stylesheet" href="${media("page.css")}">
<title>${esc(page.title)} · ${esc(siteTitle)}</title>
</head>
<body data-anchor="">
<div class="site">
<nav class="site-nav">
	<p class="toc-title">${esc(siteTitle)}</p>
	${nav}
</nav>
<div class="site-page">
<div class="layout">
	<main>${page.body}</main>
	${tocList(page.sections)}
</div>
</div>
</div>
${diagramModal()}
<script src="${media("page.js")}"></script>
</body>
</html>`;
}

/** Root index: one link per workspace file, so a multi-file .ods folder has a landing page. */
function rootIndex(sources: SiteSource[]): string {
	const items = sources
		.map(
			(s) =>
				`<li><a class="ref" href="${esc(encodePath(pagePath(s.fileLabel, "#")))}">${icon(ICONS.workspace)} ${esc(s.workspace.name)}</a> <span class="dim">${esc(s.fileLabel)}</span></li>`,
		)
		.join("");
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="stylesheet" href="assets/codicons/codicon.css">
<link rel="stylesheet" href="assets/site.css">
<link rel="stylesheet" href="assets/page.css">
<title>Domain Model</title>
</head>
<body>
<div class="layout"><main><h1>Domain Model</h1><ul class="site-index">${items}</ul></main></div>
</body>
</html>`;
}

export type SiteResult = { pages: number; indexPath: string };

export async function exportSite(input: SiteInput): Promise<SiteResult> {
	const { outDir } = input;
	await fs.mkdir(outDir, { recursive: true });

	const assets = path.join(outDir, "assets");
	await fs.mkdir(path.join(assets, "codicons"), { recursive: true });
	for (const f of ["page.css", "page.js", "site.css"])
		await fs.copyFile(path.join(ASSETS_DIR, f), path.join(assets, f));
	for (const f of ["codicon.css", "codicon.ttf"])
		await fs.copyFile(
			path.join(ASSETS_DIR, "codicons", f),
			path.join(assets, "codicons", f),
		);

	let pages = 0;
	for (const source of input.sources) {
		const { workspace, fileLabel, diagnostics } = source;
		const nav = navTree(workspace);
		for (const ref of pageRefs(workspace)) {
			const { pageRef } = resolvePage(workspace, ref);
			if (pageRef !== ref) continue; // leaf refs share their owner's page
			const page = await renderPage({
				workspace,
				ref,
				fileLabel,
				diagnostics,
				svg: input.svg,
			});
			const rel = pagePath(fileLabel, ref);
			const html = shell(
				{
					...page,
					body: resolveRefLinks(page.body, (ref) =>
						hrefFor(workspace, fileLabel, rel, ref),
					),
				},
				navHtml(nav, fileLabel, rel, ref),
				rel,
				workspace.name,
			);
			const file = path.join(outDir, ...rel.split("/"));
			await fs.mkdir(path.dirname(file), { recursive: true });
			await fs.writeFile(file, html, "utf8");
			pages++;
		}
	}

	const single = input.sources.length === 1;
	const indexPath = path.join(outDir, "index.html");
	await fs.writeFile(
		indexPath,
		single
			? `<!DOCTYPE html><meta http-equiv="refresh" content="0; url=${esc(encodePath(pagePath(input.sources[0].fileLabel, "#")))}">`
			: rootIndex(input.sources),
		"utf8",
	);
	return { pages, indexPath };
}
