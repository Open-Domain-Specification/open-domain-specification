import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../../evidence/WithModel.harness.svelte";
import { petstoreModel } from "../../fixtures";
import HealthPage, { sections } from "./HealthPage.svelte";

describe("v2 HealthPage", () => {
	it("points the table of contents at the report's three headings", () => {
		expect(sections.map((s) => s.id)).toEqual([
			"refactor",
			"tolerated",
			"no-comments",
		]);
	});

	it("is a read of the workspace, so its title is the report's name and not a lockup", () => {
		const model = petstoreModel();
		const { container } = render(Harness, {
			model,
			component: HealthPage,
			args: {},
		});
		expect(container.querySelector(".crumbs a")).toHaveTextContent(
			model.workspace.name,
		);
		const title = screen.getByRole("heading", { level: 1 });
		expect(title).toHaveTextContent("Health");
		expect(title.querySelector(".codicon-pulse")).toBeInTheDocument();
		expect(title.querySelector(".lockup")).toBeNull();
		expect(container.querySelector("#report .health-report")).toBeInTheDocument();
	});
});
