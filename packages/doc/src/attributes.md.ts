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
 * alongside the root it is reached through. An id belonging to a system the
 * enterprise does not model inside names that system's context instead, and
 * links to its page (decision 28).
 *
 * An attribute that is sometimes absent is marked `optional` after the type
 * (decision 24). Only the exception is written: everything unmarked is always
 * present, which is the common case.
 */
const attributeMd = (
	attribute: Attribute,
	fromPath: string,
	inherited = false,
) => {
	const name = attribute.identity ? `**${attribute.name}**` : attribute.name;
	const type = attribute.schema
		? `[\`${attribute.type}\`](${pathToIndexMd(attribute.schema.boundedcontext.path, fromPath)}#schemas)`
		: `\`${attribute.type}\``;
	const identified = attribute.identifies;
	// An entity links to its aggregate's page, where a child is written up
	// beside the root it is reached through; an external context links to its
	// own. They are told apart by what only an entity has, rather than by
	// `instanceof`, because the generator and the workspace it renders need not
	// have loaded core through the same entry point.
	const identifiesPath =
		identified && "aggregate" in identified
			? identified.aggregate.path
			: identified?.path;
	const identifies = identified
		? ` (identifies [${identified.name}](${pathToIndexMd(identifiesPath ?? "", fromPath)}))`
		: "";
	const optional = attribute.optional ? " (optional)" : "";
	// A kind has its parent's attributes as its own, so they are listed here
	// too, each saying whose it is: that is where a reader goes to change one
	// (decision 22).
	const from = inherited ? ` (from ${attribute.owner.name})` : "";
	return `${name}: ${type}${optional}${identifies}${from}`;
};

/**
 * Attributes as an inline `name: \`type\`` list; identity attributes in bold,
 * and an attribute that is sometimes absent marked `(optional)`. Whatever the
 * owner has from what it is a kind of follows its own, each marked with where
 * it comes from.
 */
export const attributeListMd = (
	attributes: ReadonlyMap<string, Attribute>,
	fromPath: string,
	inherited: readonly Attribute[] = [],
) =>
	[
		...Array.from(attributes.values()).map((it) => attributeMd(it, fromPath)),
		...inherited.map((it) => attributeMd(it, fromPath, true)),
	].join(", ") || "-";
