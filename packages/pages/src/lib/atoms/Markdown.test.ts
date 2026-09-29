import { render } from "@testing-library/svelte";
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
		])("%s", (_name, url) => {
			const a = html(`[label](${url})`).querySelector("a");
			expect(a).not.toBeNull();
			expect(a?.getAttribute("href")).toBe(url);
			expect(a?.textContent).toBe("label");
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
