import { beforeEach, describe, expect, it } from "vitest";
import { createLegendState, resetLegendChoice } from "./legend-state.svelte";

const KEY = "ods-legend-expanded";

beforeEach(() => {
	sessionStorage.clear();
	resetLegendChoice();
});

describe("legend state", () => {
	it("starts open and stays open while the fit has room", () => {
		const legend = createLegendState();
		expect(legend.collapsed).toBe(false);
		expect(legend.crowded).toBe(false);
	});

	it("gives way when the fit runs out of room", () => {
		const legend = createLegendState();
		legend.crowd();
		expect(legend.crowded).toBe(true);
		expect(legend.collapsed).toBe(true);
	});

	it("lets the reader open a legend the fit closed, and remembers it", () => {
		const legend = createLegendState();
		legend.crowd();
		legend.toggle();
		expect(legend.collapsed).toBe(false);
		// Still crowded: the map is as wide as it was, the reader simply asked.
		expect(legend.crowded).toBe(true);
		expect(sessionStorage.getItem(KEY)).toBe("expanded");
		legend.toggle();
		expect(legend.collapsed).toBe(true);
		expect(sessionStorage.getItem(KEY)).toBe("collapsed");
	});

	it("carries the reader's say to every diagram on the page, this session", () => {
		const first = createLegendState();
		const second = createLegendState();
		first.toggle();
		expect(second.collapsed).toBe(true);
		// A crowded map opened by the reader stays open on the next page too.
		first.toggle();
		const later = createLegendState();
		later.crowd();
		expect(later.collapsed).toBe(false);
	});

	it("reads the session's choice back on a fresh page", () => {
		sessionStorage.setItem(KEY, "collapsed");
		resetLegendChoice();
		expect(createLegendState().collapsed).toBe(true);
		sessionStorage.setItem(KEY, "sideways");
		resetLegendChoice();
		expect(createLegendState().collapsed).toBe(false);
	});

	it("works when storage is denied, for this page only", () => {
		const realGet = Storage.prototype.getItem;
		const realSet = Storage.prototype.setItem;
		Storage.prototype.getItem = () => {
			throw new Error("blocked");
		};
		Storage.prototype.setItem = () => {
			throw new Error("blocked");
		};
		try {
			resetLegendChoice();
			const legend = createLegendState();
			legend.crowd();
			expect(legend.collapsed).toBe(true);
			legend.toggle();
			expect(legend.collapsed).toBe(false);
		} finally {
			Storage.prototype.getItem = realGet;
			Storage.prototype.setItem = realSet;
		}
	});
});
