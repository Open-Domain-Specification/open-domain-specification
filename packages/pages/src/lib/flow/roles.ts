import {
	PATTERNS,
	patternByAbbreviation,
} from "@open-domain-specification/core";

/** Short form of a protection pattern for a port; unknown text is shown as is. */
export const roleLabel = (pattern?: string) =>
	pattern
		? (PATTERNS[pattern as keyof typeof PATTERNS]?.abbreviation ?? pattern)
		: undefined;

/**
 * What the patterns behind a port label such as "OHS" or "OHS+PL" mean, for a
 * tooltip: one "Name — summary" line per part, in core's words. Parts with no
 * known pattern stay as they are.
 */
export const roleTitle = (label: string) =>
	label
		.split("+")
		.map((part) => {
			const pattern = patternByAbbreviation(part);
			return pattern ? `${pattern.name} — ${pattern.summary}` : part;
		})
		.join("\n");
