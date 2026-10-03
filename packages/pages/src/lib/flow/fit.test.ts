import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDiagramFit, refit } from "./fit.svelte";
import { FLOOR_ZOOM, MIN_ZOOM, RELIEF_STEPS } from "./panel-fit";
import { resetPanelChoices } from "./panel-state.svelte";

beforeEach(() => {
	sessionStorage.clear();
	resetPanelChoices();
});

describe("diagram fit", () => {
	it("starts with both panels open and the readable floor", () => {
		const fit = createDiagramFit();
		expect(fit.legend.collapsed).toBe(false);
		expect(fit.options.collapsed).toBe(false);
		expect(fit.minZoom).toBe(MIN_ZOOM);
		expect(fit.step).toBe("none");
	});

	it("gives up one thing per step, in the order the fit walks", () => {
		const fit = createDiagramFit();
		fit.give("legend");
		expect(fit.legend.collapsed).toBe(true);
		expect(fit.options.collapsed).toBe(false);
		fit.give("options");
		expect(fit.options.collapsed).toBe(true);
		expect(fit.minZoom).toBe(MIN_ZOOM);
		fit.give("floor");
		expect(fit.minZoom).toBe(FLOOR_ZOOM);
		expect(fit.step).toBe("floor");
	});

	it("names the last step it took, so the page can say which one it was", () => {
		const fit = createDiagramFit();
		for (const step of RELIEF_STEPS) {
			fit.give(step);
			expect(fit.step).toBe(step);
		}
	});
});

describe("who owns the view", () => {
	const drawn = { x: 10, y: 20, zoom: 0.5 };

	it("owns nothing before a fit has landed", () => {
		expect(createDiagramFit().owns(drawn)).toBe(false);
	});

	it("owns the view it drew, and loses it to any zoom or pan", () => {
		const fit = createDiagramFit();
		fit.landed(drawn);
		expect(fit.owns({ ...drawn })).toBe(true);
		expect(fit.owns({ ...drawn, x: 11 })).toBe(false);
		expect(fit.owns({ ...drawn, y: 21 })).toBe(false);
		expect(fit.owns({ ...drawn, zoom: 0.6 })).toBe(false);
	});

	it("keeps its own copy, so a view object changed later is not the one it drew", () => {
		const fit = createDiagramFit();
		const view = { ...drawn };
		fit.landed(view);
		view.zoom = 2;
		expect(fit.owns(view)).toBe(false);
	});

	it("takes the view back when handed it, until the next fit lands", () => {
		const fit = createDiagramFit();
		const moved = { ...drawn, zoom: 2 };
		// Nothing to hand back before a fit has landed.
		fit.reclaim();
		expect(fit.owns(moved)).toBe(false);
		fit.landed(drawn);
		expect(fit.owns(moved)).toBe(false);
		fit.reclaim();
		expect(fit.owns(moved)).toBe(true);
		fit.landed(drawn);
		expect(fit.owns(moved)).toBe(false);
	});

	it("takes the view back with every refit", async () => {
		const fit = createDiagramFit();
		const flow = {
			fitView: vi.fn(async () => true),
			getNodes: () => [],
			getNodesBounds: () => ({ width: 0, height: 0 }),
			getViewport: () => drawn,
		};
		const container = document.createElement("div");
		await refit(fit, flow, container);
		expect(flow.fitView).toHaveBeenCalledOnce();
		expect(fit.owns(drawn)).toBe(true);
	});
});
