import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import DispositionChip from "./DispositionChip.svelte";

describe("DispositionChip", () => {
	it("outlines a tolerated compromise and explains it on hover", () => {
		render(DispositionChip, { disposition: "tolerated" });
		const chip = screen.getByText("tolerated");
		expect(chip).toHaveClass("chip");
		expect(chip).not.toHaveClass("warn");
		expect(chip).toHaveAttribute(
			"title",
			"A known compromise, not planned to change. The facts say why.",
		);
	});

	it("warns on something marked for refactoring", () => {
		render(DispositionChip, { disposition: "refactor" });
		expect(screen.getByText("refactor")).toHaveClass("warn");
	});

	it("renders nothing for by-design, which is the default, or for no disposition at all", () => {
		const { container } = render(DispositionChip, { disposition: "by-design" });
		expect(container.textContent?.trim()).toBe("");
		const bare = render(DispositionChip, {});
		expect(bare.container.textContent?.trim()).toBe("");
	});
});
