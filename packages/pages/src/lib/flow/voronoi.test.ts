import { describe, expect, it } from "vitest";
import {
	EMPTY_BACKDROP,
	internals,
	type Point,
	type SketchNode,
	sketchBackdrop,
} from "./voronoi";

const {
	cells,
	centre,
	convexHull,
	domainBoundaries,
	domainBorders,
	ellipsePoints,
	groupBoundaries,
	groupLabels,
	sharedEdge,
	outerBlob,
	paddedBounds,
	resample,
	smoothPath,
} = internals;

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
		// A step that does not divide the 40-unit perimeter stretches to one that
		// does — 6 paces of 6.67 — so the chord closing the loop is as long as
		// the rest and the spline through them meets itself without a kink.
		const uneven = resample(square, 7);
		expect(uneven.length).toBe(6);
		expect(uneven[2][0]).toBe(10);
		expect(uneven[2][1]).toBeCloseTo(10 / 3);
		expect(uneven[5][0]).toBe(0);
		expect(uneven[5][1]).toBeCloseTo(20 / 3);
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
		const segs = groupBoundaries(quad, cells(quad, bounds));
		// The two rows are different groups: one horizontal line across the middle, in two pieces.
		expect(segs.length).toBe(2);
		for (const s of segs) {
			expect(s.a[1]).toBeCloseTo(175);
			expect(s.b[1]).toBeCloseTo(175);
		}
		const sameGroup = quad.map((n) => ({ ...n, groupId: "same" }));
		expect(groupBoundaries(sameGroup, cells(sameGroup, bounds))).toEqual([]);
	});
	it("draws nothing for fewer than two nodes", () => {
		const one = [quad[0]];
		expect(groupBoundaries(one, cells(one, paddedBounds(one, 20)))).toEqual([]);
		expect(groupBoundaries([], cells([], [0, 0, 1, 1]))).toEqual([]);
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
		expect(b.domainBorders).toBe("");
		expect(b.domains).toEqual([]);
		expect(sketchBackdrop([], 20)).toEqual(EMPTY_BACKDROP);
	});
});

/** Two domains side by side, each with two subdomains stacked: a 2x2 grid of nodes plus one loose node. */
const twoDomains: SketchNode[] = [
	{ ...box("a", 0, 0, "s1"), domainId: "d1" },
	{ ...box("b", 0, 300, "s2"), domainId: "d1" },
	{ ...box("c", 400, 0, "s3"), domainId: "d2" },
	{ ...box("d", 400, 300, "s4"), domainId: "d2" },
	box("loose", 800, 150),
];

describe("domainBoundaries", () => {
	it("keeps only the Voronoi edges between different domains, a loose node counting as none", () => {
		const bounds = paddedBounds(twoDomains, 20);
		const segs = domainBoundaries(twoDomains, cells(twoDomains, bounds));
		// d1|d2 is one vertical line in two pieces; d2 against the loose node is another, and the loose
		// node's cell can also touch d1's cells through the corner region only when they share an edge.
		expect(segs.length).toBeGreaterThanOrEqual(4);
		const vertical = segs.filter((s) => Math.abs(s.a[0] - 250) < 1e-6);
		expect(vertical.length).toBe(2);
		for (const s of vertical) expect(s.b[0]).toBeCloseTo(250);
		// Same-domain and same-group edges never appear.
		const sameDomain = twoDomains.map((n) => ({ ...n, domainId: "one" }));
		expect(domainBoundaries(sameDomain, cells(sameDomain, bounds))).toEqual([]);
	});
});

describe("sharedEdge", () => {
	it("finds the edge two cells share, whichever way round the vertices come", () => {
		const square = (x: number, y: number): Point[] => [
			[x, y],
			[x + 1, y],
			[x + 1, y + 1],
			[x, y + 1],
		];
		expect(sharedEdge(square(0, 0), square(1, 0))).toEqual({
			a: [1, 0],
			b: [1, 1],
		});
		expect(sharedEdge(square(0, 0), square(0, 1))).toEqual({
			a: [1, 1],
			b: [0, 1],
		});
	});
});

