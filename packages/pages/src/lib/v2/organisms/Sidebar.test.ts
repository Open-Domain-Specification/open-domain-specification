import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../../fixtures";
import Harness from "./Sidebar.harness.svelte";

const rowFor = (container: HTMLElement, ref: string) =>
	container.querySelector(`a[href="${ref}"]`)?.closest(".item");

describe("Sidebar", () => {
	it("lists domains with their subdomains, contexts with their aggregates and services, and teams", () => {
		const model = petstoreModel();
		const { container } = render(Harness, { model, current: "#" });

		for (const d of model.workspace.domains.values()) {
			expect(rowFor(container, d.ref)).toBeTruthy();
			for (const s of d.subdomains.values())
				expect(rowFor(container, s.ref)).toBeTruthy();
		}
		for (const bc of model.workspace.boundedcontexts.values()) {
			expect(rowFor(container, bc.ref)).toBeTruthy();
			for (const a of bc.aggregates.values())
				expect(rowFor(container, a.ref)).toBeTruthy();
			for (const s of bc.services.values())
				expect(rowFor(container, s.ref)).toBeTruthy();
		}
		for (const t of model.workspace.teams.values())
			expect(rowFor(container, t.ref)).toBeTruthy();
	});

	it("gives every row its kind's codicon and the brand line body text, not tracked capitals", () => {
		const { container } = render(Harness);
		const brand = container.querySelector(".brand") as HTMLElement;
		expect(brand).toHaveTextContent("Swagger Petstore (v3)");
		expect(brand.querySelector("svg.logo")).not.toBeNull();
		expect(container.querySelector(".toc-title")).toBeNull();

		expect(
			rowFor(container, "#/boundedcontexts/catalog_bc")?.querySelector(
				".codicon-symbol-class",
			),
		).not.toBeNull();
		expect(
			rowFor(
				container,
				"#/boundedcontexts/catalog_bc/aggregates/pet",
			)?.querySelector(".codicon-symbol-structure"),
		).not.toBeNull();
	});

	it("marks the selected row and its ancestor, and leaves the rest at rest", () => {
		const { container } = render(Harness);
		expect(
			rowFor(container, "#/boundedcontexts/catalog_bc/aggregates/pet"),
		).toHaveClass("active");
		expect(rowFor(container, "#/boundedcontexts/catalog_bc")).toHaveClass(
			"active",
		);
		expect(rowFor(container, "#/boundedcontexts/sales_bc")).not.toHaveClass(
			"active",
		);
	});
});
