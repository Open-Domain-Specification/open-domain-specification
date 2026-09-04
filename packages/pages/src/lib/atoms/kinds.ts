import { ICONS } from "../icons";

/** An element kind the pages know how to draw: the keys of the shared codicon map. */
export type Kind = keyof typeof ICONS;

/**
 * VS Code colours the symbol icons in its Outline, breadcrumbs and suggest
 * widget per symbol kind, through the `symbolIcon.*Foreground` tokens; every
 * other icon takes the plain icon colour. v2 follows that exactly: the kinds
 * whose codicon is a symbol icon take the matching token, and the rest stay
 * in `icon.foreground`. This is the only colour the design language spends on
 * a kind, and it is the platform's own, so a reader who knows the Outline
 * already reads it.
 */
const SYMBOL_TOKEN: Partial<Record<Kind, string>> = {
	boundedcontext: "classForeground",
	aggregate: "structForeground",
	service: "methodForeground",
	entity: "fieldForeground",
	valueobject: "constantForeground",
	domain: "namespaceForeground",
	subdomain: "moduleForeground",
	event: "eventForeground",
	command: "functionForeground",
	workspace: "packageForeground",
};

/** The CSS colour for a kind's icon: its symbol token when it has one, else the icon colour. */
export const iconColor = (kind?: Kind): string => {
	const token = kind ? SYMBOL_TOKEN[kind] : undefined;
	return token
		? `var(--vscode-symbolIcon-${token}, var(--vscode-icon-foreground))`
		: "var(--vscode-icon-foreground)";
};

/** The codicon a kind draws. */
export const kindIcon = (kind: Kind): string => ICONS[kind];
