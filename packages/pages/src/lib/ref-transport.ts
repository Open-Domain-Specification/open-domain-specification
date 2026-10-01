const UTF16_PREFIX = "#/!utf16/";

const hasUnpairedSurrogate = (value: string) => {
	for (let index = 0; index < value.length; index += 1) {
		const unit = value.charCodeAt(index);
		if (unit >= 0xd800 && unit <= 0xdbff) {
			const next = value.charCodeAt(index + 1);
			if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
			index += 1;
		} else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
	}
	return false;
};

const utf16Hex = (value: string) => {
	let hex = "";
	for (let index = 0; index < value.length; index += 1)
		hex += value.charCodeAt(index).toString(16).padStart(4, "0");
	return hex;
};

const fromUtf16Hex = (hex: string): string | undefined => {
	if (!/^(?:[0-9a-f]{4})+$/.test(hex)) return undefined;
	let value = "";
	for (let index = 0; index < hex.length; index += 4)
		value += String.fromCharCode(
			Number.parseInt(hex.slice(index, index + 4), 16),
		);
	return value;
};

/** Encodes one canonical model ref as a browser fragment payload. */
export function modelRefToHash(ref: string): string {
	if (ref === "#") return "#";
	const transported = hasUnpairedSurrogate(ref)
		? `${UTF16_PREFIX}${utf16Hex(ref)}`
		: ref;
	return `#/${transported
		.slice(2)
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/")}`;
}

/** Decodes one browser fragment layer back to a canonical model ref. */
export function hashToModelRef(hash: string): string | undefined {
	if (hash === "" || hash === "#") return "#";
	if (!hash.startsWith("#/")) return undefined;
	try {
		const transported = `#/${hash
			.slice(2)
			.split("/")
			.map((segment) => decodeURIComponent(segment))
			.join("/")}`;
		const ref = transported.startsWith(UTF16_PREFIX)
			? fromUtf16Hex(transported.slice(UTF16_PREFIX.length))
			: transported;
		if (!ref || !ref.startsWith("#/")) return undefined;
		return modelRefToHash(ref) === hash ? ref : undefined;
	} catch {
		return undefined;
	}
}
