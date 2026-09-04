import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Compare from "./Compare.harness.svelte";
import { PETSTORE_REFS } from "./petstore.harness";

/**
 * `vitest.config.ts` runs with `css: false` (the default), so the harness's
 * scoped `<style>` is stripped before jsdom ever sees it and `getComputedStyle`
 * on a rendered column would read nothing. The 600px minimum and the
 * horizontal scroll are style-only decisions, so this asserts them from the
 * component source instead.
 */
const source = readFileSync(
	join(dirname(new URL(import.meta.url).pathname), "Compare.harness.svelte"),
	"utf8",
);

/**
 * The compare harness is the morning review's only surface, and the Storybook
 * e2e run cannot defend it: that spec asserts a story painted *something*, so
 * a comparison whose v2 column is blank — or whose two columns are drawing
 * different elements — passes it. These cases assert what the harness is for,
 * that both columns draw the same page, for a strategic page named by `page`
 * and a tactical one named by `ref`.
 */
const columns = (container: HTMLElement) => [
	...container.querySelectorAll(".compare > section"),
];

/** The page title each column draws, without the `v1`/`v2` column label. */
const titles = (container: HTMLElement) =>
	columns(container).map((c) => c.querySelector("h1")?.textContent?.trim());

describe("Compare.harness", () => {
	it("draws two columns, each with the same strategic page", () => {
		const { container } = render(Compare, { page: "team" as const });
		expect(columns(container)).toHaveLength(2);
		const [v1, v2] = titles(container);
		expect(v1).toBeTruthy();
		expect(v2).toBeTruthy();
		expect(v2).toContain(v1 as string);
	});

	it("draws two columns, each with the same tactical page, when named by ref", () => {
		const { container } = render(Compare, { ref: PETSTORE_REFS.entity });
		expect(columns(container)).toHaveLength(2);
		const [v1, v2] = titles(container);
		// Neither column may be empty: a blank v2 column is the failure this
		// case exists for.
		expect(v1).toBeTruthy();
		expect(v2).toBeTruthy();
		// Both are the Pet entity, and only the v2 column carries the kind as
		// the lockup's detail.
		expect(v1).toContain("Pet");
		expect(v2).toContain("Pet");
		expect(v2).toContain("Entity");
	});

	it("keeps each column at a 600px minimum and lets the row scroll", () => {
		const { container } = render(Compare, { page: "domain" as const });
		expect(columns(container)).toHaveLength(2);
		expect(source).toMatch(
			/\.compare\s*>\s*section\s*{[^}]*min-width:\s*600px/,
		);
		expect(source).toMatch(/\.compare\s*{[^}]*overflow-x:\s*auto/);
	});

	it("draws the element the ref names, not a page of another kind", () => {
		const { container } = render(Compare, { ref: PETSTORE_REFS.policy });
		const [, v2] = titles(container);
		expect(v2).toContain("Policy");
		expect(container.querySelector("#when")).toBeInTheDocument();
	});
});
