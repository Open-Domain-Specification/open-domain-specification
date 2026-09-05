import { render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { installXyflowTestEnv } from "../xyflow-test-env";
import { createDiagramFit } from "./fit.svelte";
import Harness from "./PanelFit.harness.svelte";
import { crowded, fitPastPanels, NO_AIR } from "./panel-fit";
import { resetPanelChoices } from "./panel-state.svelte";

vi.mock("./panel-fit", async (original) => ({
	...(await original<typeof import("./panel-fit")>()),
	fitPastPanels: vi.fn(),
	crowded: vi.fn(() => false),
}));

installXyflowTestEnv();

/** The refit lands a tick and two frames after mount; wait for all three. */
const settled = () =>
	new Promise((resolve) =>
		requestAnimationFrame(() =>
			requestAnimationFrame(() => setTimeout(resolve, 0)),
		),
	);

/** Long enough for the whole order to be walked, a step per tick and frame. */
const walked = async () => {
	for (let i = 0; i <= 4; i += 1) await settled();
};

beforeEach(() => {
	sessionStorage.clear();
	resetPanelChoices();
});

describe("PanelFit", () => {
	it("refits the canvas past the panels once the diagram is laid out", async () => {
		const container = document.createElement("div");
		const { unmount } = render(Harness, { container });
		expect(fitPastPanels).not.toHaveBeenCalled();
		await settled();
		expect(fitPastPanels).toHaveBeenCalledWith(
			expect.objectContaining({ fitView: expect.any(Function) }),
			container,
			expect.any(Number),
		);
		unmount();
	});

	it("stops at the first step that gives the map its room", async () => {
		// Crowded once: the legend gives way and the second question says no.
		vi.mocked(crowded).mockReturnValueOnce(true);
		const container = document.createElement("div");
		const fit = createDiagramFit();
		const { unmount } = render(Harness, { container, fit });
		await walked();
		expect(fit.step).toBe("legend");
		expect(fit.legend.collapsed).toBe(true);
		expect(fit.options.collapsed).toBe(false);
		expect(fitPastPanels).toHaveBeenCalledWith(
			expect.anything(),
			container,
			fit.air,
		);
		unmount();
	});

	it("walks the whole order for a map that will not fit whatever it gives", async () => {
		vi.mocked(crowded).mockReturnValue(true);
		const container = document.createElement("div");
		const fit = createDiagramFit();
		const { unmount } = render(Harness, { container, fit });
		await walked();
		expect(fit.step).toBe("floor");
		expect(fit.legend.collapsed).toBe(true);
		expect(fit.options.collapsed).toBe(true);
		expect(fit.air).toBe(NO_AIR);
		expect(fitPastPanels).toHaveBeenCalledWith(
			expect.anything(),
			container,
			NO_AIR,
		);
		unmount();
	});

	it("drops the pending frame when the diagram goes away first", async () => {
		const { unmount } = render(Harness, {
			container: document.createElement("div"),
		});
		unmount();
		await walked();
		expect(fitPastPanels).not.toHaveBeenCalled();
	});
});
