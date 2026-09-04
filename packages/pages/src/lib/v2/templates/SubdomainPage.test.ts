import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../../evidence/WithModel.harness.svelte";
import { edgeCaseModel, petstoreModel } from "../../fixtures";
import { installXyflowTestEnv } from "../../xyflow-test-env";
import SubdomainPage, { sections } from "./SubdomainPage.svelte";

installXyflowTestEnv();

describe("v2 SubdomainPage", () => {
	it("drops v1's empty Classification section from the table of contents", () => {
		expect(sections.map((s) => s.id)).toEqual(["serving", "map"]);
	});

	it("carries the classification as a keyword under the title and one definition in the header", () => {
		const model = petstoreModel();
		const domain = [...model.workspace.domains.values()][0];
		const subdomain = [...domain.subdomains.values()][0];
		const { container } = render(Harness, {
			model,
			component: SubdomainPage,
			args: { subdomain },
		});

		expect(container.querySelectorAll(".crumbs a")).toHaveLength(2);
		expect(container.querySelector(".meta")).toHaveTextContent(subdomain.type);
		const term = container.querySelector("dt") as HTMLElement;
		expect(term).toHaveTextContent("Classification");
		expect(container.querySelector("dd")?.textContent).toContain("Core");
		expect(container.querySelector("#classification")).toBeNull();

		const serving = container.querySelector("#serving") as HTMLElement;
		expect(
			[...serving.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["Context", "Team", "Description"]);
		expect(serving.querySelectorAll("tbody tr")).toHaveLength(
			subdomain.boundedcontexts.size,
		);
		expect(container.querySelector("#map figure.diagram")).toBeInTheDocument();
	});

	it("falls back to the raw word for a classification outside the three, and says when nothing serves it", () => {
		const model = edgeCaseModel();
		const subdomain = [...model.workspace.domains.values()]
			.flatMap((d) => [...d.subdomains.values()])
			.find((s) => s.boundedcontexts.size === 0);
		const { container } = render(Harness, {
			model,
			component: SubdomainPage,
			args: { subdomain },
		});
		expect(container.querySelector("dd")).toHaveTextContent("unclassified");
		expect(
			screen.getAllByText("No bounded context serves this subdomain yet."),
		).toHaveLength(2);
	});

	it("names the team, or says nobody owns the context serving it", () => {
		const model = edgeCaseModel();
		const subdomain = [...model.workspace.domains.values()]
			.flatMap((d) => [...d.subdomains.values()])
			.find((s) => s.boundedcontexts.size > 0);
		render(Harness, { model, component: SubdomainPage, args: { subdomain } });
		expect(screen.getByRole("link", { name: "Busy Team" })).toBeInTheDocument();
	});
});
