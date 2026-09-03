import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { emptyWorkspaceModel, petstoreModel } from "../fixtures";
import Harness from "../Page.harness.svelte";
import { HEALTH_PAGE, HEALTH_REF, pageRefs, resolvePage } from "../resolve";
import { sections } from "./HealthPage.svelte";

const model = petstoreModel();

describe("the health route", () => {
	it("resolves to the health page rather than falling back to the workspace", () => {
		expect(resolvePage(model.workspace, HEALTH_REF)).toEqual({
			target: HEALTH_PAGE,
			pageRef: HEALTH_REF,
		});
	});

	it("is one of the workspace's pages, so every host that walks them finds it", () => {
		expect(pageRefs(model.workspace)).toContain(HEALTH_REF);
	});

	it("is not shadowed by a bounded context or a relationship pattern", () => {
		expect(resolvePage(model.workspace, "#/healthy").pageRef).toBe("#");
		expect(resolvePage(model.workspace, "#/health/extra").pageRef).toBe("#");
	});
});

describe("HealthPage", () => {
	it("renders the whole report under its own heading", () => {
		render(Harness, { model, ref: HEALTH_REF });
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Health",
		);
		expect(
			screen.getByText(/The kernel has grown past the status enum/),
		).toBeInTheDocument();
		expect(
			screen.getByText(/The projection conforms to the Sales order events/),
		).toBeInTheDocument();
	});

	it("gives the table of contents the report's own three headings", () => {
		const { container } = render(Harness, { model, ref: HEALTH_REF });
		expect(sections.map((s) => s.id)).toEqual([
			"refactor",
			"tolerated",
			"no-comments",
		]);
		for (const section of sections)
			expect(container.querySelector(`#${section.id}`)).not.toBeNull();
		expect(container.querySelectorAll(".toc li")).toHaveLength(3);
	});

	it("crumbs back to the workspace it reports on", () => {
		render(Harness, { model, ref: HEALTH_REF });
		expect(
			screen.getByRole("link", { name: model.workspace.name }),
		).toHaveAttribute("href", "#");
	});

	it("renders its empty states for a workspace with nothing in it", () => {
		render(Harness, { model: emptyWorkspaceModel(), ref: HEALTH_REF });
		expect(
			screen.getByText("Nothing is marked for refactoring."),
		).toBeInTheDocument();
		expect(screen.getByText("No compromises recorded.")).toBeInTheDocument();
	});
});
