import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "./Page.harness.svelte";
import { pageRefs } from "./resolve";
import { petstoreModel } from "./stories";

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
