import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { installXyflowTestEnv } from "../xyflow-test-env";
import Harness from "./FitViewButton.harness.svelte";
import { createDiagramFit } from "./fit.svelte";
import { fitPastPanels } from "./panel-fit";

vi.mock("./panel-fit", async (original) => ({
	...(await original<typeof import("./panel-fit")>()),
	fitPastPanels: vi.fn(),
}));

installXyflowTestEnv();

describe("FitViewButton", () => {
	it("stands where the library's button did, with its class and name", () => {
		const { getByRole } = render(Harness);
		const button = getByRole("button", { name: "Fit View" });
		expect(button).toHaveClass("svelte-flow__controls-fitview");
		expect(button).toHaveAttribute("title", "Fit View");
		expect(button.closest(".svelte-flow__controls")).not.toBeNull();
	});

	it("fits past the panels and takes the view back for the fit", async () => {
		const container = document.createElement("div");
		const fit = createDiagramFit();
		const { getByRole } = render(Harness, { container, fit });
		await fireEvent.click(getByRole("button", { name: "Fit View" }));
		expect(fitPastPanels).toHaveBeenCalledWith(
			expect.objectContaining({ fitView: expect.any(Function) }),
			container,
			fit.air,
		);
		await vi.waitFor(() =>
			expect(fit.owns({ x: 0, y: 0, zoom: 1 })).toBe(true),
		);
	});
});
