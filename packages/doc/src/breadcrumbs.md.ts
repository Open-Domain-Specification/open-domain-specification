import type {
	BoundedContext,
	Domain,
	Subdomain,
	Workspace,
} from "@open-domain-specification/core";
import { pathToIndexMd } from "./lib/paths";

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

	const currentPath =
		boundedcontext?.path || subdomain?.path || domain?.path || workspace.path;

	breadcrumbs.push(
		`[${workspace.name}](${pathToIndexMd(workspace.path, currentPath)})`,
	);

	if (domain) {
		breadcrumbs.push(
			`[${domain.name}](${pathToIndexMd(domain.path, currentPath)})`,
		);
	}

	if (subdomain) {
		breadcrumbs.push(
			`[${subdomain.name}](${pathToIndexMd(subdomain.path, currentPath)})`,
		);
	}

	if (boundedcontext) {
		breadcrumbs.push(
			`[${boundedcontext.name}](${pathToIndexMd(boundedcontext.path, currentPath)})`,
		);
	}

	return `${breadcrumbs.join(" / ")}\n\n`;
};
