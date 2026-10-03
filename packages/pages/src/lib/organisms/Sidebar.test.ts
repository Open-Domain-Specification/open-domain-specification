import { render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { petstoreModel } from "../fixtures";
import Harness from "./Sidebar.harness.svelte";

const rowFor = (container: HTMLElement, ref: string) =>
	container.querySelector(`a[data-ref="${ref}"]`)?.closest(".item");

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
		const link = (ref: string) =>
			container.querySelector(`a[data-ref="${ref}"]`);
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
				a.getAttribute("data-ref"),
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
				a.getAttribute("data-ref"),
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
		expect(container.querySelector(`a[data-ref="${service}"]`)).toHaveAttribute(
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

/**
 * jsdom has no layout, so the sidebar's scroll container is given one: a
 * viewport `height` px tall, the tree's rows 22px apart in document order,
 * each drawn at its place less `scrollTop`. `scrollTo` moves it the way a
 * browser would and records how it was asked.
 */
function mount(
	height: number,
	current: string,
	options: { overflowY?: string; scrollTop?: number } = {},
) {
	const box = document.createElement("div");
	box.style.overflowY = options.overflowY ?? "auto";
	box.scrollTop = options.scrollTop ?? 0;
	document.body.append(box);
	const rect = (top: number, bottom: number) =>
		({ top, bottom, height: bottom - top }) as DOMRect;
	Object.defineProperty(box, "clientHeight", { value: height });
	box.getBoundingClientRect = () => rect(0, height);
	const rowRect = (row: Element) => {
		const i = [...box.querySelectorAll(".item")].indexOf(row);
		return rect(i * 22 - box.scrollTop, (i + 1) * 22 - box.scrollTop);
	};
	const nativeRect = Element.prototype.getBoundingClientRect;
	vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
		function (this: Element) {
			return this.matches(".item") ? rowRect(this) : nativeRect.call(this);
		},
	);
	const scrolls: ScrollToOptions[] = [];
	box.scrollTo = ((scrollTo: ScrollToOptions) => {
		scrolls.push(scrollTo);
		box.scrollTop = scrollTo.top ?? 0;
	}) as typeof box.scrollTo;
	const view = render(Harness, { target: box, props: { current } });
	const visible = (ref: string) => {
		const row = box
			.querySelector(`a[data-ref="${ref}"]`)
			?.closest<HTMLElement>(".item");
		const at = row?.getBoundingClientRect();
		return !!at && at.top >= 0 && at.bottom <= height;
	};
	return { box, scrolls, visible, ...view };
}

const PET = "#/boundedcontexts/catalog_bc/aggregates/pet";
const PET_ENTITY = `${PET}/entities/pet`;
const CATALOG = "#/boundedcontexts/catalog_bc";
const SALES = "#/boundedcontexts/sales_bc";

describe("Sidebar keeps the current row in view", () => {
	afterEach(() => {
		Reflect.deleteProperty(window, "matchMedia");
		document.body.replaceChildren();
	});
	const motion = (reduce: boolean) =>
		Object.defineProperty(window, "matchMedia", {
			configurable: true,
			value: () => ({ matches: reduce }),
		});

	it("scrolls the sidebar by the least that shows a current row below the fold, and eases there", () => {
		motion(false);
		const view = mount(66, PET);
		expect(view.visible(PET)).toBe(true);
		const row = view.container.querySelector(`a[data-ref="${PET}"]`);
		expect(row).toHaveAttribute("aria-current", "page");
		expect(view.scrolls).toHaveLength(1);
		expect(view.scrolls[0].behavior).toBe("smooth");
		// Nearest: the row's bottom meets the viewport's bottom, no further.
		const at = row?.closest(".item")?.getBoundingClientRect();
		expect(at?.bottom).toBe(66);
	});

	it("shows the deepest row on the path when the page has no row, and marks no ancestor current", () => {
		motion(false);
		const view = mount(66, PET_ENTITY);
		expect(view.container.querySelector("[aria-current]")).toBeNull();
		expect(view.visible(PET)).toBe(true);
		expect(view.scrolls).toHaveLength(1);
		const deepest = view.container
			.querySelector(`a[data-ref="${PET}"]`)
			?.closest(".item")
			?.getBoundingClientRect();
		expect(deepest?.bottom).toBe(66);
	});

	it("leaves a row that is already inside the viewport where it is", () => {
		motion(false);
		const view = mount(2000, PET);
		expect(view.scrolls).toEqual([]);
		expect(view.box.scrollTop).toBe(0);
	});

	it("scrolls back up to a current row above the viewport, to its top edge", () => {
		motion(false);
		const view = mount(66, CATALOG, { scrollTop: 500 });
		expect(view.visible(CATALOG)).toBe(true);
		expect(view.scrolls).toHaveLength(1);
		expect(view.box.scrollTop).toBe(
			[...view.box.querySelectorAll(".item")].indexOf(
				view.container
					.querySelector(`a[data-ref="${CATALOG}"]`)
					?.closest(".item") as Element,
			) * 22,
		);
	});

	it("moves at once, not smoothly, for a reader who asked for less motion", () => {
		motion(true);
		const view = mount(66, PET);
		expect(view.scrolls).toHaveLength(1);
		expect(view.scrolls[0].behavior).toBe("auto");
	});

	it("follows the reader to the next page, scrolling again to that row", async () => {
		motion(false);
		const view = mount(66, PET);
		const first = view.box.scrollTop;
		await view.rerender({ current: SALES });
		expect(view.scrolls).toHaveLength(2);
		expect(view.visible(SALES)).toBe(true);
		expect(view.box.scrollTop).not.toBe(first);
		await view.rerender({ current: CATALOG });
		expect(view.scrolls).toHaveLength(3);
		expect(view.visible(CATALOG)).toBe(true);
	});

	it("scrolls nothing when no row is on the path, such as the workspace", () => {
		motion(false);
		const view = mount(66, "#");
		expect(view.scrolls).toEqual([]);
	});

	it("scrolls a container that is set to scroll as well as one that is set to auto", () => {
		motion(false);
		const view = mount(66, PET, { overflowY: "scroll" });
		expect(view.visible(PET)).toBe(true);
	});

	it("does nothing when no ancestor scrolls, as in the page's own flow", () => {
		motion(false);
		const view = mount(66, PET, { overflowY: "visible" });
		expect(view.scrolls).toEqual([]);
		expect(
			view.container.querySelector(`a[data-ref="${PET}"]`),
		).toHaveAttribute("aria-current", "page");
	});

	it("moves neither focus nor the document", () => {
		motion(false);
		const outside = document.createElement("button");
		document.body.append(outside);
		outside.focus();
		const intoView = vi.fn();
		Element.prototype.scrollIntoView = intoView;
		const windowScroll = vi
			.spyOn(window, "scrollTo")
			.mockImplementation(() => {});
		const view = mount(66, PET);
		expect(view.scrolls).toHaveLength(1);
		expect(document.activeElement).toBe(outside);
		expect(intoView).not.toHaveBeenCalled();
		expect(windowScroll).not.toHaveBeenCalled();
		expect(document.documentElement.scrollTop).toBe(0);
		Reflect.deleteProperty(Element.prototype, "scrollIntoView");
	});

	it("keeps exactly one aria-current link, on the page being read, while scrolling", () => {
		motion(false);
		const view = mount(66, PET);
		expect(view.container.querySelectorAll("[aria-current]")).toHaveLength(1);
		expect(
			view.container.querySelector(`a[data-ref="${CATALOG}"]`),
		).not.toHaveAttribute("aria-current");
	});
});
