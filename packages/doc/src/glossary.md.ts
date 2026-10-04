import type {
	BoundedContext,
	GlossaryTerm,
	Workspace,
} from "@open-domain-specification/core";
import { breadcrumbsMd } from "./breadcrumbs.md";
import { markdownTable } from "./lib/markdown-table";
import { pathToIndexMd } from "./lib/paths";
import type { Options } from "./options";

const termRow = (term: GlossaryTerm) => [
	`**${term.name}**`,
	term.definition,
	term.aliases.join(", ") || "-",
	term.embodiedBy?.name ?? "-",
];

/** The glossary of one context as a table, or a note when it has none. */
export const glossaryTableMd = (boundedcontext: BoundedContext) =>
	boundedcontext.glossary.size > 0
		? markdownTable(
				["Term", "Definition", "Aliases", "Embodied by"],
				Array.from(boundedcontext.glossary.values()).map(termRow),
			)
		: "> No glossary terms.";

/** One page listing every context's ubiquitous language. */
export const glossaryMd = (workspace: Workspace, options?: Options) => `
${options?.breadcrumbs ? breadcrumbsMd(workspace) : ""}
# ${workspace.name} Glossary

${
	Array.from(workspace.boundedcontexts.values())
		.filter((bc) => bc.glossary.size > 0)
		.map(
			(bc) => `## [${bc.name}](${pathToIndexMd(bc.path, workspace.path)})

${glossaryTableMd(bc)}
`,
		)
		.join("\n") || "> No glossary terms in any bounded context."
}
`;
