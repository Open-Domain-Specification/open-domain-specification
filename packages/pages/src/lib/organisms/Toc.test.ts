import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Toc from "./Toc.svelte";

const sections = [
	{ id: "present", label: "Present Section" },
	{ id: "missing", label: "Missing Section" },
];

describe("Toc", () => {
	it("is a navigation landmark named for what it lists, not an aside", () => {
		const { container } = render(Toc, { sections });
		const nav = container.querySelector("nav.toc") as HTMLElement;
		expect(nav).toHaveAttribute("aria-label", "On this page");
		expect(container.querySelector("aside")).toBeNull();
		expect(screen.getByRole("navigation", { name: "On this page" })).toBe(nav);
		// The visible title is the landmark's name, so it is not read twice.
		expect(container.querySelector(".toc-title")).toHaveAttribute(
			"aria-hidden",
			"true",
		);
	});

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

describe("Toc moves focus to the section", () => {
	const page = (inner: string) => {
		const section = document.createElement("section");
		section.id = "present";
		section.innerHTML = inner;
		section.scrollIntoView = vi.fn();
		document.body.appendChild(section);
		return section;
	};

	it("focuses the section's heading without scrolling again", async () => {
		const section = page('<h2 class="heading" tabindex="-1">Present</h2>');
		render(Toc, { sections });
		await fireEvent.click(
			screen.getByRole("link", { name: "Present Section" }),
		);
		expect(document.activeElement).toBe(section.querySelector("h2"));
		section.remove();
	});

	it("focuses the section itself when it has no heading of its own", async () => {
		const section = page("<p>no heading</p>");
		render(Toc, { sections });
		await fireEvent.click(
			screen.getByRole("link", { name: "Present Section" }),
		);
		expect(document.activeElement).toBe(section);
		expect(section).toHaveAttribute("tabindex", "-1");
		section.remove();
	});
});
