import { describe, expect, it, vi } from "vitest";
import {
	basePadding,
	fitPastPanels,
	fittedZoom,
	legendCrowded,
	legendGivesWay,
	MIN_ZOOM,
	PANEL_GUTTER,
	type PanelPadding,
	panelPadding,
	READABLE_ZOOM,
	type Rect,
	type Size,
} from "./panel-fit";

/** A canvas 800x400 with its top-left at the origin, as a diagram is measured. */
const VIEW: Rect = { left: 0, right: 800, top: 0, bottom: 400 };
/** A flat panel hugging the top of the canvas, as the options panel is. */
const rect = (left: number, right: number): Rect => ({
	left,
	right,
	top: 10,
	bottom: 90,
});
/** A deep panel, as the legend is once it lists a map's terms. */
const tall = (left: number, right: number): Rect => ({
	left,
	right,
	top: 10,
	bottom: 300,
});

describe("basePadding", () => {
	it("matches the pixels Svelte Flow derives from a fractional padding", () => {
		// (size - size / 1.25) / 2, the formula in @xyflow/system's parsePadding.
		expect(basePadding(800)).toBe(80);
		expect(basePadding(400)).toBe(40);
		expect(basePadding(800, 0.1)).toBe(36);
	});
});

describe("panelPadding", () => {
	it("keeps the default fraction on a side no panel claims", () => {
		expect(panelPadding(VIEW, [])).toEqual({
			top: "40px",
			bottom: "40px",
			left: "80px",
			right: "80px",
		});
	});

	it("gives a tall narrow panel its column, plus the gutter", () => {
		// A legend 15px in and 200 wide, deep enough that the band it sits in
		// would cost three quarters of the height: the column is the cheap side.
		const padding = panelPadding(VIEW, [tall(15, 215)]);
		expect(padding.left).toBe(`${215 + PANEL_GUTTER}px`);
		expect(padding.top).toBe("40px");
		expect(padding.right).toBe("80px");
	});

	it("gives a wide flat panel its band instead of half the canvas", () => {
		// The options panel spans most of the width but is only 80px deep.
		const padding = panelPadding(VIEW, [rect(300, 780)]);
		expect(padding.top).toBe(`${90 + PANEL_GUTTER}px`);
		expect(padding.right).toBe("80px");
	});

	it("reserves from the far side for a panel hugging the right or the bottom", () => {
		expect(panelPadding(VIEW, [tall(585, 785)]).right).toBe(
			`${800 - 585 + PANEL_GUTTER}px`,
		);
		const low = { left: 300, right: 780, top: 310, bottom: 390 };
		expect(panelPadding(VIEW, [low]).bottom).toBe(
			`${400 - 310 + PANEL_GUTTER}px`,
		);
	});

	it("takes the widest claim per side and never less than the default", () => {
		const padding = panelPadding(VIEW, [
			tall(15, 215),
			tall(15, 120),
			tall(600, 790),
			tall(700, 790),
		]);
		expect(padding.left).toBe(`${215 + PANEL_GUTTER}px`);
		expect(padding.right).toBe(`${800 - 600 + PANEL_GUTTER}px`);
		// A panel narrower than the default fraction leaves the fit as it was.
		expect(panelPadding(VIEW, [tall(5, 40)]).left).toBe("80px");
	});

	it("caps a strip at 40% of its axis so a thin split still fits something", () => {
		const narrow: Rect = { left: 0, right: 300, top: 0, bottom: 400 };
		// A panel all but filling that canvas: the column is still its cheaper
		// strip, but the fit keeps three fifths of the width to draw in.
		const huge: Rect = { left: 10, right: 280, top: 10, bottom: 399 };
		expect(panelPadding(narrow, [huge]).left).toBe("120px");
	});

	it("reads a zero box as no claim at all", () => {
		const none: Rect = { left: 0, right: 0, top: 0, bottom: 0 };
		expect(panelPadding(none, [none])).toEqual({
			top: "0px",
			bottom: "0px",
			left: "0px",
			right: "0px",
		});
	});
});

