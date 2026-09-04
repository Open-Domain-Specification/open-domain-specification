import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Demo from "./PageLayout.harness.svelte";
import PageLayout from "./PageLayout.svelte";

const body = createRawSnippet(() => ({
	render: () => "<p>The page</p>",
}));

describe("PageLayout", () => {
	it("puts the sticky toolbar over two columns, the content first and the contents second", () => {
		const { container } = render(Demo);
		const layout = container.querySelector(".layout") as HTMLElement;
		expect(layout).toHaveClass("with-toc");
		expect(container.querySelector(".toolbar")).toHaveTextContent(
			"petstore.json",
		);
		expect(layout.firstElementChild?.tagName).toBe("MAIN");
		expect(layout.lastElementChild).toHaveClass("contents");
	});

	it("renders the whole chrome of a page: tree, header, section of rows and contents", () => {
		const { container } = render(Demo);
		expect(container.querySelector(".tree")).not.toBeNull();
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Pet");
		expect(
			screen
				.getAllByRole("heading", { level: 2 })
				.map((h) => h.textContent?.trim()),
		).toEqual(["Attributes6", "Strategic position1"]);
		expect(container.querySelectorAll("tbody tr")).toHaveLength(6);
	});

	it("drops the tree where the host has its own navigation", () => {
		const { container } = render(Demo, { nav: false });
		expect(container.querySelector(".tree")).toBeNull();
		expect(container.querySelector(".layout")).toHaveClass("with-toc");
	});

	it("takes the full width when the page has no contents column and no toolbar", () => {
		const { container } = render(PageLayout, { children: body });
		expect(container.querySelector(".toolbar")).toBeNull();
		const layout = container.querySelector(".layout") as HTMLElement;
		expect(layout).not.toHaveClass("with-toc");
		expect(layout.children).toHaveLength(1);
		expect(layout).toHaveTextContent("The page");
	});
});
