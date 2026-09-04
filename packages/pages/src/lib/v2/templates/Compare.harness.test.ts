import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Compare from "./Compare.harness.svelte";
import { PETSTORE_REFS } from "./petstore.harness";

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

	it("draws the element the ref names, not a page of another kind", () => {
		const { container } = render(Compare, { ref: PETSTORE_REFS.policy });
		const [, v2] = titles(container);
		expect(v2).toContain("Policy");
		expect(container.querySelector("#when")).toBeInTheDocument();
	});
});
