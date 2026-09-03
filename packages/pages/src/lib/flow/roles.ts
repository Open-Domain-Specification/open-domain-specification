import {
	DOWNSTREAM_ROLE_LABELS,
	UPSTREAM_ROLE_LABELS,
} from "@open-domain-specification/graphviz";

const LABELS: Record<string, string> = {
	...UPSTREAM_ROLE_LABELS,
	...DOWNSTREAM_ROLE_LABELS,
};
const NAMES: Record<string, string> = Object.fromEntries(
	Object.entries(LABELS).map(([name, label]) => [label, name]),
);

/** Short form of a protection pattern for a port; unknown text is shown as is. */
export const roleLabel = (pattern?: string) =>
	pattern ? (LABELS[pattern] ?? pattern) : undefined;

/**
 * Full pattern names behind a port label such as "OHS" or "OHS+PL", for a
 * tooltip; parts with no known pattern stay as they are.
 */
export const roleTitle = (label: string) =>
	label
		.split("+")
		.map((part) => NAMES[part] ?? part)
		.join(" + ");
