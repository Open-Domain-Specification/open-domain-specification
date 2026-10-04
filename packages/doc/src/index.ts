import {
	type BoundedContext,
	ODSConsumableMap,
	ODSContextMap,
	ODSFlowMap,
	ODSRelationMap,
	type Workspace,
	type WorkspaceSet,
} from "@open-domain-specification/core";
import {
	consumableMapToDigraph,
	contextMapToDigraph,
	flowMapToDigraph,
	relationMapToDigraph,
} from "@open-domain-specification/graphviz";
import { aggergateMd } from "./aggregate.md";
import { boundedcontextMd } from "./boundedcontext.md";
import { domainMd } from "./domain.md";
import { glossaryMd } from "./glossary.md";
import { indexHtml } from "./index.html";
import {
	pathToConsumableMapSvg,
	pathToContextMapSvg,
	pathToFlowMapSvg,
	pathToGlossaryMd,
	pathToIndexMd,
	pathToRelationMapSvg,
	placed,
} from "./lib/paths";
import type { Options } from "./options";
import { serviceMd } from "./service.md";
import { setIndexMd } from "./set-index.md";
import { subdomainMd } from "./subdomain.md";
import { workspaceMd } from "./workspace.md";

export {
	pathToContextMapSvg,
	pathToGlossaryMd,
	pathToIndexMd,
	placed,
} from "./lib/paths";

/** The files and sidebar lines one workspace contributes to a site. */
type WorkspaceSite = { docs: Record<string, string>; sidebar: string[] };

/**
 * Every page, diagram and sidebar line of one workspace, with the sidebar
 * nested `depth` levels down. The model paths come from {@link placed}, so a
 * workspace that is one of several in a set writes under its own folder and
 * one that is alone writes where it always has.
 */
async function documentWorkspace(
	workspace: Workspace,
	options: Options | undefined,
	depth: number,
): Promise<WorkspaceSite> {
	const docs: Record<string, string> = {};
	const sidebar: string[] = [];
	const indent = (extra: number) => "\t".repeat(depth + extra);
	const here = placed(workspace);

	docs[pathToIndexMd(here)] = workspaceMd(workspace, options);

	docs[pathToContextMapSvg(here)] = await contextMapToDigraph(
		ODSContextMap.fromWorkspace(workspace),
	).toSVG();

	sidebar.push(`${indent(0)}* [${workspace.name}](/${pathToIndexMd(here)})`);

	docs[pathToGlossaryMd(here)] = glossaryMd(workspace, options);
	sidebar.push(`${indent(1)}* [Glossary](/${pathToGlossaryMd(here)})`);

	const contextSidebarEntry = (bc: BoundedContext, extra: number) =>
		`${indent(extra)}* [${bc.name}](/${pathToIndexMd(placed(bc))})`;

	for (const [_, domain] of workspace.domains.entries()) {
		docs[pathToIndexMd(placed(domain))] = domainMd(domain);

		docs[pathToContextMapSvg(placed(domain))] = await contextMapToDigraph(
			ODSContextMap.fromDomain(domain),
		).toSVG();

		sidebar.push(
			`${indent(1)}* [${domain.name}](/${pathToIndexMd(placed(domain))})`,
		);

		for (const [_, subdomain] of domain.subdomains.entries()) {
			docs[pathToIndexMd(placed(subdomain))] = subdomainMd(subdomain, options);

			docs[pathToContextMapSvg(placed(subdomain))] = await contextMapToDigraph(
				ODSContextMap.fromSubdomain(subdomain),
			).toSVG();

			sidebar.push(
				`${indent(2)}* [${subdomain.name}](/${pathToIndexMd(placed(subdomain))})`,
			);

			// A context serving several subdomains is listed under each of them.
			for (const [_, boundedcontext] of subdomain.boundedcontexts.entries()) {
				sidebar.push(contextSidebarEntry(boundedcontext, 3));
			}
		}
	}

	for (const [_, boundedcontext] of workspace.boundedcontexts.entries()) {
		const at = placed(boundedcontext);
		if (boundedcontext.subdomains.size === 0) {
			sidebar.push(contextSidebarEntry(boundedcontext, 1));
		}

		docs[pathToIndexMd(at)] = boundedcontextMd(boundedcontext, options);

		docs[pathToContextMapSvg(at)] = await contextMapToDigraph(
			ODSContextMap.fromBoundedContext(boundedcontext),
		).toSVG();

		if (boundedcontext.policies.size + boundedcontext.processes.size > 0) {
			docs[pathToFlowMapSvg(at)] = await flowMapToDigraph(
				ODSFlowMap.fromBoundedContext(boundedcontext),
			).toSVG();
		}

		for (const [_, service] of boundedcontext.services.entries()) {
			docs[pathToIndexMd(placed(service))] = serviceMd(service, options);

			docs[pathToConsumableMapSvg(placed(service))] =
				await consumableMapToDigraph(
					ODSConsumableMap.fromService(service),
				).toSVG();
		}

		for (const [_, aggregate] of boundedcontext.aggregates.entries()) {
			const aggregateAt = placed(aggregate);
			docs[pathToIndexMd(aggregateAt)] = aggergateMd(aggregate, options);

			docs[pathToRelationMapSvg(aggregateAt)] = await relationMapToDigraph(
				ODSRelationMap.fromAggregate(aggregate),
			).toSVG();

			docs[pathToConsumableMapSvg(aggregateAt)] = await consumableMapToDigraph(
				ODSConsumableMap.fromAggregate(aggregate),
			).toSVG();
		}
	}

	return { docs, sidebar };
}

