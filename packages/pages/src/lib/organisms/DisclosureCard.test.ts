import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import { createDisclosure } from "../flow/disclosure.svelte";
import { installXyflowTestEnv } from "../xyflow-test-env";
import Harness from "./DisclosureCard.harness.svelte";

installXyflowTestEnv();

const model = petstoreModel();
/** The shared kernel the petstore marks for refactoring. */
const kernel = model.workspace.relationships.find(
	(r) => r.type === "shared-kernel",
)!;

describe("DisclosureCard", () => {
	it("draws nothing until a badge opens a relationship", async () => {
		const disclosure = createDisclosure();
		const { container } = render(Harness, { disclosure, model });
		await waitFor(() =>
			expect(container.querySelector(".svelte-flow")).toBeTruthy(),
		);
		expect(container.querySelector(".anchored")).toBeNull();
		disclosure.stop();
	});

	it("anchors the relationship detail at the badge's flow point and closes from its own button", async () => {
		const disclosure = createDisclosure();
		const { container } = render(Harness, { disclosure, model });
		await waitFor(() =>
			expect(container.querySelector(".svelte-flow")).toBeTruthy(),
		);

		disclosure.show(kernel, { x: 120, y: 48 });
		await waitFor(() =>
			expect(container.querySelector(".anchored")).toBeTruthy(),
		);
		const card = container.querySelector(".anchored") as HTMLElement;
		// Inside the viewport portal, so it pans and zooms with the map.
		expect(card.closest(".svelte-flow__viewport-front")).toBeTruthy();
		expect(card.style.transform).toBe("translate(120px, 48px)");
		expect(card.querySelector(".relationship-detail h3")?.textContent).toBe(
			"Catalog BC ↔ Inventory BC",
		);

		// A pointer down inside the card is not a click somewhere else.
		await fireEvent.pointerDown(card);
		expect(container.querySelector(".anchored")).toBeTruthy();

		await fireEvent.click(
			card.querySelector('button[aria-label="Close"]') as HTMLElement,
		);
		await waitFor(() =>
			expect(container.querySelector(".anchored")).toBeNull(),
		);
		disclosure.stop();
	});
});
