import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Demo from "./PageHeader.harness.svelte";

describe("PageHeader", () => {
	it("puts nothing in the h1 but the title lockup, with the id and the kind word as its detail", () => {
		const { container } = render(Demo);
		const h1 = screen.getByRole("heading", { level: 1 });
		const lockup = h1.querySelector(".lockup") as HTMLElement;
		expect(lockup).toHaveClass("title");
		expect(h1.children).toHaveLength(1);
		expect(lockup.querySelector(".codicon-symbol-structure")).not.toBeNull();
		expect(lockup.querySelector(".name")).toHaveTextContent("Pet");
		// The v1 bordered id pill and the uppercase kind eyebrow are one detail line now.
		expect(lockup.querySelector(".id")).toHaveTextContent("pet");
		expect(lockup.querySelector(".detail")).toHaveTextContent("Aggregate");
		expect(container.querySelector(".crumbs .kind")).toBeNull();
	});

	it("draws the crumbs as links with a secondary separator between them", () => {
		const { container } = render(Demo);
		const crumbs = container.querySelector(".crumbs") as HTMLElement;
		const links = crumbs.querySelectorAll("a");
		expect([...links].map((a) => a.textContent)).toEqual([
			"Swagger Petstore (v3)",
			"Catalog BC",
		]);
		expect(links[1]).toHaveAttribute("href", "#/boundedcontexts/catalog_bc");
		// One separator, between the two crumbs, not after the last.
		const seps = crumbs.querySelectorAll(".sep");
		expect(seps).toHaveLength(1);
		expect(seps[0]).toHaveTextContent("›");
	});

	it("renders the meta keywords on their own line and the facts as a definition list", () => {
		const { container } = render(Demo);
		const meta = container.querySelector(".meta") as HTMLElement;
		expect(meta.querySelector(".keyword")).toHaveTextContent("big ball of mud");
		expect(meta.querySelector(".keyword")).toHaveClass("warn");

		const terms = [...container.querySelectorAll("dt")].map(
			(dt) => dt.textContent,
		);
		expect(terms).toEqual(["Root", "Context"]);
		expect(container.querySelector("dd a")).toHaveAttribute(
			"href",
			"#/boundedcontexts/catalog_bc/aggregates/pet/entities/pet",
		);
		expect(container.querySelector(".description .md")).toHaveTextContent(
			/A pet listed in the store/,
		);
	});

	it("drops the crumbs, the meta line, the description and the facts when there are none, and falls back to the kind itself", () => {
		const { container } = render(Demo, { bare: true });
		expect(container.querySelector(".crumbs")).toBeNull();
		expect(container.querySelector(".meta")).toBeNull();
		expect(container.querySelector(".md")).toBeNull();
		expect(container.querySelector("dl")).toBeNull();
		expect(container.querySelector(".detail")).toHaveTextContent("workspace");
	});
});
