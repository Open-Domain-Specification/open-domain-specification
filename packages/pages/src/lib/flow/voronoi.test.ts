import { describe, expect, it } from "vitest";
import {
	centre,
	convexHull,
	ellipsePoints,
	groupBoundaries,
	groupLabels,
	outerBlob,
	type Point,
	paddedBounds,
	resample,
	type SketchNode,
	sketchBackdrop,
	smoothPath,
} from "./voronoi";

const box = (
	id: string,
	x: number,
	y: number,
	groupId?: string,
): SketchNode => ({ id, x, y, width: 100, height: 50, groupId });

const quad: SketchNode[] = [
	box("a", 0, 0, "g1"),
	box("b", 300, 0, "g1"),
	box("c", 0, 300, "g2"),
	box("d", 300, 300, "g2"),
];

describe("paddedBounds and centre", () => {
	it("wraps every node and grows by the padding", () => {
		expect(paddedBounds(quad, 10)).toEqual([-10, -10, 410, 360]);
		expect(centre(quad[3])).toEqual([350, 325]);
	});
});

describe("convexHull", () => {
	it("keeps only the outer points, counter-clockwise, and passes tiny inputs through", () => {
		const hull = convexHull([
			[0, 0],
			[10, 0],
			[10, 10],
			[0, 10],
			[5, 5],
			[5, 0],
		]);
		expect(hull).toEqual([
			[0, 0],
			[10, 0],
			[10, 10],
			[0, 10],
		]);
		expect(convexHull([[3, 4]])).toEqual([[3, 4]]);
		expect(
			convexHull([
				[3, 4],
				[1, 2],
			]),
		).toEqual([
			[1, 2],
			[3, 4],
		]);
	});
});

describe("ellipsePoints and resample", () => {
	it("samples the padded ellipse round a node", () => {
		const pts = ellipsePoints(box("a", 0, 0), 10, 4);
		expect(pts.length).toBe(4);
		expect(pts[0][0]).toBeCloseTo(110);
		expect(pts[0][1]).toBeCloseTo(25);
		expect(pts[1][1]).toBeCloseTo(60);
	});
	it("walks the perimeter at an even step, carrying the remainder round corners", () => {
		const square: Point[] = [
			[0, 0],
			[10, 0],
			[10, 10],
			[0, 10],
		];
		expect(resample(square, 5)).toEqual([
			[0, 0],
			[5, 0],
			[10, 0],
			[10, 5],
			[10, 10],
			[5, 10],
			[0, 10],
			[0, 5],
		]);
		const uneven = resample(square, 7);
		expect(uneven.length).toBe(6);
		expect(uneven[2]).toEqual([10, 4]);
		expect(
			resample(
				[
					[0, 0],
					[10, 0],
				],
				5,
			),
		).toEqual([
			[0, 0],
			[10, 0],
		]);
	});
});

describe("outerBlob and smoothPath", () => {
	it("hulls the padded ellipses so the blob clears every node", () => {
		const pts = outerBlob(quad, 20);
		for (const n of quad) {
			expect(Math.min(...pts.map((p) => p[0]))).toBeLessThanOrEqual(n.x);
			expect(Math.max(...pts.map((p) => p[1]))).toBeGreaterThanOrEqual(
				n.y + n.height,
			);
		}
	});
	it("writes a closed cubic path, a plain closed line for tiny inputs and nothing for none", () => {
		const d = smoothPath([
			[0, 0],
			[10, 0],
			[10, 10],
			[0, 10],
		]);
		expect(d.startsWith("M0 0 C")).toBe(true);
		expect(d.endsWith(" Z")).toBe(true);
		expect(d.match(/C/g)?.length).toBe(4);
		expect(
			smoothPath([
				[1, 2],
				[3, 4],
			]),
		).toBe("M1 2 L3 4 Z");
		expect(smoothPath([])).toBe("");
	});
});

describe("groupBoundaries", () => {
	it("keeps only the Voronoi edges between different groups", () => {
		const bounds = paddedBounds(quad, 20);
		const segs = groupBoundaries(quad, bounds);
		// The two rows are different groups: one horizontal line across the middle, in two pieces.
		expect(segs.length).toBe(2);
		for (const s of segs) {
			expect(s.a[1]).toBeCloseTo(175);
			expect(s.b[1]).toBeCloseTo(175);
		}
		expect(
			groupBoundaries(
				quad.map((n) => ({ ...n, groupId: "same" })),
				bounds,
			),
		).toEqual([]);
	});
	it("draws nothing for fewer than two nodes", () => {
		expect(groupBoundaries([quad[0]], paddedBounds([quad[0]], 20))).toEqual([]);
		expect(groupBoundaries([], [0, 0, 1, 1])).toEqual([]);
	});
});

describe("groupLabels", () => {
	it("centres each label under its group's nodes and skips ungrouped nodes", () => {
		const labels = groupLabels([...quad, box("loose", 600, 600)]);
		expect(labels).toEqual([
			{ id: "g1", x: 200, y: 68 },
			{ id: "g2", x: 200, y: 368 },
		]);
		expect(groupLabels([quad[0]], 10)).toEqual([{ id: "g1", x: 50, y: 60 }]);
	});
});

describe("sketchBackdrop", () => {
	it("bundles blob, boundaries and labels, and is empty for no nodes", () => {
		const b = sketchBackdrop(quad, 20);
		expect(b.blob.startsWith("M")).toBe(true);
		expect(b.boundaries.startsWith("M")).toBe(true);
		expect(b.boundaries).toContain(" L");
		expect(b.labels.length).toBe(2);
		expect(sketchBackdrop([], 20)).toEqual({
			blob: "",
			boundaries: "",
			labels: [],
		});
	});
});
