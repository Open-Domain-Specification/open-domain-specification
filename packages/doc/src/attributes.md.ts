import type { Attribute } from "@open-domain-specification/core";
import { pathToIndexMd } from "./lib/paths";

/**
 * One attribute as `name: \`type\``, identity attributes in bold. An attribute
 * typed by another schema links to that schema's row, because the reader's next
 * question is what is inside it; a value object's type is left as the author
 * wrote it, since the value object has its own row on the context page.
 */
const attributeMd = (attribute: Attribute, fromPath: string) => {
	const name = attribute.identity ? `**${attribute.name}**` : attribute.name;
	const type = attribute.schema
		? `[\`${attribute.type}\`](${pathToIndexMd(attribute.schema.boundedcontext.path, fromPath)}#schemas)`
		: `\`${attribute.type}\``;
	return `${name}: ${type}`;
};

/** Attributes as an inline `name: \`type\`` list; identity attributes in bold. */
export const attributeListMd = (
	attributes: ReadonlyMap<string, Attribute>,
	fromPath: string,
) =>
	Array.from(attributes.values())
		.map((it) => attributeMd(it, fromPath))
		.join(", ") || "-";
