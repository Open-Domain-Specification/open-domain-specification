import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Demo from "./Toc.harness.svelte";

describe("Toc", () => {
	it("titles the list in plain secondary text, not tracked capitals, and links every section", () => {
		const { container } = render(Demo);
		const title = container.querySelector(".title") as HTMLElement;
		expect(title).toHaveTextContent("On this page");
		expect(container.querySelector(".toc-title")).toBeNull();

		const links = container.querySelectorAll("a");
		expect(links).toHaveLength(5);
		expect(links[0]).toHaveAttribute("href", "#position");
		expect([...links].some((a) => a.classList.contains("active"))).toBe(false);
	});

	it("marks the section being read", () => {
		const { container } = render(Demo, { active: "integration" });
		const active = container.querySelectorAll("a.active");
		expect(active).toHaveLength(1);
		expect(active[0]).toHaveTextContent("Integration surface");
	});

	it("scrolls to the section rather than jumping, and leaves the url alone", async () => {
		render(Demo);
		const scrollIntoView = vi.fn();
		const target = document.createElement("div");
		target.id = "model";
		target.scrollIntoView = scrollIntoView;
		document.body.append(target);

		await fireEvent.click(screen.getByText("Model"));
		expect(scrollIntoView).toHaveBeenCalledWith({
			behavior: "smooth",
			block: "start",
		});
		target.remove();
	});

	it("does nothing when the section is not on the page", async () => {
		render(Demo);
		await fireEvent.click(screen.getByText("Policies"));
		expect(document.getElementById("policies")).toBeNull();
	});
});
