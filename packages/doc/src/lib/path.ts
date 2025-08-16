/**
 * Returns the path from `relativeTo` to `target`.
 * - If `relativeTo` is omitted, returns `target.path` (normalized).
 * - If both paths are the same, returns "."
 */
export function getRelativePath(target: string, relativeTo?: string): string {
	const normalize = (p: string) =>
		p
			.replace(/\\/g, "/") // windows -> posix
			.replace(/\/+/g, "/") // collapse multiple slashes
			.replace(/^\/+|\/+$/g, ""); // trim leading/trailing slashes

	if (!relativeTo) return normalize(target);

	const tgt = normalize(target).split("/").filter(Boolean);
	const base = normalize(relativeTo).split("/").filter(Boolean);

	// find common prefix length
	let i = 0;
	while (i < tgt.length && i < base.length && tgt[i] === base[i]) i++;

	// number of ".." is how many segments remain in base after the common prefix
	const ups = base.length - i;
	const down = tgt.slice(i);

	if (ups === 0 && down.length === 0) return ".";

	const parts = [...Array(ups).fill(".."), ...down];
	const result = parts.join("/");
	return result.length ? result : ".";
}
