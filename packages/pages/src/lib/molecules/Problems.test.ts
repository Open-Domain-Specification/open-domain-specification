import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Problems from "./Problems.svelte";

describe("Problems", () => {
	it("renders nothing when there are no problems", () => {
		const { container } = render(Problems, { problems: [] });
		expect(container.querySelector("ul")).toBeNull();
	});

	it("lists each diagnostic with its severity, rule and a link to the element", () => {
		render(Problems, {
			problems: [
				{
					severity: "warning",
					rule: "aggregate-root",
					message: "Aggregate has no root entity",
					ref: "#/boundedcontexts/x/aggregates/y",
				},
			],
		});
		expect(screen.getByText("aggregate-root")).toBeInTheDocument();
		expect(
			screen.getByText(/Aggregate has no root entity/),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "go to" })).toHaveAttribute(
			"href",
			"#/boundedcontexts/x/aggregates/y",
		);
	});

	it("copes with a diagnostic that has no message text", () => {
		const { container } = render(Problems, {
			problems: [
				{
					severity: "warning",
					rule: "aggregate-root",
					message: undefined as unknown as string,
					ref: "#/x",
				},
			],
		});
		expect(container.querySelector("li")).toBeInTheDocument();
	});
});
