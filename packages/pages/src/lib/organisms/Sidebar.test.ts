import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
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

	it("names itself as a navigation landmark", () => {
		const { container } = render(Harness);
		expect(container.querySelector("nav.tree")).toHaveAttribute(
			"aria-label",
			"Workspace elements",
		);
	});

	it("marks exactly one link aria-current=page, the page being read, and no ancestor or other row", () => {
		const { container } = render(Harness);
		const link = (ref: string) => container.querySelector(`a[href="${ref}"]`);
		expect(link("#/boundedcontexts/catalog_bc/aggregates/pet")).toHaveAttribute(
			"aria-current",
			"page",
		);
		expect(link("#/boundedcontexts/catalog_bc")).not.toHaveAttribute(
			"aria-current",
		);
		expect(link("#/boundedcontexts/sales_bc")).not.toHaveAttribute(
			"aria-current",
		);
		expect(container.querySelectorAll("[aria-current]")).toHaveLength(1);
	});

	it("still draws the wash on the ancestor row, apart from which link is current", () => {
		const { container } = render(Harness);
		expect(
			[...container.querySelectorAll(".item.active a")].map((a) =>
				a.getAttribute("href"),
			),
		).toEqual([
			"#/boundedcontexts/catalog_bc",
			"#/boundedcontexts/catalog_bc/aggregates/pet",
		]);
	});

	it("marks nothing on a dedicated page the tree has no row for, and keeps the wash on its ancestors", () => {
		const { container } = render(Harness, {
			current: "#/boundedcontexts/catalog_bc/aggregates/pet/entities/pet",
		});
		expect(container.querySelector("[aria-current]")).toBeNull();
		expect(
			[...container.querySelectorAll(".item.active a")].map((a) =>
				a.getAttribute("href"),
			),
		).toEqual([
			"#/boundedcontexts/catalog_bc",
			"#/boundedcontexts/catalog_bc/aggregates/pet",
		]);
	});

	it("marks the owning page's row when the ref is an anchor inside a page that has one", () => {
		const service = "#/boundedcontexts/catalog_bc/services/pet_app";
		const { container } = render(Harness, {
			current: `${service}/consumes/boundedcontexts~catalog_bc~aggregates~pet~provides~reserve_pet`,
		});
		expect(container.querySelectorAll("[aria-current]")).toHaveLength(1);
		expect(container.querySelector(`a[href="${service}"]`)).toHaveAttribute(
			"aria-current",
			"page",
		);
	});

	it("marks nothing when the current page has no row, such as the workspace or the health report", () => {
		for (const current of ["#", "#/health"]) {
			const { container, unmount } = render(Harness, { current });
			expect(container.querySelector("[aria-current]")).toBeNull();
			expect(container.querySelector(".item.active")).toBeNull();
			unmount();
		}
	});

	it("does not treat a ref that merely starts with another's name as under it", () => {
		const { container } = render(Harness, {
			current: "#/boundedcontexts/catalog_bc_extra",
		});
		expect(container.querySelector("[aria-current]")).toBeNull();
	});
});
