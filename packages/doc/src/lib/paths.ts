import type { Workspace } from "@open-domain-specification/core";
import { getRelativePath, PLACE, physicalPath, setFolder } from "./path";

/**
 * Where an element's page is written, as the model path `getRelativePath`
 * projects. In a workspace that is alone, or the only one of its set, that is
 * the element's own path. In a set of several workspaces it is the path inside
 * the folder of the file that holds the element, because local ids repeat
 * across files and the element's own path would name two pages.
 */
export function placed(element: { path: string }): string {
	const workspace = workspaceOfPage(element);
	const set = workspace.set;
	if (!set || set.workspaces.length < 2) return element.path;
	return `${setFolder(workspace.file as string)}${PLACE}${element.path}`;
}

/**
 * The workspace of an element that has a page, found through the parent every
 * such element names. Read by what each has rather than by `instanceof`: a
 * generator and the model it documents need not have loaded core through the
 * same entry point (a CommonJS build beside an ES module one), and a class
 * check would then take every element for none and write a set into one folder.
 */
function workspaceOfPage(element: object): Workspace {
	const parent = element as {
		workspace?: Workspace;
		domain?: { workspace: Workspace };
		boundedcontext?: { workspace: Workspace };
	};
	return (
		parent.boundedcontext?.workspace ??
		parent.domain?.workspace ??
		parent.workspace ??
		(element as Workspace)
	);
}

/** The page that lists the workspaces of a set, from the page at `relativeRef`. */
export function pathToSetIndexMd(relativeRef?: string): string {
	const depth =
		relativeRef === undefined ? 0 : physicalPath(relativeRef).split("/").length;
	return `${"../".repeat(depth)}index.md`;
}

export function pathToConsumableMapSvg(
	ref: string,
	relativeRef?: string,
): string {
	return `${getRelativePath(ref, relativeRef)}/consumablemap.svg`;
}

export function pathToContextMapSvg(ref: string, relativeRef?: string): string {
	return `${getRelativePath(ref, relativeRef)}/contextmap.svg`;
}

export function pathToFlowMapSvg(ref: string, relativeRef?: string): string {
	return `${getRelativePath(ref, relativeRef)}/flowmap.svg`;
}

export function pathToRelationMapSvg(
	ref: string,
	relativeRef?: string,
): string {
	return `${getRelativePath(ref, relativeRef)}/relationmap.svg`;
}

export function pathToGlossaryMd(ref: string, relativeRef?: string): string {
	return `${getRelativePath(ref, relativeRef)}/glossary.md`;
}

export function pathToIndexMd(ref: string, relativeRef?: string): string {
	return `${getRelativePath(ref, relativeRef)}/index.md`;
}
