import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Demo from "./LanguageSection.harness.svelte";

describe("LanguageSection", () => {
	it("prints each term as a link with the term codicon, and no pill", () => {
		const { container } = render(Demo);
		expect(container.querySelector(".pill")).toBeNull();
		const links = container.querySelectorAll(".terms a");
		expect(links).toHaveLength(1);
		expect(links[0]).toHaveTextContent("Pet");
		expect(links[0].querySelector(".codicon-book")).not.toBeNull();
		expect(
			screen.getByRole("heading", { level: 2 }).querySelector(".count"),
		).toHaveTextContent("1");
	});

	it("separates two terms with a comma", () => {
		const { container } = render(Demo, { variant: "two" });
		const terms = container.querySelector(".terms") as HTMLElement;
		expect(terms.querySelectorAll("a")).toHaveLength(2);
		expect(terms.textContent?.trim()).toBe("Pet, Listing");
	});

	it("says what would fill it when nothing in the language names the element", () => {
		const { container } = render(Demo, { variant: "none" });
		expect(container.querySelector(".terms")).toBeNull();
		expect(
			screen.getByText("No glossary term names this element."),
		).toHaveClass("empty");
	});
});
