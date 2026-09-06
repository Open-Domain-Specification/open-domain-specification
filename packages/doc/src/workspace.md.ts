import {
	type ContextRelationship,
	type Domain,
	dispositionOf,
	ODSConsumptionGraph,
	ODSContextMap,
	relationshipsWithoutComments,
	relationshipTitle,
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

/**
 * The health report (RFC-002 section 4.5) as markdown: the same three lists
 * the pages surface shows, in the same order and off the same helpers, so a
 * reader on docsify and a reader in the extension see the same model.
 */
const healthSection = (workspace: Workspace) => {
	const withDisposition = (want: string) =>
		workspace.relationships.filter((r) => dispositionOf(r) === want);
	const list = (
		heading: string,
		relationships: ContextRelationship[],
		empty: string,
	) => {
		const entry = (r: ContextRelationship) =>
			[
				`- **${relationshipTitle(r)}** (${r.type})`,
				...r.comments.map(({ text, link }) => {
					const cite = link ? ` [${link.label ?? link.url}](${link.url})` : "";
					return `\t- ${text}${cite}`;
				}),
			].join("\n");
		const body = relationships.length
			? relationships.map(entry).join("\n")
			: `> ${empty}`;
		return `### ${heading}\n${body}\n`;
	};
	return [
		list(
			"Refactor",
			withDisposition("refactor"),
			"Nothing is marked for refactoring.",
		),
		list("Tolerated", withDisposition("tolerated"), "No compromises recorded."),
		list(
			"No comments",
			relationshipsWithoutComments(workspace),
			"Every relationship carries at least one comment.",
		),
	].join("\n");
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

## Health
${healthSection(workspace)}

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
