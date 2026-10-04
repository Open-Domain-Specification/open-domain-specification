import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import RefList from "./RefList.svelte";

const SENTENCE =
	"No operation names this rule; it is checked wherever it is saved.";

describe("RefList", () => {
	it("says the caller's words when there is nothing to list, as wrapping secondary text and not a nowrap token", () => {
		const { container } = render(RefList, {
			items: [],
			empty: SENTENCE,
			block: true,
		});
		const empty = screen.getByText(SENTENCE);
		expect(empty).toHaveClass("empty");
		expect(container.querySelector(".keyword")).toBeNull();
		expect(empty.closest("p")).toHaveClass("refs");
		// The word stays inline in a table cell.
		const inline = render(RefList, { items: [], empty: "none" });
		expect(inline.container.querySelector("p")).toBeNull();
		expect(inline.container.querySelector(".empty")).toHaveTextContent("none");
	});

	it("lists the items, comma-separated, and says nothing for an empty word", () => {
		const { container } = render(RefList, {
			items: [
				{ ref: "#/boundedcontexts/a", name: "A" },
				{ ref: "#/boundedcontexts/b", name: "B" },
			],
			empty: "none",
		});
		expect(container.querySelectorAll("a")).toHaveLength(2);
		expect(container.textContent).toContain(", ");
		expect(container.querySelector(".empty")).toBeNull();
	});
});
