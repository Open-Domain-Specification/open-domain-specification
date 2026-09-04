import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Disposition from "./Disposition.svelte";

describe("Disposition", () => {
	it("draws a tolerated compromise as information in the secondary colour", () => {
		const { container } = render(Disposition, { disposition: "tolerated" });
		const mark = container.querySelector(".disposition") as HTMLElement;
		expect(mark).toHaveClass("tolerated");
		expect(mark).toHaveTextContent("tolerated");
		expect(mark.querySelector(".codicon-info")).toBeInTheDocument();
		expect(mark).toHaveAttribute(
			"title",
			"A known compromise, not planned to change. The comments say why.",
		);
	});

	it("draws something marked for refactoring as a warning", () => {
		const { container } = render(Disposition, { disposition: "refactor" });
		const mark = container.querySelector(".disposition") as HTMLElement;
		expect(mark).toHaveClass("refactor");
		expect(mark.querySelector(".codicon-warning")).toBeInTheDocument();
		expect(screen.getByText("refactor")).toBeInTheDocument();
	});

	it("draws an empty word for a disposition it does not know rather than throwing", () => {
		const { container } = render(Disposition, {
			disposition: "unknown" as unknown as "refactor",
		});
		const mark = container.querySelector(".disposition") as HTMLElement;
		expect(mark).toHaveClass("unknown");
		expect(mark.textContent?.trim()).toBe("");
	});

	it("draws nothing for by-design, which is the default, or for no disposition at all", () => {
		const { container } = render(Disposition, { disposition: "by-design" });
		expect(container.textContent?.trim()).toBe("");
		const bare = render(Disposition, {});
		expect(bare.container.textContent?.trim()).toBe("");
	});
});
