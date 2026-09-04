import type { BoundedContext } from "@open-domain-specification/core";
import { render, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { petstoreModel, referenceModels } from "./fixtures";
import type { Model } from "./model";
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

/**
 * Rendering a reference model's several hundred pages in one `it` took long
 * enough to trip the suite timeout on a loaded machine, so each case renders
 * one bounded context's pages (a few dozen) and one case takes what is left
 * over. "Covers every ref" below is what keeps the split honest: it fails if
 * a ref falls outside every group, so no page can quietly stop being rendered.
 */
describe("every element of the reference organisations renders its own page", () => {
	function expectEveryRefRenders(model: Model, refs: string[]) {
		// An empty group would pass the loop vacuously, so it is a failure.
		expect(refs.length).toBeGreaterThan(0);
		for (const ref of refs) {
			const { container, unmount } = render(Harness, { model, ref });
			expect(container.querySelector("h1")?.textContent?.trim()).toBeTruthy();
			unmount();
		}
	}

	for (const model of referenceModels()) {
		describe(model.workspace.name, () => {
			const refs = pageRefs(model.workspace);
			const contexts = [...model.workspace.boundedcontexts.values()];
			const owns = (context: BoundedContext) => (ref: string) =>
				ref === context.ref || ref.startsWith(`${context.ref}/`);
			const groups: [string, string[]][] = [
				...contexts.map((context): [string, string[]] => [
					context.name,
					refs.filter(owns(context)),
				]),
				[
					"the workspace, its health, teams, domains and relationships",
					refs.filter((ref) => !contexts.some((c) => owns(c)(ref))),
				],
			];

			it("has a large model", () => {
				expect(refs.length).toBeGreaterThan(150);
			});

			it("covers every ref across the cases below, once each", () => {
				expect(groups.flatMap(([, group]) => group).sort()).toEqual(
					[...refs].sort(),
				);
			});

			it.each(groups)("%s renders", (_name, group) => {
				expectEveryRefRenders(model, group);
			});
		});
	}
});
