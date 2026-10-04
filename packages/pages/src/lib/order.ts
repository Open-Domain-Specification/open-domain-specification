/**
 * The one order a set of files is given in: by code point of the set path. It
 * does not depend on the machine's locale or on which fetch finished first, so
 * the viewer, an upload and the extension list a folder the same way, and an
 * aggregated listing reads in the same order on each of them.
 */
export const codePoint = (a: string, b: string): number =>
	a < b ? -1 : a > b ? 1 : 0;
