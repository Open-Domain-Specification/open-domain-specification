import type {
	BoundedContext,
	Domain,
	Subdomain,
	Workspace,
} from "@open-domain-specification/core";
import { pathToIndexMd, placed } from "./lib/paths";

/** Breadcrumbs for a context, shown under its primary subdomain. */
export const contextBreadcrumbsMd = (boundedcontext: BoundedContext) =>
	breadcrumbsMd(
		boundedcontext.workspace,
		boundedcontext.primarySubdomain?.domain,
		boundedcontext.primarySubdomain,
		boundedcontext,
	);

export const breadcrumbsMd = (
	workspace: Workspace,
	domain?: Domain,
	subdomain?: Subdomain,
	boundedcontext?: BoundedContext,
) => {
	const breadcrumbs = [];

	const current = boundedcontext ?? subdomain ?? domain ?? workspace;
	const currentPath = placed(current);

	breadcrumbs.push(
		`[${workspace.name}](${pathToIndexMd(placed(workspace), currentPath)})`,
	);

	if (domain) {
		breadcrumbs.push(
			`[${domain.name}](${pathToIndexMd(placed(domain), currentPath)})`,
		);
	}

	if (subdomain) {
		breadcrumbs.push(
			`[${subdomain.name}](${pathToIndexMd(placed(subdomain), currentPath)})`,
		);
	}

	if (boundedcontext) {
		breadcrumbs.push(
			`[${boundedcontext.name}](${pathToIndexMd(placed(boundedcontext), currentPath)})`,
		);
	}

	return `${breadcrumbs.join(" / ")}\n\n`;
};
