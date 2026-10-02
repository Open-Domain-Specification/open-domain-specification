const ESCAPE_PREFIX = "_ods_";
const LONG_PREFIX = `${ESCAPE_PREFIX}long_`;
const SAFE_COMPONENT = /^[a-z0-9_-]+$/;
const WINDOWS_RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/;
const MAX_SHORT_COMPONENT_LENGTH = 240;
const LONG_CHUNK_LENGTH = 224;
const BASE32 = "0123456789abcdefghijklmnopqrstuv";

const utf16Hex = (value: string) => {
	let hex = "";
	for (let index = 0; index < value.length; index += 1)
		hex += value.charCodeAt(index).toString(16).padStart(4, "0");
	return hex;
};

const utf16Base32 = (value: string) => {
	let encoded = "";
	let buffer = 0;
	let bits = 0;
	const addByte = (byte: number) => {
		buffer = (buffer << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			bits -= 5;
			encoded += BASE32[(buffer >>> bits) & 31];
		}
		buffer &= (1 << bits) - 1;
	};
	for (let index = 0; index < value.length; index += 1) {
		const unit = value.charCodeAt(index);
		addByte(unit >>> 8);
		addByte(unit & 0xff);
	}
	if (bits > 0) encoded += BASE32[(buffer << (5 - bits)) & 31];
	return encoded;
};

const shortComponent = (segment: string) => {
	if (
		SAFE_COMPONENT.test(segment) &&
		!segment.startsWith(ESCAPE_PREFIX) &&
		!WINDOWS_RESERVED.test(segment) &&
		segment !== "." &&
		segment !== ".."
	)
		return segment;
	return `${ESCAPE_PREFIX}${utf16Hex(segment)}`;
};

/** Projects one logical segment to one or more bounded file components. */
export function fileComponents(segment: string): string[] {
	const short = shortComponent(segment);
	if (short.length <= MAX_SHORT_COMPONENT_LENGTH) return [short];

	const safePayload = short === segment;
	const payload = safePayload ? segment : utf16Base32(segment);
	const mode = safePayload ? "s" : "b";
	const chunks: string[] = [];
	for (let index = 0; index < payload.length; index += LONG_CHUNK_LENGTH) {
		const chunk = payload.slice(index, index + LONG_CHUNK_LENGTH);
		const marker = index + LONG_CHUNK_LENGTH >= payload.length ? "e" : "c";
		chunks.push(`${LONG_PREFIX}${mode}${marker}_${chunk}`);
	}
	return chunks;
}

/** Projects every canonical model-path segment without dropping empty ones. */
export function physicalPath(path: string): string {
	return path.split("/").flatMap(fileComponents).join("/");
}

/** Percent-encodes a physical path for a Markdown URL, one component at a time. */
export function physicalPathUrl(path: string): string {
	return path.split("/").map(encodeURIComponent).join("/");
}

/**
 * Returns the portable physical path from `relativeTo` to `target`.
 * If both paths are the same, returns ".".
 */
export function getRelativePath(target: string, relativeTo?: string): string {
	const projectedTarget = physicalPath(target);
	if (relativeTo === undefined) return projectedTarget;

	const tgt = projectedTarget.split("/");
	const base = physicalPath(relativeTo).split("/");

	// find common prefix length
	let i = 0;
	while (i < tgt.length && i < base.length && tgt[i] === base[i]) i++;

	// number of ".." is how many segments remain in base after the common prefix
	const ups = base.length - i;
	const down = tgt.slice(i);

	if (ups === 0 && down.length === 0) return ".";

	const parts = [...Array(ups).fill(".."), ...down];
	const result = physicalPathUrl(parts.join("/"));
	return result.length ? result : ".";
}
