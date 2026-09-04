import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../../evidence/WithModel.harness.svelte";
import {
	edgeCaseModel,
	emptyWorkspaceModel,
	petstoreModel,
} from "../../fixtures";
import { installXyflowTestEnv } from "../../xyflow-test-env";
import WorkspacePage, { sections } from "./WorkspacePage.svelte";

installXyflowTestEnv();

const page = (model: ReturnType<typeof petstoreModel>) =>
	render(Harness, { model, component: WorkspacePage, args: {} });

describe("v2 WorkspacePage", () => {
	it("folds v1's two health sections into one for the table of contents", () => {
		expect(sections.map((s) => s.id)).toEqual([
			"problem",
			"solution",
			"teams",
			"health",
		]);
	});

	it("turns the version and file chips into two definitions under the title", () => {
		const model = petstoreModel();
		const { container } = page(model);
		const header = container.querySelector(".page-header") as HTMLElement;
		expect([...header.querySelectorAll("dt")].map((dt) => dt.textContent)).toEqual(
			["Version", "File"],
		);
		expect(header.querySelector("dd")).toHaveTextContent(
			model.workspace.version,
		);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			model.workspace.name,
		);
		expect(container.querySelector(".chip, .pill, .card")).toBeNull();
	});

	it("gives each domain its own subsection and subdomain table", () => {
		const model = petstoreModel();
		const { container } = page(model);
		const problem = container.querySelector("#problem") as HTMLElement;
		const domains = [...model.workspace.domains.values()];
		expect(problem.querySelectorAll("h3")).toHaveLength(domains.length);
		expect(problem.querySelectorAll("table")).toHaveLength(domains.length);
		expect(problem.querySelector(".count")).toHaveTextContent(
			String(domains.length),
		);
	});

	it("lists contexts and teams as tables, with the counts as numeric columns", () => {
		const model = petstoreModel();
		const { container } = page(model);
		const solution = container.querySelector("#solution") as HTMLElement;
		expect(
			[...solution.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["Context", "Serves", "Team", "Aggregates", "Services"]);
		expect(solution.querySelector("figure.diagram")).toBeInTheDocument();
		expect(solution.querySelector("td.numeric")).toBeInTheDocument();

		const teams = container.querySelector("#teams") as HTMLElement;
		expect(
			[...teams.querySelectorAll("thead th")].map((th) => th.textContent?.trim()),
		).toEqual(["Team", "Owns", "Description"]);
	});

	it("reads the structural problems and the evidence health in one section", () => {
		const model = petstoreModel();
		const { container } = page(model);
		const health = container.querySelector("#health") as HTMLElement;
		expect(health.querySelector(".health-report")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Open the full health report/ }),
		).toHaveAttribute("href", "#/health");
	});

	it("says the good news in the icon colour rather than in green", () => {
		const { container } = page(edgeCaseModel());
		const problems = container.querySelectorAll("#health .problems li");
		expect(problems.length).toBeGreaterThan(0);

		// A workspace with nothing in it has nothing to complain about.
		const empty = page(emptyWorkspaceModel());
		const ok = empty.container.querySelector(".ok") as HTMLElement;
		expect(ok).toHaveTextContent("No structural problems found.");
		expect(ok.querySelector(".codicon-pass")).toBeInTheDocument();
	});

	it("says what would fill each section of an empty workspace", () => {
		page(emptyWorkspaceModel());
		expect(
			screen.getByText("No domains yet. Start by naming what the business does."),
		).toBeInTheDocument();
		expect(screen.getAllByText("No bounded contexts yet.").length).toBe(2);
		expect(screen.getByText("No teams recorded.")).toBeInTheDocument();
	});

	it("names a context that serves no subdomain and a team that owns nothing", () => {
		const { container } = page(edgeCaseModel());
		expect(screen.getAllByText("none").length).toBeGreaterThan(0);
		expect(screen.getByText("owns no context")).toHaveClass("keyword");
		expect(container.querySelector("#teams")).toHaveTextContent("Idle Team");
	});
});
