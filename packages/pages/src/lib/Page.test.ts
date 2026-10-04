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

describe("arriving moves focus", () => {
	const context = [...model.workspace.boundedcontexts.values()][0];

	it("leaves focus alone on the first render", async () => {
		const { unmount } = render(Harness, { model, ref: context.ref });
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.activeElement).toBe(document.body);
		unmount();
	});

	it("puts focus on the page's heading when the count of arrivals goes up, and not before", async () => {
		const { container, rerender, unmount } = render(Harness, {
			model,
			ref: context.ref,
		});
		await rerender({ model, ref: context.ref, arrivals: 0 });
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.activeElement).toBe(document.body);

		await rerender({ model, ref: context.ref, arrivals: 1 });
		await waitFor(() =>
			expect(document.activeElement).toBe(container.querySelector("main h1")),
		);
		expect(document.activeElement).toHaveAttribute("tabindex", "-1");
		unmount();
	});

	it("lands on the new page's heading when the arrival changes the page", async () => {
		const other = [...model.workspace.teams.values()][0];
		const { container, rerender, unmount } = render(Harness, {
			model,
			ref: context.ref,
		});
		await rerender({ model, ref: other.ref, arrivals: 1 });
		await waitFor(() =>
			expect(document.activeElement).toBe(container.querySelector("main h1")),
		);
		expect(document.activeElement).toHaveTextContent(other.name);
		unmount();
	});

	it("lands on the anchored element when the ref points inside the page", async () => {
		Element.prototype.scrollIntoView = vi.fn();
		const aggregate = [...context.aggregates.values()][0];
		const entity = [...aggregate.entities.values()][0];
		const attribute = [...entity.attributes.values()][0];
		const { container, rerender, unmount } = render(Harness, {
			model,
			ref: aggregate.ref,
		});
		await rerender({ model, ref: attribute.ref, arrivals: 1 });
		await waitFor(() =>
			expect(document.activeElement).toBe(
				container.querySelector(`[id="${attribute.ref}"]`),
			),
		);
		unmount();
	});
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

	it("lands on the consumer's page at the consumption's row", async () => {
		Element.prototype.scrollIntoView = vi.fn();
		// A consumption has no page of its own (decision 26): its ref resolves
		// to the consumer, and the row it names flashes like any other leaf.
		const consumption = [...model.workspace.boundedcontexts.values()]
			.flatMap((bc) => [...bc.services.values(), ...bc.aggregates.values()])
			.flatMap((member) => member.consumptions)[0];

		const { container, unmount } = render(Harness, {
			model,
			ref: consumption.ref,
		});

		expect(container.querySelector("h1")?.textContent).toContain(
			consumption.consumer.name,
		);
		await waitFor(() => {
			expect(container.querySelector(`[id="${consumption.ref}"]`)).toHaveClass(
				"flash",
			);
		});
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
	async function expectEveryRefRenders(model: Model, refs: string[]) {
		// An empty group would pass the loop vacuously, so it is a failure.
		expect(refs.length).toBeGreaterThan(0);
		for (const ref of refs) {
			const { container, unmount } = render(Harness, { model, ref });
			expect(container.querySelector("h1")?.textContent?.trim()).toBeTruthy();
			unmount();
			// Measured locally under coverage, this loop otherwise ran one ~22 s
			// synchronous stretch with no event-loop turn, so the worker could not
			// answer its pool's IPC. Yielding a macrotask after each page lets it.
			// This is not a proven cause of any CI timeout.
			await new Promise((resolve) => setTimeout(resolve, 0));
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

			it.each(groups)("%s renders", async (_name, group) => {
				await expectEveryRefRenders(model, group);
			});
		});
	}
});
