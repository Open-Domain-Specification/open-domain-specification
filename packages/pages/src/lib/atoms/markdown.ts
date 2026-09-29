import { Marked } from "marked";

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
			const n = c.codePointAt(0) ?? 0;
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

const markdown = new Marked({
	renderer: {
		link({ href, tokens }) {
			return isSafeUrl(href) ? false : this.parser.parseInline(tokens);
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
