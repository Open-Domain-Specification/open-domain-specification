import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../evidence/WithModel.harness.svelte";
import { edgeCaseModel, petstoreModel } from "../fixtures";
import { installXyflowTestEnv } from "../xyflow-test-env";
import DomainPage, { sections } from "./DomainPage.svelte";

installXyflowTestEnv();

describe("DomainPage", () => {
	it("names its two sections for the table of contents", () => {
		expect(sections.map((s) => s.id)).toEqual(["subdomains", "contexts"]);
	});

	it("is a title lockup, a badged subdomain table and the context map", () => {
		const model = petstoreModel();
		const domain = [...model.workspace.domains.values()][0];
		const { container } = render(Harness, {
			model,
			component: DomainPage,
			args: { domain },
		});

		const title = screen.getByRole("heading", { level: 1 });
		expect(title).toHaveTextContent(domain.name);
		expect(title.querySelector(".detail")).toHaveTextContent("Domain");
		expect(container.querySelector(".crumbs a")).toHaveTextContent(
			model.workspace.name,
		);

		const subdomains = container.querySelector("#subdomains") as HTMLElement;
		expect(subdomains.querySelector(".count")).toHaveTextContent(
			String(domain.subdomains.size),
		);
		expect(subdomains.querySelectorAll("tbody tr")).toHaveLength(
			domain.subdomains.size,
		);
		// The cards are gone: nothing on the page is a v1 card or grid.
		expect(container.querySelector(".card, .grid")).toBeNull();
		expect(
			container.querySelector("#contexts figure.diagram"),
		).toBeInTheDocument();
	});

	it("says what would fill each section for a domain with nothing in it", () => {
		const model = edgeCaseModel();
		const domain = [...model.workspace.domains.values()].find(
			(d) => d.subdomains.size === 0,
		);
		render(Harness, { model, component: DomainPage, args: { domain } });
		expect(screen.getByText("No subdomains yet.")).toBeInTheDocument();
		expect(
			screen.getByText("No contexts serve this domain yet."),
		).toBeInTheDocument();
	});
});
