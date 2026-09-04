import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Problems from "./Problems.svelte";

describe("Problems", () => {
	it("draws nothing when there is nothing wrong", () => {
		const { container } = render(Problems, { problems: [] });
		expect(container.querySelector("ul")).toBeNull();
	});

	it("draws one Problems-panel row per diagnostic, in the severity's colour", () => {
		const { container } = render(Problems, {
			problems: [
				{
					severity: "error",
					rule: "aggregate-root",
					message: "Pet has no root entity.",
					ref: "#/boundedcontexts/catalog_bc",
				},
				{
					severity: "warning",
					rule: "relationship-has-no-comments",
					message: "Sales → Inventory has no comments.",
					ref: "#/relationships/sales_inventory",
				},
			],
		});
		expect(container.querySelectorAll("li")).toHaveLength(2);
		expect(container.querySelector(".codicon-error")).toHaveClass("error");
		expect(container.querySelector(".codicon-warning")).toHaveClass("warning");
		// The rule id reads as a token, and the row ends in a link to the element.
		expect(screen.getByText("aggregate-root")).toHaveClass("mono");
		expect(screen.getAllByRole("link", { name: "go to" })[0]).toHaveAttribute(
			"href",
			"#/boundedcontexts/catalog_bc",
		);
	});
});
