import { Marked, Renderer, type Token, type Tokens } from "marked";

const named: Record<string, string> = {
	colon: ":",
	tab: "\t",
	newline: "\n",
	lpar: "(",
	rpar: ")",
	sol: "/",
	num: "#",
};

/** What a browser reads out of an href before it looks for a scheme. */
function decode(href: string): string {
	let out = href.replace(
		/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));?/gi,
		(whole, hex: string, dec: string, name: string) => {
			if (name) return named[name.toLowerCase()] ?? whole;
			const code = Number.parseInt(hex ?? dec, hex ? 16 : 10);
			return code <= 0x10ffff ? String.fromCodePoint(code) : whole;
		},
	);
	try {
		out = decodeURIComponent(out);
	} catch {
		// an undecodable percent sequence stays as written
	}
	// Browsers drop controls, whitespace and line separators before reading a scheme.
	return [...out]
		.filter((c) => {
			const n = c.codePointAt(0) as number;
			return !(
				n <= 0x20 ||
				(n >= 0x7f && n <= 0x9f) ||
				n === 0x2028 ||
				n === 0x2029
			);
		})
		.join("");
}

/** Only http, https, mailto and an in-model ref (a hash route or section anchor) may be a link. */
export function isSafeUrl(href: string): boolean {
	const url = decode(href);
	return url.startsWith("#") || /^(?:https?|mailto):/i.test(url);
}

function escapeText(text: string): string {
	return text
		.replace(/&(?!(?:#\d+|#x[0-9a-f]+|[a-z]+);)/gi, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

type Link = Tokens.Link & { prose?: boolean };

/** Token types whose text is words a reader reads, as opposed to a delimiter or an image. */
const worded = new Set(["text", "codespan", "escape"]);

/** Letters or digits once entities are out of the way: a comma, a middot or a pipe is a delimiter, not a word. */
function hasWord(text: string): boolean {
	return /[\p{L}\p{N}]/u.test(
		text.replace(/&(?:#\d+|#x[0-9a-f]+|[a-z]+);/gi, ""),
	);
}

/** The links of an inline run, and whether a word that is not link text sits in it. */
function scan(tokens: Token[], run: { links: Link[]; words: boolean }): void {
	for (const token of tokens) {
		// An image's alt text is its description, not words of the sentence.
		const inner =
			token.type === "image" ? undefined : (token as Tokens.Generic).tokens;
		if (token.type === "link") run.links.push(token as Link);
		else if (inner) scan(inner, run);
		else if (worded.has(token.type) && hasWord((token as Tokens.Text).text))
			run.words = true;
	}
}

/**
 * A link is running text, and so carries more than colour (#79), when words
 * that are not link text sit in the same inline run: a paragraph, a tight list
 * item's text or a table cell. A run of only links and delimiters is a
 * standalone list of links, and a heading is never a run.
 */
function markProse(tokens: Token[]): void {
	const run = { links: [] as Link[], words: false };
	scan(tokens, run);
	if (run.words) for (const link of run.links) link.prose = true;
}

const markdown = new Marked({
	walkTokens(token) {
		if ((token.type === "paragraph" || token.type === "text") && token.tokens)
			markProse(token.tokens);
		else if (token.type === "table")
			for (const cell of [...token.header, ...token.rows.flat()])
				markProse(cell.tokens);
	},
	renderer: {
		link(token) {
			if (!isSafeUrl(token.href)) return this.parser.parseInline(token.tokens);
			const html = Renderer.prototype.link.call(this, token);
			return (token as Link).prose
				? html.replace(/^<a /, '<a class="prose" ')
				: html;
		},
		image({ href, text }) {
			return isSafeUrl(href) ? false : escapeText(text);
		},
	},
});

/** Markdown to HTML. Raw HTML in the source is shown as text and a link outside the allowlist is shown as its text. */
export function renderMarkdown(text: string): string {
	return markdown.parse(text.replace(/</g, "&lt;").replace(/>/g, "&gt;"), {
		async: false,
	}) as string;
}
