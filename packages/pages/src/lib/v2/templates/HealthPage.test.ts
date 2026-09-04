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

	it("heads the page with PageHeader: the trail, the report's name behind the pulse icon, and no lockup", () => {
		const model = petstoreModel();
		const { container } = render(Harness, {
			model,
			component: HealthPage,
			args: {},
		});
		const header = container.querySelector(".page-header") as HTMLElement;
		expect(header.querySelector(".crumbs a")).toHaveTextContent(
			model.workspace.name,
		);
		const title = screen.getByRole("heading", { level: 1 });
		expect(header.contains(title)).toBe(true);
		expect(title).toHaveTextContent("Health");
		expect(title.querySelector(".codicon-pulse")).toBeInTheDocument();
		// A read of the workspace, not an element: no kind, no id, no detail.
		expect(title.querySelector(".lockup, .id, .detail")).toBeNull();
		expect(header.querySelector(".md")).toHaveTextContent(
			/read off the evidence layer/,
		);
		expect(header.querySelector("dl")).toBeNull();
		expect(
			container.querySelector("#report .health-report"),
		).toBeInTheDocument();
	});
});
