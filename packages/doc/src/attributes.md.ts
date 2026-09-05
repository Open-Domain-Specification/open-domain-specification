import type { Attribute } from "@open-domain-specification/core";
import { pathToIndexMd } from "./lib/paths";

/**
 * One attribute as `name: \`type\``, identity attributes in bold. An attribute
 * typed by another schema links to that schema's row, because the reader's next
 * question is what is inside it; a value object's type is left as the author
 * wrote it, since the value object has its own row on the context page.
 *
 * An attribute that holds another entity's identity says whose, and links to
 * it: that identity is the whole of the dependency, often across a bounded
 * context, and a reader who cannot follow it is reading a bare id. The link
 * goes to the aggregate page, which is where a child entity is written up
 * alongside the root it is reached through.
 *
 * An attribute that is sometimes absent is marked `optional` after the type
 * (decision 24). Only the exception is written: everything unmarked is always
 * present, which is the common case.
 */
const attributeMd = (attribute: Attribute, fromPath: string) => {
	const name = attribute.identity ? `**${attribute.name}**` : attribute.name;
	const type = attribute.schema
		? `[\`${attribute.type}\`](${pathToIndexMd(attribute.schema.boundedcontext.path, fromPath)}#schemas)`
		: `\`${attribute.type}\``;
	const identifies = attribute.identifies
		? ` (identifies [${attribute.identifies.name}](${pathToIndexMd(attribute.identifies.aggregate.path, fromPath)}))`
		: "";
	const optional = attribute.optional ? " (optional)" : "";
	return `${name}: ${type}${optional}${identifies}`;
};

/**
 * Attributes as an inline `name: \`type\`` list; identity attributes in bold,
 * and an attribute that is sometimes absent marked `(optional)`.
 */
export const attributeListMd = (
	attributes: ReadonlyMap<string, Attribute>,
	fromPath: string,
) =>
	Array.from(attributes.values())
		.map((it) => attributeMd(it, fromPath))
		.join(", ") || "-";
