import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Section from "./Section.svelte";

const children = createRawSnippet(() => ({
	render: () => "<p>The section's own content.</p>",
}));

describe("Section", () => {
	it("is a level-2 heading with its lead, anchored by its id, with no count badge by default", () => {
		const { container } = render(Section, {
			id: "model",
			title: "Model",
			lead: "Aggregates are the consistency boundaries.",
			children,
		});
		expect(container.querySelector("section")).toHaveAttribute("id", "model");
		expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
			"Model",
		);
		expect(screen.getByText(/consistency boundaries/)).toHaveClass("lead");
		expect(container.querySelector(".count")).toBeNull();
		expect(container.querySelector(".problems")).toBeNull();
		expect(screen.getByText("The section's own content.")).toBeInTheDocument();
	});

	it("badges the number of things it lists and shows the diagnostics about them", () => {
		const { container } = render(Section, {
			id: "position",
			title: "Strategic position",
			lead: "Who this context depends on.",
			count: 3,
			problems: [
				{
					severity: "warning",
					rule: "relationship-has-no-comments",
					message: "No comments.",
					ref: "#/relationships/a_b",
				},
			],
			children,
		});
		expect(container.querySelector(".count")).toHaveTextContent("3");
		expect(container.querySelectorAll(".problems li")).toHaveLength(1);
	});

	it("stays on the page when it lists nothing, with no badge, so the empty sentence carries the zero", () => {
		const { container } = render(Section, {
			id: "behaviour",
			title: "Policies",
			lead: "Reactions: when these events happen, issue these operations.",
			count: 0,
			children,
		});
		expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
			"Policies",
		);
		expect(container.querySelector(".count")).toBeNull();
	});
});
