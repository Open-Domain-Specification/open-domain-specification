import type { BoundedContext } from "@open-domain-specification/core";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../../evidence/WithModel.harness.svelte";
import { edgeCaseModel, petstoreModel, petstoreSales } from "../../fixtures";
import { installXyflowTestEnv } from "../../xyflow-test-env";
import ContextPage, { sections } from "./ContextPage.svelte";

installXyflowTestEnv();

const page = (
	model: ReturnType<typeof petstoreModel>,
	context: BoundedContext,
) => render(Harness, { model, component: ContextPage, args: { context } });

describe("v2 ContextPage", () => {
	it("names its six sections for the table of contents", () => {
		expect(sections.map((s) => s.id)).toEqual([
			"position",
			"model",
			"integration",
			"behaviour",
			"schemas",
			"language",
		]);
	});

	it("heads the page with the lockup, the subdomains it serves and its team, and no chips", () => {
		const { model, context } = petstoreSales();
		const { container } = page(model, context);
		const title = screen.getByRole("heading", { level: 1 });
		expect(title.querySelector(".detail")).toHaveTextContent("Bounded context");
		// The header's own facts; the expanded relationship rows below have
		// definition lists of their own.
		const header = container.querySelector(".page-header") as HTMLElement;
		expect(
			[...header.querySelectorAll("dt")].map((dt) => dt.textContent),
		).toEqual(["Serves", "Owned by"]);
		expect(container.querySelector(".chip, .pill")).toBeNull();
	});

	it("replaces the aggregate cards with one table whose counts are numeric columns", () => {
		const { model, context } = petstoreSales();
		const { container } = page(model, context);
		const modelSection = container.querySelector("#model") as HTMLElement;
		expect(
			[...modelSection.querySelectorAll("table")[0].querySelectorAll("th")].map(
				(th) => th.textContent?.trim(),
			),
		).toEqual([
			"Aggregate",
			"Root",
			"Entities",
			"Value objects",
			"Invariants",
			"Operations",
			"Events",
			"Description",
		]);
		expect(modelSection.querySelectorAll("td.numeric").length).toBeGreaterThan(
			0,
		);
		expect(container.querySelector(".card, .grid")).toBeNull();
	});

	it("lists the integration surface, the policies and the language as tables", () => {
		const { model, context } = petstoreSales();
		const { container } = page(model, context);
		const integration = container.querySelector("#integration") as HTMLElement;
		expect(integration.querySelectorAll("table")).toHaveLength(2);
		expect(integration.querySelector("figure.diagram")).toBeInTheDocument();

		const language = container.querySelector("#language") as HTMLElement;
		expect(
			[...language.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["Term", "Definition", "Also", "Embodied by"]);
	});

	it("makes each schema a subsection with its attribute table, naming what carries it", () => {
		const { model, context } = petstoreSales();
		const { container } = page(model, context);
		const schemas = container.querySelector("#schemas") as HTMLElement;
		expect(schemas.querySelector(".carried")).toHaveTextContent("carried by");
		expect(schemas.querySelectorAll("h3").length).toBeGreaterThan(0);
		expect(schemas.querySelector("table")).toBeInTheDocument();
	});

	it("says what would fill every empty branch of a context with almost nothing in it", () => {
		const model = edgeCaseModel();
		const thin = model.workspace.boundedcontexts.get(
			"thin_context",
		) as BoundedContext;
		const { container } = page(model, thin);
		expect(screen.getByText("No aggregates yet.")).toBeInTheDocument();
		// The Services subsection stays on the page when there are none, its
		// heading unbadged: the shape of the model is the information.
		const services = [...container.querySelectorAll("#model h3")].find((h) =>
			h.textContent?.includes("Services"),
		) as HTMLElement;
		expect(services).toBeInTheDocument();
		expect(services.querySelector(".count")).toBeNull();
		expect(screen.getByText("No services.")).toBeInTheDocument();
		expect(screen.getByText("Provides nothing.")).toBeInTheDocument();
		expect(
			screen.getByText("Depends on nothing outside itself."),
		).toBeInTheDocument();
		expect(screen.getByText("No policies.")).toBeInTheDocument();
		expect(
			screen.getByText("No schemas. Consumables carry no declared payload."),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"No glossary yet. Naming things is the first act of modelling.",
			),
		).toBeInTheDocument();
		// No subdomain and no team is two plain words, not two empty cells.
		expect(screen.getByText("no subdomain")).toHaveClass("keyword");
		expect(screen.getByText("no owning team")).toHaveClass("keyword");
	});

	it("warns on an aggregate with no root, an unused schema, an unmodelled term and a policy that fires on nothing", () => {
		const model = edgeCaseModel();
		const main = model.workspace.boundedcontexts.get(
			"main_context",
		) as BoundedContext;
		const { container } = page(model, main);
		expect(screen.getAllByText("no root")[0]).toHaveClass("warn");
		expect(screen.getByText("unused")).toHaveClass("keyword");
		expect(screen.getAllByText("not modelled").length).toBeGreaterThan(0);
		expect(screen.getAllByText("nothing").length).toBe(2);
		expect(
			screen.getByText("The schema has no attributes."),
		).toBeInTheDocument();
		// A term with no alias says so rather than leaving the cell blank.
		expect(container.querySelector("#language")).toHaveTextContent("–");
	});

	it("marks a big ball of mud after the title", () => {
		const model = petstoreModel();
		const mud = [...model.workspace.boundedcontexts.values()].find(
			(bc) => bc.bigBallOfMud,
		) as BoundedContext;
		const { container } = page(model, mud);
		expect(container.querySelector(".meta .keyword")).toHaveClass("warn");
	});
});
