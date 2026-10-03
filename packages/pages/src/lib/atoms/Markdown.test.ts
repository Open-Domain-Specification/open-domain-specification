import { readFileSync } from "node:fs";
import { render } from "@testing-library/svelte";
import { compile } from "svelte/compiler";
import { describe, expect, it } from "vitest";
import Markdown from "./Markdown.svelte";

const html = (text: string) =>
	render(Markdown, { text }).container.querySelector(".md") as HTMLElement;

const unsafeUrls: [string, string][] = [
	["javascript", "javascript:alert(1)"],
	["data", "data:text/html,<script>alert(1)</script>"],
	["vbscript", "vbscript:msgbox(1)"],
	["file", "file:///etc/passwd"],
	["mixed case", "JaVaScRiPt:alert(1)"],
	["leading space", " javascript:alert(1)"],
	["leading control character", "\u0001javascript:alert(1)"],
	["hex entity tab in scheme", "java&#x09;script:alert(1)"],
	["entity newline in scheme", "java&#10;script:alert(1)"],
	["decimal entity letter", "&#106;avascript:alert(1)"],
	["hex entity letter", "&#x6A;avascript:alert(1)"],
	["entity colon", "javascript&colon;alert(1)"],
	["percent-encoded colon", "javascript%3Aalert(1)"],
	["percent-encoded letters", "%6Aavascript:alert(1)"],
	["literal tab in scheme", "java\tscript:alert(1)"],
	["entity without its semicolon", "&#106avascript:alert(1)"],
	["unknown named entity", "java&bogus;script:alert(1)"],
	["run-on named entity", "javascript&colonalert(1)"],
	["entity beyond the code points", "&#x110000;javascript:alert(1)"],
	["undecodable percent sequence", "javascript:%E0%A4%A"],
	[
		"c1 control character in scheme",
		`java${String.fromCharCode(0x85)}script:alert(1)`,
	],
	[
		"delete character in scheme",
		`java${String.fromCharCode(0x7f)}script:alert(1)`,
	],
	[
		"line separator in scheme",
		`java${String.fromCharCode(0x2028)}script:alert(1)`,
	],
	[
		"paragraph separator in scheme",
		`java${String.fromCharCode(0x2029)}script:alert(1)`,
	],
	["protocol-relative", "//example.com/x"],
	["other scheme", "ftp://example.com/x"],
];

const noUnsafe = (root: HTMLElement) => {
	expect(root.querySelector("a")).toBeNull();
	expect(root.querySelector("img")).toBeNull();
	expect(root.querySelector("[href]")).toBeNull();
	expect(root.querySelector("[src]")).toBeNull();
	expect(root.innerHTML).not.toMatch(/href=|src=/i);
};

