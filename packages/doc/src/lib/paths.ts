import { getRelativePath } from "./path";

export function pathToConsumableMapSvg(
	ref: string,
	relativeRef?: string,
): string {
	return `${getRelativePath(ref, relativeRef)}/consumablemap.svg`;
}

export function pathToContextMapSvg(ref: string, relativeRef?: string): string {
	return `${getRelativePath(ref, relativeRef)}/contextmap.svg`;
}

export function pathToRelationMapSvg(
	ref: string,
	relativeRef?: string,
): string {
	return `${getRelativePath(ref, relativeRef)}/relationmap.svg`;
}

export function pathToIndexMd(ref: string, relativeRef?: string): string {
	return `${getRelativePath(ref, relativeRef)}/index.md`;
}
