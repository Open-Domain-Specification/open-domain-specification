import type { Comment } from "@open-domain-specification/core";

/**
 * What is known about one intent, as a bullet beneath the table that lists it
 * (RFC-002 section 6). The title names the row the bullet belongs to, then one
 * indented bullet per comment: the statement carries the meaning and its
 * citation trails it as a link, so the block still reads as prose.
 *
 * Empty when nobody has written anything down, so a caller can filter it out.
 */
export const commentsMd = (title: string, comments: Comment[]): string =>
	comments.length
		? [
				`- ${title}`,
				...comments.map(({ text, link }) => {
					const cite = link ? ` [${link.label ?? link.url}](${link.url})` : "";
					return `\t- ${text}${cite}`;
				}),
			].join("\n")
		: "";
