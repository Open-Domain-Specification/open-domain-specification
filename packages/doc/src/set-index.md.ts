import {
	ODSContextMap,
	type ODSContextMapNode,
	type WorkspaceSet,
} from "@open-domain-specification/core";
import { markdownTable } from "./lib/markdown-table";
import { pathToIndexMd, placed } from "./lib/paths";

/** A cell cannot hold a pipe or a line break without ending its row. */
const cell = (text: string) =>
	text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

/** A context named by the workspace it is in, because two files may both have a "Ledger". */
const contextName = (node: ODSContextMapNode) =>
	`${node.namespace[0]?.name ?? ""} / ${node.name}`;

/**
 * The first page of a set: the files it holds in the order it holds them, one
 * context map across all of them with each file drawn as a cluster, how the
 * contexts relate across the files, and every diagnostic of the set with the
 * file it is about. It is derived from the files and written nowhere else.
 */
export const setIndexMd = (set: WorkspaceSet) => {
	const map = ODSContextMap.fromSet(set);
	const diagnostics = set.validate();
	return `
# Workspaces

${set.workspaces.length} workspaces, one for each file of the set. Each file is a complete workspace with its own folder here; a link follows an element into the file that holds it.

![contextmap](contextmap.svg)

## Files
${markdownTable(
	["File", "Workspace", "Version", "Domains", "Bounded Contexts"],
	set.workspaces.map((workspace) => [
		`\`${workspace.file}\``,
		`[${cell(workspace.name)}](${pathToIndexMd(placed(workspace))})`,
		workspace.version,
		String(workspace.domains.size),
		String(workspace.boundedcontexts.size),
	]),
)}

## Context Relationships
${
	map.edges.size > 0
		? markdownTable(
				["Upstream", "Relationship", "Downstream"],
				Array.from(map.edges.values()).map((edge) => [
					cell(contextName(edge.source)),
					edge.implied
						? `${edge.type} (implied by ${edge.implied})`
						: edge.type,
					cell(contextName(edge.target)),
				]),
			)
		: "> No relationships."
}

## Diagnostics
${
	diagnostics.length > 0
		? markdownTable(
				["Severity", "Rule", "File", "Message", "Element"],
				diagnostics.map((d) => [
					d.severity,
					d.rule,
					`\`${d.file}\``,
					cell(d.message),
					`\`${d.ref.replace(/^#\//, "")}\``,
				]),
			)
		: "> No diagnostics."
}
`;
};
