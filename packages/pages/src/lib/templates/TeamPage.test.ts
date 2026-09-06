import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../evidence/WithModel.harness.svelte";
import { edgeCaseModel, petstoreModel } from "../fixtures";
import TeamPage, { sections } from "./TeamPage.svelte";

describe("TeamPage", () => {
	it("names its two sections for the table of contents", () => {
		expect(sections.map((s) => s.id)).toEqual(["owns", "problem"]);
	});

	it("turns both card grids into tables with the counts as numeric columns", () => {
		const model = petstoreModel();
		const team = [...model.workspace.teams.values()][0];
		const owned = [...model.workspace.boundedcontexts.values()].filter(
			(bc) => bc.team === team,
		);
		const { container } = render(Harness, {
			model,
			component: TeamPage,
			args: { team },
		});

		const title = screen.getByRole("heading", { level: 1 });
		expect(title).toHaveTextContent(team.name);
		expect(title.querySelector(".detail")).toHaveTextContent("Team");

		const owns = container.querySelector("#owns") as HTMLElement;
		expect(
			[...owns.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["Context", "Aggregates", "Services", "Description"]);
		expect(owns.querySelectorAll("tbody tr")).toHaveLength(owned.length);
		expect(owns.querySelector("tbody td.numeric")).toHaveTextContent(
			String(owned[0].aggregates.size),
		);
		expect(owns.querySelector(".count")).toHaveTextContent(
			String(owned.length),
		);
		expect(container.querySelector(".card, .grid")).toBeNull();

		const problem = container.querySelector("#problem") as HTMLElement;
		expect(
			[...problem.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["Subdomain", "Classification", "Description"]);
	});

	it("shows the homepage as an external link only when the team has one", () => {
		const model = petstoreModel();
		const teams = [...model.workspace.teams.values()];
		const withHomepage = teams.find(
			(t) => t.homepage,
		) as (typeof teams)[number];
		const { container } = render(Harness, {
			model,
			component: TeamPage,
			args: { team: withHomepage },
		});
		expect(container.querySelector("dt")).toHaveTextContent("Homepage");
		expect(
			container.querySelector(".codicon-link-external"),
		).toBeInTheDocument();

		const without = teams.find((t) => !t.homepage) as (typeof teams)[number];
		const plain = render(Harness, {
			model,
			component: TeamPage,
			args: { team: without },
		});
		expect(plain.container.querySelector("dl")).toBeNull();
	});

	it("says so when the team owns nothing and reaches no part of the problem space", () => {
		const model = edgeCaseModel();
		const idle = [...model.workspace.teams.values()].find(
			(t) => t.name === "Idle Team",
		);
		render(Harness, { model, component: TeamPage, args: { team: idle } });
		expect(screen.getByText("Owns no bounded context.")).toBeInTheDocument();
		expect(screen.getByText("No subdomains reached.")).toBeInTheDocument();
	});
});
