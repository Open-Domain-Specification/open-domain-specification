const PREFIX = "__ods_utf16_";

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

const hasDotUnsafeCodeUnit = (value: string) => {
	for (let index = 0; index < value.length; index += 1) {
		const unit = value.charCodeAt(index);
		if (unit === 0x5c || unit <= 0x1f || (unit >= 0x7f && unit <= 0x9f))
			return true;
	}
	return false;
};

/** A DOT-safe identity which leaves ordinary canonical refs unchanged. */
export function graphIdentifier(id: string): string {
	if (
		!hasUnpairedSurrogate(id) &&
		!hasDotUnsafeCodeUnit(id) &&
		!id.startsWith(PREFIX)
	)
		return id;
	let hex = "";
	for (let index = 0; index < id.length; index += 1)
		hex += id.charCodeAt(index).toString(16).padStart(4, "0");
	return `${PREFIX}${hex}`;
}
