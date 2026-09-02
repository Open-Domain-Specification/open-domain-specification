import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Toc from "./Toc.svelte";

describe("Toc", () => {
	const sections = [
		{ id: "present", label: "Present Section" },
		{ id: "missing", label: "Missing Section" },
	];

	it("lists every section as a link to its id", () => {
		render(Toc, { sections });
		expect(
			screen.getByRole("link", { name: "Present Section" }),
		).toHaveAttribute("href", "#present");
		expect(
			screen.getByRole("link", { name: "Missing Section" }),
		).toHaveAttribute("href", "#missing");
	});

	it("scrolls the target section into view when it exists in the page", async () => {
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

	it("does nothing when the target section is not in the page", async () => {
		render(Toc, { sections });
		await expect(
			fireEvent.click(screen.getByRole("link", { name: "Missing Section" })),
		).resolves.not.toThrow();
	});

	it("copes with a section that has no id", () => {
		const { container } = render(Toc, {
			sections: [{ id: undefined as unknown as string, label: "No id" }],
		});
		expect(container.querySelector("a")).toHaveAttribute("href", "#");
	});
});
