import { beforeEach, describe, expect, it } from "vitest";
import { createPanelState, resetPanelChoices } from "./panel-state.svelte";

const KEY = "ods-diagram-panels";
const stored = () => JSON.parse(sessionStorage.getItem(KEY) ?? "{}");

beforeEach(() => {
	sessionStorage.clear();
	resetPanelChoices();
});

describe("panel state", () => {
	it("starts open and stays open while the fit has room", () => {
		const legend = createPanelState("legend");
		expect(legend.collapsed).toBe(false);
		expect(legend.crowded).toBe(false);
	});

	it("gives way when the fit runs out of room", () => {
		const legend = createPanelState("legend");
		legend.crowd();
		expect(legend.crowded).toBe(true);
		expect(legend.collapsed).toBe(true);
	});

	it("lets the reader open a panel the fit closed, and remembers it", () => {
		const legend = createPanelState("legend");
		legend.crowd();
		legend.toggle();
		expect(legend.collapsed).toBe(false);
		// Still crowded: the map is as wide as it was, the reader simply asked.
		expect(legend.crowded).toBe(true);
		expect(stored()).toEqual({ legend: "expanded" });
		legend.toggle();
		expect(legend.collapsed).toBe(true);
		expect(stored()).toEqual({ legend: "collapsed" });
	});

	it("keeps one answer per panel", () => {
		const legend = createPanelState("legend");
		const options = createPanelState("options");
		legend.toggle();
		expect(legend.collapsed).toBe(true);
		expect(options.collapsed).toBe(false);
		options.crowd();
		expect(options.collapsed).toBe(true);
		options.toggle();
		expect(stored()).toEqual({ legend: "collapsed", options: "expanded" });
	});

	it("carries the reader's say to every diagram on the page, this session", () => {
		const first = createPanelState("legend");
		const second = createPanelState("legend");
		first.toggle();
		expect(second.collapsed).toBe(true);
		// A crowded map opened by the reader stays open on the next diagram too.
		first.toggle();
		const later = createPanelState("legend");
		later.crowd();
		expect(later.collapsed).toBe(false);
	});

	it("reads the session's choices back on a fresh page", () => {
		sessionStorage.setItem(KEY, JSON.stringify({ legend: "collapsed" }));
		resetPanelChoices();
		expect(createPanelState("legend").collapsed).toBe(true);
		// Anything that is not one of the two words is nothing said.
		sessionStorage.setItem(KEY, JSON.stringify({ legend: "sideways" }));
		resetPanelChoices();
		expect(createPanelState("legend").collapsed).toBe(false);
		sessionStorage.setItem(KEY, "not json");
		resetPanelChoices();
		expect(createPanelState("legend").collapsed).toBe(false);
		sessionStorage.removeItem(KEY);
		resetPanelChoices();
		expect(createPanelState("legend").collapsed).toBe(false);
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
			resetPanelChoices();
			const legend = createPanelState("legend");
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
