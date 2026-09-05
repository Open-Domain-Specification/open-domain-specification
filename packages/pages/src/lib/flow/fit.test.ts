import { beforeEach, describe, expect, it } from "vitest";
import { createDiagramFit } from "./fit.svelte";
import {
	BASE_PADDING,
	FLOOR_ZOOM,
	MIN_ZOOM,
	NO_AIR,
	RELIEF_STEPS,
} from "./panel-fit";
import { resetPanelChoices } from "./panel-state.svelte";

beforeEach(() => {
	sessionStorage.clear();
	resetPanelChoices();
});

describe("diagram fit", () => {
	it("starts with both panels open, the default air and the readable floor", () => {
		const fit = createDiagramFit();
		expect(fit.legend.collapsed).toBe(false);
		expect(fit.options.collapsed).toBe(false);
		expect(fit.air).toBe(BASE_PADDING);
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
		expect(fit.air).toBe(BASE_PADDING);
		fit.give("air");
		expect(fit.air).toBe(NO_AIR);
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
