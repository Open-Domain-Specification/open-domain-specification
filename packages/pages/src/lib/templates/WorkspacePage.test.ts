import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { edgeCaseModel, emptyWorkspaceModel, petstoreModel } from "../fixtures";
import Harness from "./WorkspacePage.harness.svelte";

describe("WorkspacePage", () => {
	it("renders the workspace with its domains, contexts and teams", async () => {
		const model = petstoreModel();
		render(Harness, { model });
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			model.workspace.name,
		);
		for (const d of model.workspace.domains.values())
			expect(screen.getByRole("link", { name: d.name })).toHaveAttribute(
				"href",
				d.ref,
			);
		for (const t of model.workspace.teams.values())
			expect(screen.getAllByText(t.name).length).toBeGreaterThan(0);
		expect(document.querySelectorAll("section")).toHaveLength(5);
	});

	it("shows the health counts and links to the full report", () => {
		const model = petstoreModel();
		render(Harness, { model });
		const strip = document.querySelector("#evidence-health .summary");
		// Petstore has one shared kernel marked refactor, one tolerated
		// conformist projection, and a comment on every relationship.
		expect(strip?.textContent).toContain("1 to refactor");
		expect(strip?.textContent).toContain("1 tolerated");
		expect(strip?.textContent).toContain("0 with no comments");
		expect(
			screen.getByRole("link", { name: /full health report/ }),
		).toHaveAttribute("href", "#/health");
	});

	it("dims every count and still links out when the workspace has no relationships", () => {
		render(Harness, { model: emptyWorkspaceModel() });
		const zeroes = document.querySelectorAll("#evidence-health .summary .zero");
		expect(zeroes).toHaveLength(3);
		expect(
			screen.getByRole("link", { name: /full health report/ }),
		).toBeInTheDocument();
	});

	it("shows empty states for domains, contexts, teams and health when the workspace has nothing", () => {
		const model = emptyWorkspaceModel();
		render(Harness, { model });
		expect(
			screen.getByText(
				"No domains yet. Start by naming what the business does.",
			),
		).toBeInTheDocument();
		expect(
			screen.getAllByText("No bounded contexts yet.").length,
		).toBeGreaterThan(0);
		expect(screen.getByText("No teams recorded.")).toBeInTheDocument();
		expect(
			screen.getByText(/No structural problems found\./),
		).toBeInTheDocument();
	});

	it("shows structural problems when the workspace has diagnostics", () => {
		const model = edgeCaseModel();
		expect(model.diagnostics.length).toBeGreaterThan(0);
		render(Harness, { model });
		expect(
			screen.getAllByText(
				/aggregate-root|policy-complete|context-serves-subdomain/,
			).length,
		).toBeGreaterThan(0);
	});

	it("shows a team that owns no context and a context that serves none", () => {
		const model = edgeCaseModel();
		render(Harness, { model });
		expect(screen.getAllByText("owns no context").length).toBeGreaterThan(0);
		expect(screen.getAllByText("none").length).toBeGreaterThan(0);
	});
});
