import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Demo from "./HoverCard.harness.svelte";

describe("HoverCard", () => {
	it("frames a pattern's meaning with the pattern as its heading", () => {
		const { container } = render(Demo);
		const card = container.querySelector(".hover-card") as HTMLElement;
		expect(card).toHaveAttribute("role", "tooltip");
		expect(card.querySelector(".heading")).toHaveTextContent(
			"Anti-Corruption Layer (ACL)",
		);
		expect(card.querySelector("hr")).toBeInTheDocument();
	});

	it("frames an intent's evidence summary the same way", () => {
		const { container } = render(Demo, { variant: "evidence" });
		expect(container.querySelector(".heading")).toHaveTextContent(
			"Catalog BC ↔ Inventory BC",
		);
		expect(
			container.querySelector(".disposition.refactor"),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "ADR-014" })).toBeInTheDocument();
	});
});
