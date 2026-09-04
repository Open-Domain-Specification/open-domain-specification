import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Toc from "./Toc.svelte";

const sections = [
	{ id: "present", label: "Present Section" },
	{ id: "missing", label: "Missing Section" },
];

describe("Toc", () => {
	it("titles itself in plain sentence case and lists every section as a link to its id", () => {
		const { container } = render(Toc, { sections });
		const title = container.querySelector(".toc-title") as HTMLElement;
		expect(title).toHaveTextContent("On this page");
		expect(title.textContent).not.toBe(title.textContent?.toUpperCase());
		expect(
			screen.getByRole("link", { name: "Present Section" }),
		).toHaveAttribute("href", "#present");
	});

	it("scrolls to the section rather than navigating to it", async () => {
		const section = document.createElement("section");
		section.id = "present";
		const scrollIntoView = vi.fn();
		section.scrollIntoView = scrollIntoView;
		document.body.appendChild(section);

		render(Toc, { sections });
		await fireEvent.click(
			screen.getByRole("link", { name: "Present Section" }),
		);
		expect(scrollIntoView).toHaveBeenCalledWith({
			behavior: "smooth",
			block: "start",
		});
		section.remove();
	});

	it("does nothing when the section is not in the page", async () => {
		render(Toc, { sections });
		await expect(
			fireEvent.click(screen.getByRole("link", { name: "Missing Section" })),
		).resolves.not.toThrow();
	});
});