describe("domainBorders", () => {
	it("gives each domain its longest straight border segment, oriented left to right with the name on the domain's side", () => {
		const bounds = paddedBounds(twoDomains, 20);
		const borders = domainBorders(twoDomains, cells(twoDomains, bounds));
		expect(borders.map((b) => b.id)).toEqual(["d1", "d2"]);
		const d1 = borders[0];
		const d2 = borders[1];
		// The shared vertical border between the two domains, walked top to bottom or bottom to top.
		expect(d1.labelPath).toMatch(/^M250 \S+ L250 \S+$/);
		// d1 lies left of a vertical line: read upwards it sits on the text side, so no flip.
		expect(d1.below).toBe(false);
		// d2's longest stretch is one leg of its bent border against the loose node, walked upwards with d2 on its left.
		expect(d2.labelPath).toMatch(
			/^M695 370 L621.88 175$|^M621.88 175 L695 -20$/,
		);
		expect(d2.below).toBe(false);
		// Without the loose node both share the vertical line, walked in opposite directions so each
		// name stays on its own side; a vertical segment never reads right to left, so neither flips.
		const pair = twoDomains.slice(0, 4);
		const pairBounds = paddedBounds(pair, 20);
		const [p1, p2] = domainBorders(pair, cells(pair, pairBounds));
		const ys = (p: string) =>
			p.match(/[ML]\S+ (\S+)/g)?.map((m) => Number(m.split(" ")[1])) ?? [];
		expect(p2.labelPath).toMatch(/^M250 /);
		expect(p1.below).toBe(false);
		expect(p2.below).toBe(false);
		expect(ys(p1.labelPath)).toEqual([...ys(p2.labelPath)].reverse());
		const one = [quad[0]];
		expect(domainBorders(one, cells(one, paddedBounds(one, 20)))).toEqual([]);
	});
	it("flips a run that would read right to left and hangs the name below it", () => {
		const stacked: SketchNode[] = [
			{ ...box("a", 0, 0, "s1"), domainId: "top" },
			{ ...box("b", 0, 300, "s2"), domainId: "bottom" },
		];
		const stackedBounds = paddedBounds(stacked, 20);
		const borders = domainBorders(stacked, cells(stacked, stackedBounds));
		// The horizontal line between them: "top" is above so its name sits above, read left to right;
		// "bottom" would read right to left, so it is flipped and hangs below.
		expect(borders.find((b) => b.id === "top")).toMatchObject({ below: false });
		expect(borders.find((b) => b.id === "bottom")).toMatchObject({
			below: true,
		});
		for (const b of borders) {
			const [, x0, x1] = b.labelPath.match(/^M(\S+) \S+ L(\S+) \S+$/) ?? [];
			expect(Number(x0)).toBeLessThan(Number(x1));
		}
	});
});

/**
 * Every point of a closed cubic path, sampled `steps` times along each
 * segment, without the closing repeat of the start point.
 */
function samplePath(d: string, steps = 8): Point[] {
	const nums = (s: string) =>
		s
			.trim()
			.split(/[\s,]+/)
			.map(Number);
	const [head, ...curves] = d.replace(/ Z$/, "").split("C");
	let from = nums(head.slice(1)) as Point;
	const out: Point[] = [from];
	for (const curve of curves) {
		const [c1x, c1y, x1, y1, x, y] = nums(curve);
		const at = (t: number, i: number): number => {
			const u = 1 - t;
			const [c1, c2, p] = [[c1x, c1y][i], [x1, y1][i], [x, y][i]];
			return (
				u * u * u * from[i] +
				3 * u * u * t * c1 +
				3 * u * t * t * c2 +
				t * t * t * p
			);
		};
		for (let s = 1; s <= steps; s++)
			out.push([at(s / steps, 0), at(s / steps, 1)]);
		from = [x, y];
	}
	return out.slice(0, -1);
}

/** How far a point sits inside a node's ellipse: below 1 is inside it. */
const ellipseRadius = (n: SketchNode, [x, y]: Point) =>
	Math.hypot(
		(x - (n.x + n.width / 2)) / (n.width / 2),
		(y - (n.y + n.height / 2)) / (n.height / 2),
	);

/** The signed turn, in radians, at each vertex of the closed polygon through `points`. */
function turns(points: Point[]): number[] {
	const n = points.length;
	const edge = (i: number): Point => [
		points[(i + 1) % n][0] - points[i % n][0],
		points[(i + 1) % n][1] - points[i % n][1],
	];
	return points.map((_, i) => {
		const [a, b] = [edge(i), edge(i + 1)];
		return Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
	});
}

describe("the blob curve round a small or outlying node", () => {
	/** Three big nodes in a row and one small node far below them. */
	const outlier: SketchNode[] = [
		{ id: "a", x: 0, y: 0, width: 260, height: 160 },
		{ id: "b", x: 400, y: 0, width: 260, height: 160 },
		{ id: "c", x: 800, y: 0, width: 260, height: 160 },
		{ id: "small", x: 500, y: 620, width: 90, height: 40 },
	];
	const single: SketchNode[] = [
		{ id: "only", x: 0, y: 0, width: 120, height: 60 },
	];

	for (const [name, nodes] of [
		["a single node", single],
		["an outlying small node", outlier],
	] as const) {
		it(`curves round ${name} without a cusp, and clears every node`, () => {
			const { blob } = sketchBackdrop(nodes, 24);
			expect(blob.startsWith("M")).toBe(true);
			expect(blob.endsWith(" Z")).toBe(true);
			const points = samplePath(blob);
			const turn = turns(points);
			// The hull runs one way round, so the curve through it should too: a
			// cusp turns back on itself (the uniform spline reached -0.16 radians
			// for the single node) and a loop where the curve overshoots winds the
			// total past one turn. Sampling a path rounded to two decimals leaves a
			// couple of degrees of slack at the sharpest corners.
			for (const t of turn) expect(t).toBeGreaterThan(-0.1);
			expect(turn.reduce((sum, t) => sum + t, 0)).toBeCloseTo(2 * Math.PI, 1);
			for (const n of nodes)
				for (const p of points) expect(ellipseRadius(n, p)).toBeGreaterThan(1);
		});
	}
});
