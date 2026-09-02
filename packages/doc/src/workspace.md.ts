import {
	type Domain,
	ODSConsumptionGraph,
	ODSContextMap,
	type Workspace,
} from "@open-domain-specification/core";
import { breadcrumbsMd } from "./breadcrumbs.md";
import { contextRelationshipsMd } from "./context-relationships.md";
import { markdownTable } from "./lib/markdown-table";
import {
	pathToContextMapSvg,
	pathToGlossaryMd,
	pathToIndexMd,
} from "./lib/paths";
import type { Options } from "./options";
import { teamLinkMd } from "./team.md";

const domainSection = (domain: Domain) => `

### [${domain.name}](${pathToIndexMd(domain.path, domain.workspace.path)})
${domain.description}

`;

const diagnosticsSection = (workspace: Workspace) => {
	const diagnostics = workspace.validate();
	return diagnostics.length > 0
		? markdownTable(
				["Severity", "Rule", "Message", "Element"],
				diagnostics.map((d) => [
					d.severity,
					d.rule,
					d.message,
					`\`${d.ref.replace(/^#\//, "")}\``,
				]),
			)
		: "> No diagnostics.";
};

export const workspaceMd = (workspace: Workspace, options?: Options) => `
${options?.breadcrumbs ? breadcrumbsMd(workspace) : ""}
# ${workspace.name}
${workspace.description}

![contextmap](${pathToContextMapSvg(workspace.path, workspace.path)})

[Glossary](${pathToGlossaryMd(workspace.path, workspace.path)})

## Domains
${
	workspace.domains.size > 0
		? Array.from(workspace.domains.entries())
				.map(([_name, domain]) => domainSection(domain))
				.join("")
		: "> No domains."
}

## Diagnostics
${diagnosticsSection(workspace)}

## Teams
${
	workspace.teams.size > 0
		? markdownTable(
				["Team", "Owns"],
				Array.from(workspace.teams.values()).map((team) => [
					teamLinkMd(team),
					team.boundedcontexts.map((bc) => bc.name).join(", ") || "-",
				]),
			)
		: "> No teams."
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
