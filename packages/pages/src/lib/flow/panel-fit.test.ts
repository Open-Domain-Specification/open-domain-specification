import { describe, expect, it, vi } from "vitest";
import {
	crowded,
	drawnBounds,
	FLOOR_ZOOM,
	fitPastPanels,
	fittedZoom,
	MIN_ZOOM,
	needsRelief,
	PANEL_GUTTER,
	PANEL_SELECTOR,
	type PanelPadding,
	panelPadding,
	READABLE_ZOOM,
	RELIEF_STEPS,
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

/** What a side no panel claims keeps: the gutter and nothing more. */
const GUTTER = `${PANEL_GUTTER}px`;

describe("panelPadding", () => {
	it("keeps only the gutter on a side no panel claims", () => {
		expect(panelPadding(VIEW, [])).toEqual({
			top: GUTTER,
			bottom: GUTTER,
			left: GUTTER,
			right: GUTTER,
		});
	});

	it("gives a tall narrow panel its column, plus the gutter", () => {
		// A legend 15px in and 200 wide, deep enough that the band it sits in
		// would cost three quarters of the height: the column is the cheap side.
		const padding = panelPadding(VIEW, [tall(15, 215)]);
		expect(padding.left).toBe(`${215 + PANEL_GUTTER}px`);
		expect(padding.top).toBe(GUTTER);
		expect(padding.right).toBe(GUTTER);
	});

	it("gives a wide flat panel its band instead of half the canvas", () => {
		// The options panel spans most of the width but is only 80px deep.
		const padding = panelPadding(VIEW, [rect(300, 780)]);
		expect(padding.top).toBe(`${90 + PANEL_GUTTER}px`);
		expect(padding.right).toBe(GUTTER);
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

	it("takes the widest claim per side, and a panel's gutter from the panel", () => {
		const padding = panelPadding(VIEW, [
			tall(15, 215),
			tall(15, 120),
			tall(600, 790),
			tall(700, 790),
		]);
		expect(padding.left).toBe(`${215 + PANEL_GUTTER}px`);
		expect(padding.right).toBe(`${800 - 600 + PANEL_GUTTER}px`);
		// The gutter is kept from the panel's edge, not the canvas's.
		expect(panelPadding(VIEW, [tall(5, 40)]).left).toBe(
			`${40 + PANEL_GUTTER}px`,
		);
	});

	it("caps a strip at 40% of its axis so a thin split still fits something", () => {
		const narrow: Rect = { left: 0, right: 300, top: 0, bottom: 400 };
		// A panel all but filling that canvas: the column is still its cheaper
		// strip, but the fit keeps three fifths of the width to draw in.
		const huge: Rect = { left: 10, right: 280, top: 10, bottom: 399 };
		expect(panelPadding(narrow, [huge]).left).toBe("120px");
	});

	it("reads a zero box as no claim at all, keeping only the gutter", () => {
		const none: Rect = { left: 0, right: 0, top: 0, bottom: 0 };
		expect(panelPadding(none, [none])).toEqual({
			top: GUTTER,
			bottom: GUTTER,
			left: GUTTER,
			right: GUTTER,
		});
	});

	it("clears a panel by whichever strip lets the map fit larger", () => {
		// A minimap-sized box in the bottom-right corner: its column and its
		// band cost about the same share of their axes.
		const corner: Rect = { left: 665, right: 785, top: 305, bottom: 385 };
		// A wide, flat map is held by the width: a band costs it nothing.
		const wide = panelPadding(VIEW, [corner], { width: 1600, height: 200 });
		expect(wide.bottom).toBe(`${400 - 305 + PANEL_GUTTER}px`);
		expect(wide.right).toBe(GUTTER);
		// A tall, narrow one is held by the height: a column costs it nothing.
		const narrow = panelPadding(VIEW, [corner], { width: 200, height: 800 });
		expect(narrow.right).toBe(`${800 - 665 + PANEL_GUTTER}px`);
		expect(narrow.bottom).toBe(GUTTER);
	});

	it("never takes a strip the cap has cut short while the other one clears", () => {
		// The deep legend's band would cost a wide, flat map nothing, but at
		// 300px it is past the cap and would leave the legend over the map.
		const padding = panelPadding(VIEW, [tall(15, 215)], {
			width: 1600,
			height: 100,
		});
		expect(padding.left).toBe(`${215 + PANEL_GUTTER}px`);
		expect(padding.top).toBe(GUTTER);
	});

	it("chooses for every panel together, so two corners can share one side", () => {
		// The zoom controls bottom-left and the minimap bottom-right: for a wide
		// map, one band along the bottom clears both.
		const controls: Rect = { left: 15, right: 95, top: 300, bottom: 385 };
		const minimap: Rect = { left: 665, right: 785, top: 305, bottom: 385 };
		const padding = panelPadding(VIEW, [controls, minimap], {
			width: 1600,
			height: 200,
		});
		expect(padding.bottom).toBe(`${400 - 300 + PANEL_GUTTER}px`);
		expect(padding.left).toBe(GUTTER);
		expect(padding.right).toBe(GUTTER);
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

/** A flow whose nodes span `bounds`, with a `fitView` to watch. */
const fitter = (bounds: Size = { width: 0, height: 0 }) => ({
	fitView: vi.fn(async (_options: { padding: PanelPadding }) => true),
	getNodes: () => [{ id: "a" }],
	getNodesBounds: () => bounds,
});

describe("PANEL_SELECTOR", () => {
	it("finds the legend, the options, the zoom controls and the minimap", () => {
		const el = document.createElement("div");
		el.innerHTML = [
			'<div class="diagram-legend"></div>',
			'<div class="diagram-options"></div>',
			'<div class="svelte-flow__controls"></div>',
			'<div class="svelte-flow__minimap"></div>',
			'<div class="svelte-flow__attribution"></div>',
		].join("");
		expect(
			[...el.querySelectorAll(PANEL_SELECTOR)].map((p) => p.className),
		).toEqual([
			"diagram-legend",
			"diagram-options",
			"svelte-flow__controls",
			"svelte-flow__minimap",
		]);
	});
});

describe("fitPastPanels", () => {
	it("fits with the measured panels reserved", async () => {
		const flow = fitter();
		await fitPastPanels(flow, container(VIEW, [tall(15, 215)]));
		expect(flow.fitView).toHaveBeenCalledWith({
			padding: {
				top: GUTTER,
				bottom: GUTTER,
				left: `${215 + PANEL_GUTTER}px`,
				right: GUTTER,
			},
		});
	});

	it("chooses the strips for the map it is fitting", async () => {
		// A legend whose column is the cheaper strip by share of its axis. That
		// column would cost a wide, flat map its width; the band costs it
		// nothing, so the band is the one reserved.
		const legend: Rect = { left: 15, right: 215, top: 10, bottom: 140 };
		const flow = fitter({ width: 1600, height: 100 });
		await fitPastPanels(flow, container(VIEW, [legend]));
		expect(flow.fitView).toHaveBeenCalledWith({
			padding: expect.objectContaining({
				top: `${140 + PANEL_GUTTER}px`,
				left: GUTTER,
			}),
		});
	});

	it("refits at once: the call carries no duration, so the viewport never eases", async () => {
		const flow = fitter();
		await fitPastPanels(flow, container(VIEW, [tall(15, 215)]));
		expect(Object.keys(flow.fitView.mock.calls[0][0])).toEqual(["padding"]);
	});

	it("does nothing without a container to measure", async () => {
		const flow = fitter();
		await fitPastPanels(flow, undefined);
		expect(flow.fitView).not.toHaveBeenCalled();
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

describe("needsRelief", () => {
	/** A dense map: fifteen contexts across, as NorthBank's is. */
	const map = { width: 3000, height: 1400 };
	/** The boxes the fit measures, before and after each panel gives way. */
	const expandedLegend = tall(15, 215);
	const collapsedLegend: Rect = { left: 15, right: 80, top: 10, bottom: 35 };
	const expandedOptions = rect(300, 780);
	const collapsedOptions: Rect = { left: 680, right: 780, top: 10, bottom: 40 };

	it("holds everything while the map fits above the readable floor", () => {
		const roomy: Rect = { left: 0, right: 2400, top: 0, bottom: 1200 };
		expect(needsRelief(roomy, [expandedLegend, expandedOptions], map)).toBe(
			false,
		);
	});

	it("asks for one more step at each stage, about the boxes as they are then", () => {
		// 1. Both panels open: the map cannot clear the readable floor.
		expect(needsRelief(VIEW, [expandedLegend, expandedOptions], map)).toBe(
			true,
		);
		// 2. The legend is a row now; the options panel's band is still too much.
		expect(needsRelief(VIEW, [collapsedLegend, expandedOptions], map)).toBe(
			true,
		);
		// 3. Both are rows, and the map clears the readable floor: it stops.
		expect(needsRelief(VIEW, [collapsedLegend, collapsedOptions], map)).toBe(
			false,
		);
	});

	it("gives the floor away last, and only for a map that still will not clear it", () => {
		const huge = { width: 4000, height: 1800 };
		const rows = [collapsedLegend, collapsedOptions];
		// Everything given, and the map is still under the floor a map should keep.
		expect(needsRelief(VIEW, rows, huge, MIN_ZOOM)).toBe(true);
		// A map that fits once the panels are rows is over it.
		expect(needsRelief(VIEW, rows, map, MIN_ZOOM)).toBe(false);
	});

	it("keeps the three floors in their order", () => {
		expect(READABLE_ZOOM).toBeGreaterThan(MIN_ZOOM);
		expect(MIN_ZOOM).toBeGreaterThan(FLOOR_ZOOM);
		expect(RELIEF_STEPS).toEqual(["legend", "options", "floor"]);
	});
});

describe("drawnBounds", () => {
	it("measures only the nodes Svelte Flow draws, as its fit does", () => {
		const getNodesBounds = vi.fn(() => ({ width: 10, height: 10 }));
		const shown = { id: "a" };
		const drawn = { id: "b", hidden: false };
		drawnBounds({
			getNodes: () => [shown, { id: "cluster", hidden: true }, drawn],
			getNodesBounds,
		});
		expect(getNodesBounds).toHaveBeenCalledWith([shown, drawn]);
	});
});

describe("crowded", () => {
	const flow = (bounds: Size) => ({
		getNodes: () => [{ id: "a" }],
		getNodesBounds: () => bounds,
	});

	it("measures the diagram and asks the same question of it", () => {
		const canvas = () => container(VIEW, [tall(15, 215)]);
		expect(crowded(flow({ width: 4000, height: 900 }), canvas())).toBe(true);
		expect(crowded(flow({ width: 400, height: 200 }), canvas())).toBe(false);
		// The floor is the caller's to name, step by step: this map is under
		// the readable floor and over the one a map should keep.
		const between = flow({ width: 2700, height: 1000 });
		expect(crowded(between, canvas())).toBe(true);
		expect(crowded(between, canvas(), MIN_ZOOM)).toBe(false);
	});

	it("has nothing to give way for without a container", () => {
		expect(crowded(flow({ width: 4000, height: 900 }), undefined)).toBe(false);
	});
});
