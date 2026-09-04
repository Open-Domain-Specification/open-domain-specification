import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../../fixtures";
import ContextList from "./ContextList.svelte";

const contexts = [...petstoreModel().workspace.boundedcontexts.values()];

describe("ContextList", () => {
	it("separates the contexts with commas the stylesheet draws, not text in the markup", () => {
		const { container } = render(ContextList, {
			contexts: contexts.slice(0, 2),
		});
		expect(container.querySelectorAll("a")).toHaveLength(2);
		// The separator is a ::before on every item but the first, so a copied
		// list reads correctly and the markup has no stray text nodes.
		expect(container.querySelector(".joined")?.children).toHaveLength(2);
		expect(container.textContent).not.toContain(",");
	});

	it("says the caller's word when there is no context to name", () => {
		render(ContextList, { contexts: [], empty: "no context" });
		expect(screen.getByText("no context")).toHaveClass("keyword");
	});

	it("falls back to a plain 'none' when the caller gives no word", () => {
		render(ContextList, { contexts: [] });
		expect(screen.getByText("none")).toHaveClass("keyword");
	});
});
