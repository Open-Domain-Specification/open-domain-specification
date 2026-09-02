import type { Attribute } from "@open-domain-specification/core";

/** Attributes as an inline `name: \`type\`` list; identity attributes in bold. */
export const attributeListMd = (attributes: ReadonlyMap<string, Attribute>) =>
	Array.from(attributes.values())
		.map((it) =>
			it.identity
				? `**${it.name}**: \`${it.type}\``
				: `${it.name}: \`${it.type}\``,
		)
		.join(", ") || "-";
