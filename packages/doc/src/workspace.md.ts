import {
	type Domain,
	ODSConsumptionGraph,
	ODSContextMap,
	type Workspace,
} from "@open-domain-specification/core";
import { breadcrumbsMd } from "./breadcrumbs.md";
import { contextRelationshipsMd } from "./context-relationships.md";
import { markdownTable } from "./lib/markdown-table";
import { pathToContextMapSvg, pathToIndexMd } from "./lib/paths";
import type { Options } from "./options";

const domainSection = (domain: Domain) => `

### [${domain.name}](${pathToIndexMd(domain.path, domain.workspace.path)})
${domain.description}

`;

export const workspaceMd = (workspace: Workspace, options?: Options) => `
${options?.breadcrumbs ? breadcrumbsMd(workspace) : ""}
# ${workspace.name}
${workspace.description}

![contextmap](${pathToContextMapSvg(workspace.path, workspace.path)})

## Domains
${
	workspace.domains.size > 0
		? Array.from(workspace.domains.entries())
				.map(([_name, domain]) => domainSection(domain))
				.join("")
		: "> No domains."
}

## Context Relationships
${contextRelationshipsMd(ODSContextMap.fromWorkspace(workspace))}

## Consumptions
${markdownTable(
	["Consumer", "Consumed As", "Provider", "Consumable", "Provided As"],
	ODSConsumptionGraph.fromWorkspace(workspace).consumptions.map((it) => [
		`[${it.consumer.name}](${pathToIndexMd(it.consumer.path, workspace.path)})`,
		it.pattern ?? "-",
		it.consumable.provider.name,
		it.consumable.name,
		it.consumable.pattern ?? "-",
	]),
)}	

`;
