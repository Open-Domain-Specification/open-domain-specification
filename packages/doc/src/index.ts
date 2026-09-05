import {
	type BoundedContext,
	ODSConsumableMap,
	ODSContextMap,
	ODSFlowMap,
	ODSRelationMap,
	type Workspace,
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
} from "./lib/paths";
import type { Options } from "./options";
import { serviceMd } from "./service.md";
import { subdomainMd } from "./subdomain.md";
import { workspaceMd } from "./workspace.md";

export async function toDoc(
	workspace: Workspace,
	options?: Options,
): Promise<Record<string, string>> {
	const docs: Record<string, string> = {};
	const sidebar: string[] = [];

	docs["index.html"] = indexHtml(workspace);

	docs[pathToIndexMd(workspace.path)] = workspaceMd(workspace, options);

	docs[pathToContextMapSvg(workspace.path)] = await contextMapToDigraph(
		ODSContextMap.fromWorkspace(workspace),
	).toSVG();

	sidebar.push(`* [${workspace.name}](/${pathToIndexMd(workspace.path)})`);

	docs[pathToGlossaryMd(workspace.path)] = glossaryMd(workspace, options);
	sidebar.push(`\t* [Glossary](/${pathToGlossaryMd(workspace.path)})`);

	const contextSidebarEntry = (bc: BoundedContext, depth: number) =>
		`${"\t".repeat(depth)}* [${bc.name}](/${pathToIndexMd(bc.path)})`;

	for (const [_, domain] of workspace.domains.entries()) {
		docs[pathToIndexMd(domain.path)] = domainMd(domain);

		docs[pathToContextMapSvg(domain.path)] = await contextMapToDigraph(
			ODSContextMap.fromDomain(domain),
		).toSVG();

		sidebar.push(`\t* [${domain.name}](/${pathToIndexMd(domain.path)})`);

		for (const [_, subdomain] of domain.subdomains.entries()) {
			docs[pathToIndexMd(subdomain.path)] = subdomainMd(subdomain, options);

			docs[pathToContextMapSvg(subdomain.path)] = await contextMapToDigraph(
				ODSContextMap.fromSubdomain(subdomain),
			).toSVG();

			sidebar.push(
				`\t\t* [${subdomain.name}](/${pathToIndexMd(subdomain.path)})`,
			);

			// A context serving several subdomains is listed under each of them.
			for (const [_, boundedcontext] of subdomain.boundedcontexts.entries()) {
				sidebar.push(contextSidebarEntry(boundedcontext, 3));
			}
		}
	}

	for (const [_, boundedcontext] of workspace.boundedcontexts.entries()) {
		if (boundedcontext.subdomains.size === 0) {
			sidebar.push(contextSidebarEntry(boundedcontext, 1));
		}

		docs[pathToIndexMd(boundedcontext.path)] = boundedcontextMd(
			boundedcontext,
			options,
		);

		docs[pathToContextMapSvg(boundedcontext.path)] = await contextMapToDigraph(
			ODSContextMap.fromBoundedContext(boundedcontext),
		).toSVG();

		if (boundedcontext.policies.size + boundedcontext.processes.size > 0) {
			docs[pathToFlowMapSvg(boundedcontext.path)] = await flowMapToDigraph(
				ODSFlowMap.fromBoundedContext(boundedcontext),
			).toSVG();
		}

		for (const [_, service] of boundedcontext.services.entries()) {
			docs[pathToIndexMd(service.path)] = serviceMd(service, options);

			docs[pathToConsumableMapSvg(service.path)] = await consumableMapToDigraph(
				ODSConsumableMap.fromService(service),
			).toSVG();
		}

		for (const [_, aggregate] of boundedcontext.aggregates.entries()) {
			docs[pathToIndexMd(aggregate.path)] = aggergateMd(aggregate, options);

			docs[pathToRelationMapSvg(aggregate.path)] = await relationMapToDigraph(
				ODSRelationMap.fromAggregate(aggregate),
			).toSVG();

			docs[pathToConsumableMapSvg(aggregate.path)] =
				await consumableMapToDigraph(
					ODSConsumableMap.fromAggregate(aggregate),
				).toSVG();
		}
	}

	docs[`_sidebar.md`] = sidebar.join("\n");

	return docs;
}
