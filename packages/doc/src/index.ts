import {
	ODSConsumableMap,
	ODSContextMap,
	ODSRelationMap,
	type Workspace,
} from "@open-domain-specification/core";
import {
	consumableMapToDigraph,
	contextMapToDigraph,
	relationMapToDigraph,
} from "@open-domain-specification/graphviz";
import { aggergateMd } from "./aggregate.md";
import { boundedcontextMd } from "./boundedcontext.md";
import { domainMd } from "./domain.md";
import {
	pathToConsumableMapSvg,
	pathToContextMapSvg,
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

	docs[pathToIndexMd(workspace.path)] = workspaceMd(workspace, options);

	docs[pathToContextMapSvg(workspace.path)] = await contextMapToDigraph(
		ODSContextMap.fromWorkspace(workspace),
	).toSVG();

	sidebar.push(`* [${workspace.name}](/${pathToIndexMd(workspace.path)})`);

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

			for (const [_, boundedcontext] of subdomain.boundedcontexts.entries()) {
				docs[pathToIndexMd(boundedcontext.path)] = boundedcontextMd(
					boundedcontext,
					options,
				);

				docs[pathToContextMapSvg(boundedcontext.path)] =
					await contextMapToDigraph(
						ODSContextMap.fromBoundedContext(boundedcontext),
					).toSVG();

				sidebar.push(
					`\t\t\t* [${boundedcontext.name}](/${pathToIndexMd(boundedcontext.path)})`,
				);

				for (const [_, service] of boundedcontext.services.entries()) {
					docs[pathToIndexMd(service.path)] = serviceMd(service, options);
					sidebar.push(
						`\t\t\t\t* [${service.name}](/${pathToIndexMd(service.path)})`,
					);

					docs[pathToConsumableMapSvg(service.path)] =
						await consumableMapToDigraph(
							ODSConsumableMap.fromService(service),
						).toSVG();
				}

				for (const [_, aggregate] of boundedcontext.aggregates.entries()) {
					docs[pathToIndexMd(aggregate.path)] = aggergateMd(aggregate, options);
					sidebar.push(
						`\t\t\t\t* [${aggregate.name}](/${pathToIndexMd(aggregate.path)})`,
					);

					docs[pathToRelationMapSvg(aggregate.path)] =
						await relationMapToDigraph(
							ODSRelationMap.fromAggregate(aggregate),
						).toSVG();

					docs[pathToConsumableMapSvg(aggregate.path)] =
						await consumableMapToDigraph(
							ODSConsumableMap.fromAggregate(aggregate),
						).toSVG();
				}
			}
		}
	}

	docs[`_sidebar.md`] = sidebar.join("\n");

	return docs;
}
