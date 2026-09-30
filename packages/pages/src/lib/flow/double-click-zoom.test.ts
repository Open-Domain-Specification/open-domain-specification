import { describe, expect, it } from "vitest";
import { zoomedAt } from "./double-click-zoom";

const limits = { min: 0.2, max: 2 };

describe("zoomedAt", () => {
	it("doubles the zoom and keeps the point under the pointer where it is", () => {
		const view = { x: 10, y: 20, zoom: 0.5 };
		const at = { x: 100, y: 60 };
		const next = zoomedAt(view, at, limits, false);
		expect(next.zoom).toBe(1);
		// The flow point under the pointer is the same before and after.
		const flowX = (at.x - view.x) / view.zoom;
		const flowY = (at.y - view.y) / view.zoom;
		expect(next.x + flowX * next.zoom).toBeCloseTo(at.x);
		expect(next.y + flowY * next.zoom).toBeCloseTo(at.y);
	});

	it("halves with Shift", () => {
		expect(
			zoomedAt({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0 }, limits, true).zoom,
		).toBe(0.5);
	});

	it("stops at the map's own limits, and does not move when it is already there", () => {
		expect(
			zoomedAt({ x: 0, y: 0, zoom: 1.5 }, { x: 0, y: 0 }, limits, false).zoom,
		).toBe(2);
		expect(
			zoomedAt({ x: 0, y: 0, zoom: 0.3 }, { x: 0, y: 0 }, limits, true).zoom,
		).toBe(0.2);
		const view = { x: 7, y: 9, zoom: 2 };
		expect(zoomedAt(view, { x: 50, y: 50 }, limits, false)).toEqual(view);
	});
});
