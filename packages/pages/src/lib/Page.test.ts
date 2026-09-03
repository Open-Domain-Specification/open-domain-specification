import { render, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { petstoreModel, referenceModels } from "./fixtures";
import Harness from "./Page.harness.svelte";
import { pageRefs } from "./resolve";

const model = petstoreModel();

describe("every element of the petstore renders its own page", () => {
	const refs = pageRefs(model.workspace);
	it("covers more than the container pages", () => {
		expect(refs.length).toBeGreaterThan(40);
	});
	for (const ref of refs) {
		it(ref, async () => {
			const { container, unmount } = render(Harness, { model, ref });
			const h1 = container.querySelector("h1");
			expect(h1?.textContent?.trim()).toBeTruthy();
			expect(container.querySelectorAll("section").length).toBeGreaterThan(0);
			expect(container.querySelectorAll(".toc li").length).toBeGreaterThan(0);
			unmount();
		});
	}
});

describe("a ref pointing inside a page scrolls to and flashes the target", () => {
	it("finds the element inside the owning page and flashes it", async () => {
		Element.prototype.scrollIntoView = vi.fn();
		const bc = [...model.workspace.boundedcontexts.values()][0];
		const aggregate = [...bc.aggregates.values()][0];
		const entity = [...aggregate.entities.values()][0];
		const attribute = [...entity.attributes.values()][0];

		const { container, unmount } = render(Harness, {
			model,
			ref: attribute.ref,
		});

		await waitFor(() => {
			const row = container.querySelector(`[id="${attribute.ref}"]`);
			expect(row).toHaveClass("flash");
		});
		expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
		unmount();
	});

	it("does nothing when the ref points at nothing inside the page", async () => {
		Element.prototype.scrollIntoView = vi.fn();
		const bc = [...model.workspace.boundedcontexts.values()][0];
		const { container, unmount } = render(Harness, {
			model,
			ref: `${bc.ref}/does-not-exist`,
		});
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(container.querySelector(".flash")).toBeNull();
		unmount();
	});
});

describe("every element of the reference organisations renders its own page", () => {
	for (const model of referenceModels()) {
		const refs = pageRefs(model.workspace);
		it(`${model.workspace.name} has a large model`, () => {
			expect(refs.length).toBeGreaterThan(150);
		});
		it(`${model.workspace.name}: every ref renders`, () => {
			for (const ref of refs) {
				const { container, unmount } = render(Harness, { model, ref });
				expect(container.querySelector("h1")?.textContent?.trim()).toBeTruthy();
				unmount();
			}
		});
	}
});
