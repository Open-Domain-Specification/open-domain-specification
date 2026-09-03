import { Position } from "@xyflow/svelte";
import { describe, expect, it } from "vitest";
import {
	anchorTowards,
	floatingEdgeParams,
	type Rect,
	rectOf,
} from "./floating";

const box = (x: number, y: number, w = 100, h = 50): Rect => ({
	x,
	y,
	width: w,
	height: h,
});

describe("anchorTowards", () => {
	it("leaves through the right side towards a node to the right", () => {
		const a = anchorTowards(box(0, 0), box(300, 0));
		expect(a.position).toBe(Position.Right);
		expect(a.x).toBe(100);
		expect(a.y).toBe(25);
	});
	it("leaves through the left, top and bottom sides as the target moves", () => {
		expect(anchorTowards(box(300, 0), box(0, 0)).position).toBe(Position.Left);
		expect(anchorTowards(box(0, 300), box(0, 0)).position).toBe(Position.Top);
		expect(anchorTowards(box(0, 0), box(0, 300)).position).toBe(
			Position.Bottom,
		);
	});
	it("picks the side the diagonal actually crosses", () => {
		const a = anchorTowards(box(0, 0), box(120, 400));
		expect(a.position).toBe(Position.Bottom);
		expect(a.y).toBe(50);
	});
	it("falls back to the centre for coincident or zero-size rectangles", () => {
		expect(anchorTowards(box(0, 0), box(0, 0))).toEqual({
			x: 50,
			y: 25,
			position: Position.Right,
		});
		expect(anchorTowards(box(0, 0, 0, 0), box(10, 10)).position).toBe(
			Position.Right,
		);
		expect(anchorTowards(box(0, 0, 100, 0), box(10, 10)).position).toBe(
			Position.Right,
		);
	});
	it("handles a purely vertical or horizontal line without dividing by zero", () => {
		expect(anchorTowards(box(0, 0), box(0, 500)).x).toBe(50);
		expect(anchorTowards(box(0, 0), box(500, 0)).y).toBe(25);
	});
});

describe("floatingEdgeParams", () => {
	it("gives both ends facing each other", () => {
		const p = floatingEdgeParams(box(0, 0), box(300, 0));
		expect(p.sourcePosition).toBe(Position.Right);
		expect(p.targetPosition).toBe(Position.Left);
		expect(p.sourceX).toBe(100);
		expect(p.targetX).toBe(300);
	});
});

describe("rectOf", () => {
	it("reads position and size, treating unmeasured nodes as zero-size", () => {
		const node = {
			internals: { positionAbsolute: { x: 5, y: 6 } },
			measured: { width: 10, height: 20 },
		};
		expect(rectOf(node)).toEqual({ x: 5, y: 6, width: 10, height: 20 });
		expect(rectOf({ ...node, measured: {} })).toEqual({
			x: 5,
			y: 6,
			width: 0,
			height: 0,
		});
	});
});
