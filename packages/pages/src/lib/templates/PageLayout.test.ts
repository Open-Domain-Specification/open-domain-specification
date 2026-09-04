import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import PageLayout from "./PageLayout.svelte";

describe("PageLayout", () => {
	it("puts the page in the main column and the sections beside it", () => {
		const { container } = render(PageLayout, {
			sections: [{ id: "model", label: "Model" }],
			children: createRawSnippet(() => ({
				render: () => "<p>The page.</p>",
			})),
		});
		expect(container.querySelector(".layout main")).toHaveTextContent(
			"The page.",
		);
		expect(container.querySelector(".layout .toc")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Model" })).toHaveAttribute(
			"href",
			"#model",
		);
	});
});
