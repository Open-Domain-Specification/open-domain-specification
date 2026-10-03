import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

const U = "https://example.com";

/** Every link as [text, isProse], in document order. */
function links(text: string): [string, boolean][] {
	const doc = new DOMParser().parseFromString(
		renderMarkdown(text),
		"text/html",
	);
	return [...doc.querySelectorAll("a")].map((a) => [
		a.textContent ?? "",
		a.classList.contains("prose"),
	]);
}

describe("which links are running text (#79)", () => {
	describe("prose: the link has words around it", () => {
		it.each([
			["a paragraph", `Read the [ADR](${U}) first.`],
			["a paragraph led by a quote marker", `> Read the [ADR](${U}) first.`],
			[
				"a paragraph led by nested quote markers",
				`> > Read the [ADR](${U}) first.`,
			],
			["a loose list paragraph", `- Read the [ADR](${U}) first.\n\n- Other.`],
			["a tight list sentence", `- Read the [ADR](${U}) first\n- Other`],
			["an ordered tight list sentence", `1. Read the [ADR](${U}) first`],
			[
				"a table cell sentence",
				`| a | b |\n| - | - |\n| Read the [ADR](${U}) first | x |`,
			],
			[
				"a header cell sentence",
				`| See the [ADR](${U}) | b |\n| - | - |\n| x | y |`,
			],
			["a link and a word", `[ADR](${U}) decided it`],
			["a link and a trailing digit", `[ADR](${U}) 7`],
			["a non-latin word", `[ADR](${U}) été`],
			["a link in strong beside words", `Read **the [ADR](${U})** first.`],
			["a link in emphasis beside words", `Read *the [ADR](${U})* first.`],
			["code beside the link", `[ADR](${U}) \`code\``],
			["a bare url in a sentence", `go to ${U} now`],
			[
				"a reference link in a sentence",
				"Read [ADR][r] first.\n\n[r]: https://example.com",
			],
			["an escaped entity word", `[ADR](${U}) &amp;co`],
			["raw html text beside the link", `[ADR](${U}) <b>text</b>`],
			[
				"a tight item holding a nested list",
				`- Read the [ADR](${U})\n  - [x](${U})`,
			],
		])("%s", (_name, md) => {
			const found = links(md);
			expect(found.length).toBeGreaterThan(0);
			expect(found[0][1]).toBe(true);
		});

		it("marks every link of a sentence, whichever side the words are", () => {
			expect(links(`[a](${U}) and [b](${U})`)).toEqual([
				["a", true],
				["b", true],
			]);
		});

		it("keeps the href and the title on a prose link", () => {
			const doc = new DOMParser().parseFromString(
				renderMarkdown(`Read [ADR](${U} "t") first`),
				"text/html",
			);
			const a = doc.querySelector("a") as HTMLAnchorElement;
			expect(a.getAttribute("href")).toBe(U);
			expect(a.getAttribute("title")).toBe("t");
			expect(a.className).toBe("prose");
		});
	});

	describe("standalone: only links and delimiters", () => {
		it.each([
			["a paragraph that is the link", `[ADR](${U})`],
			["a bare url paragraph", U],
			["a comma list", `[a](${U}), [b](${U})`],
			["a middot list", `[a](${U}) · [b](${U})`],
			["a pipe list", `[a](${U}) | [b](${U})`],
			["a slash list", `[a](${U}) / [b](${U})`],
			["a dash list", `[a](${U}) - [b](${U})`],
			["a semicolon list", `[a](${U}); [b](${U})`],
			["a bullet list", `[a](${U}) • [b](${U})`],
			["a tight link-only list", `- [a](${U})\n- [b](${U})`],
			["a loose link-only list", `- [a](${U})\n\n- [b](${U})`],
			["an ordered link-only list", `1. [a](${U})\n2. [b](${U})`],
			["a bold link", `**[a](${U})**`],
			["a bold link and a delimiter", `**[a](${U})**, *[b](${U})*`],
			[
				"a link-only table cell",
				`| a | b |\n| - | - |\n| [x](${U}) | [y](${U}), [z](${U}) |`,
			],
			["a link led only by a quote marker", `> [a](${U})`],
			["a link with a line break between", `[a](${U})\\\n[b](${U})`],
		])("%s", (_name, md) => {
			const found = links(md);
			expect(found.length).toBeGreaterThan(0);
			for (const [, prose] of found) expect(prose).toBe(false);
		});

		it("judges each cell and each item by its own run", () => {
			expect(
				links(
					`| a | b |\n| - | - |\n| Read the [one](${U}) | [two](${U}) |\n\n- [three](${U})\n- Read the [four](${U})`,
				),
			).toEqual([
				["one", true],
				["two", false],
				["three", false],
				["four", true],
			]);
		});

		it("does not let another link's text count as a word", () => {
			expect(links(`[alpha](${U}), [beta](${U})`)).toEqual([
				["alpha", false],
				["beta", false],
			]);
		});

		it("never marks a heading's link", () => {
			expect(links(`# Title with a [link](${U}) inside`)).toEqual([
				["link", false],
			]);
			expect(links(`## [link](${U})`)).toEqual([["link", false]]);
		});

		it("judges a paragraph apart from its heading", () => {
			expect(links(`# Head [h](${U})\n\nWords [p](${U}) here`)).toEqual([
				["h", false],
				["p", true],
			]);
		});
	});

	describe("what is not words", () => {
		it("does not count an image's alt text, an entity or a line break", () => {
			expect(links(`![alt text](${U}/i.png) [a](${U})`)).toEqual([
				["a", false],
			]);
			expect(links(`[a](${U}) &nbsp; [b](${U})`)).toEqual([
				["a", false],
				["b", false],
			]);
		});

		it("counts words in a code span and ignores an escaped delimiter", () => {
			expect(links(`\`code\` [a](${U})`)).toEqual([["a", true]]);
			expect(links(`\\* [a](${U})`)).toEqual([["a", false]]);
		});
	});

	describe("blockquotes are not a supported structure", () => {
		it("shows the quote marker as text: the renderer escapes > before Marked reads it", () => {
			const out = renderMarkdown(`> > Read the [ADR](${U}) first.`);
			expect(out).not.toContain("<blockquote");
			expect(out).toContain("&gt; &gt; Read the");
			expect(out).toContain('<a class="prose" href=');
		});
	});

	describe("safety is untouched", () => {
		it("shows an unsafe link in a sentence as plain text, unmarked", () => {
			const out = renderMarkdown("Read [the label](javascript:alert(1)) here");
			expect(out).not.toMatch(/<a|href|class=/i);
			expect(out).toContain("the label");
		});

		it("escapes raw html beside a prose link", () => {
			const out = renderMarkdown(
				`<b>x</b> [a](${U}) <img src=x onerror=alert(1)>`,
			);
			expect(out).not.toMatch(/<b>|<img/);
			expect(out).toContain("&lt;b&gt;");
			expect(out).toContain('<a class="prose" href=');
		});
	});
});