describe("Markdown links", () => {
	describe.each(unsafeUrls)("%s", (_name, url) => {
		it("renders an inline link as its text", () => {
			const root = html(`see [the label](${url}) here`);
			noUnsafe(root);
		});

		it("renders an inline link with a title without a link", () => {
			noUnsafe(html(`[the label](${url} "a title")`));
		});

		it("renders a reference-style link without a link", () => {
			noUnsafe(html(`[the label][r]\n\n[r]: ${url}`));
		});

		it("renders an image without an img", () => {
			noUnsafe(html(`![the alt](${url})`));
		});
	});

	it("shows the text of an unsafe link as plain text", () => {
		const root = html("see [the label](javascript:alert(1)) here");
		expect(root.textContent?.trim()).toBe("see the label here");
		const image = html("![the alt](data:image/png;base64,AAAA)");
		expect(image.textContent?.trim()).toBe("the alt");
	});

	it("does not link an autolink to an unsafe scheme", () => {
		noUnsafe(html("<javascript:alert(1)>"));
		noUnsafe(html("<data:text/html;base64,PHNjcmlwdD4=>"));
	});

	it("keeps markdown inside the text of an unsafe link", () => {
		const root = html("[**bold** and `code`](javascript:alert(1))");
		noUnsafe(root);
		expect(root.querySelector("strong")?.textContent).toBe("bold");
		expect(root.querySelector("code")?.textContent).toBe("code");
	});

	it("still shows raw html as text", () => {
		const root = html('<a href="javascript:alert(1)">x</a>');
		expect(root.querySelector("a")).toBeNull();
		expect(root.textContent).toContain("<a href=");
	});

	describe("safe links stay links", () => {
		it.each([
			["http", "http://example.com/a?b=1"],
			["https", "https://example.com/a"],
			["mixed-case https", "HTTPS://example.com/a"],
			["mailto", "mailto:someone@example.com"],
			["hash route", "#/domains/sales"],
			["section anchor", "#overview"],
			["undecodable percent sequence", "https://example.com/%E0%A4%A"],
			["unknown named entity", "https://example.com/?a=&bogus;"],
		])("%s", (_name, url) => {
			const a = html(`[label](${url})`).querySelector("a");
			expect(a).not.toBeNull();
			expect(a?.getAttribute("href")).toBe(url);
			expect(a?.textContent).toBe("label");
		});

		it("links a url whose entity is beyond the code points", () => {
			expect(
				html("[label](https://example.com/?a=&#x110000;)").querySelector("a"),
			).not.toBeNull();
		});

		it("keeps a title and markdown in the text", () => {
			const a = html('[**bold**](https://example.com "a title")').querySelector(
				"a",
			);
			expect(a?.getAttribute("title")).toBe("a title");
			expect(a?.querySelector("strong")?.textContent).toBe("bold");
		});

		it("keeps a reference-style link", () => {
			const a = html("[label][r]\n\n[r]: https://example.com").querySelector(
				"a",
			);
			expect(a?.getAttribute("href")).toBe("https://example.com");
		});

		it("links a bare https url", () => {
			expect(
				html("go to https://example.com now").querySelector("a"),
			).not.toBeNull();
		});

		it("keeps an http image", () => {
			const img = html("![alt](https://example.com/a.png)").querySelector(
				"img",
			);
			expect(img?.getAttribute("src")).toBe("https://example.com/a.png");
		});
	});
});

describe("links in running text (#79)", () => {
	const css = compile(readFileSync(`${__dirname}/Markdown.svelte`, "utf8"), {
		filename: "Markdown.svelte",
		css: "external",
	}).css?.code as string;

	it("underlines the marked link at rest, and only the marked link", () => {
		expect(css).toMatch(
			/\.md\.svelte-\w+\s+a\.prose\s*\{[^}]*text-decoration:\s*underline/,
		);
		expect(css).not.toMatch(/p a\s*\{/);
		expect(css).not.toMatch(/\.md\.svelte-\w+\s+a\s*\{/);
	});

	const ADR = "https://example.com/adr";
	it.each([
		["a paragraph", `Read the [ADR](${ADR}) first.`],
		[
			"a paragraph led by a quote marker (no blockquote is rendered)",
			`> Read the [ADR](${ADR}) first.`,
		],
		["a loose list", `- Read the [ADR](${ADR}) first.\n\n- Other.`],
		["a tight list sentence", `- Read the [ADR](${ADR}) first\n- Other`],
		[
			"a table cell sentence",
			`| a | b |\n| - | - |\n| Read the [ADR](${ADR}) first | x |`,
		],
	])("marks a link in %s", (_name, text) => {
		expect(html(text).querySelector("a")?.matches("a.prose")).toBe(true);
	});

	it.each([
		["a lone link paragraph", `[ADR](${ADR})`],
		["a tight list of links", `- [one](${ADR})\n- [two](${ADR})`],
		["a loose list of links", `- [one](${ADR})\n\n- [two](${ADR})`],
		["a delimited run", `[one](${ADR}) \u00b7 [two](${ADR})`],
		["a link-only table cell", `| a |\n| - |\n| [one](${ADR}) |`],
		["a heading", `## About [the ADR](${ADR})`],
	])("leaves %s alone", (_name, text) => {
		const links = [...html(text).querySelectorAll("a")];
		expect(links.length).toBeGreaterThan(0);
		for (const a of links) expect(a.matches(".prose")).toBe(false);
	});
});