/** An element that measures as `box`, with `panels` inside it. */
function container(box: Rect, panels: Rect[]): Element {
	const el = document.createElement("div");
	el.getBoundingClientRect = () => box as DOMRect;
	for (const p of panels) {
		const panel = document.createElement("div");
		panel.className = "diagram-legend";
		panel.getBoundingClientRect = () => p as DOMRect;
		el.append(panel);
	}
	return el;
}

describe("fitPastPanels", () => {
	it("fits with the measured panels reserved", () => {
		const fitView = vi.fn();
		fitPastPanels({ fitView }, container(VIEW, [tall(15, 215)]));
		expect(fitView).toHaveBeenCalledWith({
			padding: {
				top: "40px",
				bottom: "40px",
				left: `${215 + PANEL_GUTTER}px`,
				right: "80px",
			},
		});
	});

	it("does nothing without a container to measure", () => {
		const fitView = vi.fn();
		fitPastPanels({ fitView }, undefined);
		expect(fitView).not.toHaveBeenCalled();
	});
});

describe("fittedZoom", () => {
	const none: PanelPadding = {
		top: "0px",
		right: "0px",
		bottom: "0px",
		left: "0px",
	};
	it("is the tighter of the two axes, measured inside the padding", () => {
		// 800x400 with nothing reserved, round a graph twice as wide as the canvas.
		expect(fittedZoom(VIEW, none, { width: 1600, height: 400 })).toBe(0.5);
		// The height is the tighter axis here, so it decides.
		expect(fittedZoom(VIEW, none, { width: 800, height: 1600 })).toBe(0.25);
		// Reserving the legend's column costs the fit its width.
		expect(
			fittedZoom(
				VIEW,
				{ ...none, left: "400px" },
				{ width: 1600, height: 400 },
			),
		).toBe(0.25);
	});

	it("reads a graph with no size as nothing to fit", () => {
		expect(fittedZoom(VIEW, none, { width: 0, height: 0 })).toBe(
			Number.POSITIVE_INFINITY,
		);
		expect(fittedZoom(VIEW, none, { width: 800, height: 0 })).toBe(
			Number.POSITIVE_INFINITY,
		);
	});
});

describe("legendGivesWay", () => {
	/** A wide map: fifteen contexts across, as NorthBank's is. */
	const wide = { width: 4000, height: 900 };

	it("holds the legend while the map still fits above the floor", () => {
		const roomy: Rect = { left: 0, right: 2400, top: 0, bottom: 1200 };
		expect(legendGivesWay(roomy, [tall(15, 215)], wide)).toBe(false);
	});

	it("gives way once the reserved column would fit the map below the floor", () => {
		// A webview split thin: the legend's column takes what the map needed.
		expect(legendGivesWay(VIEW, [tall(15, 215)], wide)).toBe(true);
		// A map that fits in what is left leaves the legend alone.
		expect(
			legendGivesWay(VIEW, [tall(15, 215)], { width: 1000, height: 500 }),
		).toBe(false);
	});

	it("takes the floor it is given", () => {
		const bounds = { width: 1600, height: 400 };
		expect(legendGivesWay(VIEW, [], bounds, 0.1)).toBe(false);
		expect(legendGivesWay(VIEW, [], bounds, 0.9)).toBe(true);
	});

	it("keeps the readable floor above the zoom floor", () => {
		expect(READABLE_ZOOM).toBeGreaterThan(MIN_ZOOM);
	});
});

describe("legendCrowded", () => {
	const flow = (bounds: Size) => ({
		getNodes: () => [{ id: "a" }],
		getNodesBounds: () => bounds,
	});

	it("measures the diagram and asks the same question of it", () => {
		const canvas = () => container(VIEW, [tall(15, 215)]);
		expect(legendCrowded(flow({ width: 4000, height: 900 }), canvas())).toBe(
			true,
		);
		expect(legendCrowded(flow({ width: 400, height: 200 }), canvas())).toBe(
			false,
		);
	});

	it("has nothing to give way for without a container", () => {
		expect(legendCrowded(flow({ width: 4000, height: 900 }), undefined)).toBe(
			false,
		);
	});
});