/**
 * The docsify site of one workspace read alone. A workspace that belongs to a
 * set of several is not alone: its pages link to elements of the other files,
 * and those pages are written by {@link toDocSet}, so asking for it alone
 * would write links that resolve to nothing. That is refused rather than
 * written.
 */
export async function toDoc(
	workspace: Workspace,
	options?: Options,
): Promise<Record<string, string>> {
	const set = workspace.set;
	if (set && set.workspaces.length > 1)
		throw new Error(
			`Workspace ${workspace.id} is the file ${JSON.stringify(workspace.file)} of a set of ${set.workspaces.length} workspaces; document the set with toDocSet`,
		);
	const { docs, sidebar } = await documentWorkspace(workspace, options, 0);
	return {
		"index.html": indexHtml(workspace.name, pathToIndexMd(placed(workspace))),
		...docs,
		"_sidebar.md": sidebar.join("\n"),
	};
}

/**
 * The docsify site of a whole set: every workspace the folder holds, each in a
 * folder of its own named after its file, and a first page that lists them.
 *
 * Which file a page belongs to is part of its path, because local ids repeat
 * across files and a page named only by its element would be two pages. A file
 * `team/ü.json` is written under `team/_ods_00fc.json/`; the path projection
 * is the one every other page uses, and it cannot collide with a page the
 * model writes (see `setFolder`). A link between files is a relative path
 * between those folders, and a reader of a page in one file can follow a
 * consumption, a context map node or a value object into the file that holds it.
 *
 * Workspaces are written in the order the set holds them, which hosts give in
 * code point order of file path; the order of the lists on the first page and
 * in the sidebar follows it. Nothing here is read from a manifest.
 *
 * A set of one workspace is that workspace alone: the same files `toDoc` writes.
 * Files the set left out (`file-path-invalid`) have no folder and are listed
 * under the first page's diagnostics.
 */
export async function toDocSet(
	set: WorkspaceSet,
	options?: Options,
): Promise<Record<string, string>> {
	if (set.workspaces.length === 1) return toDoc(set.workspaces[0], options);

	const docs: Record<string, string> = {};
	const sidebar: string[] = ["* [Workspaces](/index.md)"];
	for (const workspace of set.workspaces) {
		const site = await documentWorkspace(workspace, options, 1);
		Object.assign(docs, site.docs);
		sidebar.push(...site.sidebar);
	}
	docs["index.md"] = setIndexMd(set);
	docs["contextmap.svg"] = await contextMapToDigraph(
		ODSContextMap.fromSet(set),
	).toSVG();
	docs["_sidebar.md"] = sidebar.join("\n");
	docs["index.html"] = indexHtml("Workspaces", "index.md");
	return docs;
}
