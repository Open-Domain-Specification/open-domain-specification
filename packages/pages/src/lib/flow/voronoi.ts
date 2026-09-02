import { Delaunay } from "d3-delaunay";
import { centre as centreOf } from "./floating";

/**
 * Geometry for the sketch backdrop: a Voronoi tessellation of the node
 * centres, the boundaries between cells of different groups (the dashed
 * subdomain lines), the thicker borders between domains (the union of each
 * domain's subdomain cells) with a path for the domain name to run along,
 * an organic outer blob around every node, and a label position per group.
 * Pure functions over placed boxes in flow coordinates, so the backdrop
 * only has to read positions and draw paths.
 */
export type Point = [number, number];

/**
 * A placed node: top-left corner, size, the deepest group it belongs to (its
 * subdomain) and that group's parent (its domain).
 */
export type SketchNode = {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	groupId?: string;
	domainId?: string;
};

export type Segment = { a: Point; b: Point };

export type GroupLabel = { id: string; x: number; y: number };

/**
 * A domain's border: the longest straight stretch of its boundary, oriented
 * left to right so the name reads upright, and whether the name hangs below
 * the line (the domain lies below it) rather than sitting above.
 */
export type DomainBorder = { id: string; labelPath: string; below: boolean };

export type Backdrop = {
	/** Closed, smoothed outline around every node, as an SVG path. */
	blob: string;
	/** Every boundary between cells of different groups, as one SVG path. */
	boundaries: string;
	/** Every boundary between cells of different domains, as one SVG path. */
	domainBorders: string;
	domains: DomainBorder[];
	labels: GroupLabel[];
};

export const EMPTY_BACKDROP: Backdrop = {
	blob: "",
	boundaries: "",
	domainBorders: "",
	domains: [],
	labels: [],
};

/** Points sampled round each node's padded ellipse. */
const ELLIPSE_STEPS = 12;
/** The blob's perimeter resample step, as a multiple of the node padding. */
const BLOB_RESAMPLE_FACTOR = 1.5;
/** Vertical gap between a group's lowest node and its label. */
const LABEL_GAP = 18;
/** The Voronoi clip bounds' padding, as a multiple of the node padding. */
const BOUNDARY_BOUNDS_FACTOR = 2;

const EPS = 1e-6;
const same = (p: Point, q: Point) =>
	Math.abs(p[0] - q[0]) < EPS && Math.abs(p[1] - q[1]) < EPS;

const centre = (n: SketchNode): Point => {
	const c = centreOf(n);
	return [c.x, c.y];
};

/** The bounding box of every node, grown by `padding` on each side. */
function paddedBounds(
	nodes: SketchNode[],
	padding: number,
): [number, number, number, number] {
	let x0 = Number.POSITIVE_INFINITY;
	let y0 = Number.POSITIVE_INFINITY;
	let x1 = Number.NEGATIVE_INFINITY;
	let y1 = Number.NEGATIVE_INFINITY;
	for (const n of nodes) {
		x0 = Math.min(x0, n.x);
		y0 = Math.min(y0, n.y);
		x1 = Math.max(x1, n.x + n.width);
		y1 = Math.max(y1, n.y + n.height);
	}
	return [x0 - padding, y0 - padding, x1 + padding, y1 + padding];
}

const cross = (o: Point, a: Point, b: Point) =>
	(a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Convex hull by monotone chain, counter-clockwise, no repeated closing point. */
function convexHull(points: Point[]): Point[] {
	const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	if (sorted.length < 3) return sorted;
	const lower: Point[] = [];
	for (const p of sorted) {
		while (
			lower.length >= 2 &&
			cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
		)
			lower.pop();
		lower.push(p);
	}
	const upper: Point[] = [];
	for (const p of [...sorted].reverse()) {
		while (
			upper.length >= 2 &&
			cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
		)
			upper.pop();
		upper.push(p);
	}
	return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * Points on an ellipse hugging the node's padded box, so the hull around a
 * node bends round it instead of squaring off at the corners.
 */
function ellipsePoints(
	n: SketchNode,
	padding: number,
	steps = ELLIPSE_STEPS,
): Point[] {
	const [cx, cy] = centre(n);
	const rx = n.width / 2 + padding;
	const ry = n.height / 2 + padding;
	const out: Point[] = [];
	for (let i = 0; i < steps; i++) {
		const t = (i / steps) * Math.PI * 2;
		out.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
	}
	return out;
}

/**
 * Points every `step` along the closed polygon's perimeter, so the spline
 * through them bends evenly instead of overshooting at a sharp corner
 * between a long side and a short one.
 */
function resample(points: Point[], step: number): Point[] {
	if (points.length < 3) return points;
	const out: Point[] = [];
	let carry = 0;
	for (let i = 0; i < points.length; i++) {
		const a = points[i];
		const b = points[(i + 1) % points.length];
		const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
		for (let d = carry; d < len; d += step) {
			const t = d / len;
			out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
		}
		carry = (carry - len) % step;
		if (carry < 0) carry += step;
	}
	return out;
}

/** The outer blob's control points: the hull of every node's padded ellipse. */
function outerBlob(nodes: SketchNode[], padding: number): Point[] {
	const hull = convexHull(nodes.flatMap((n) => ellipsePoints(n, padding)));
	return resample(hull, padding * BLOB_RESAMPLE_FACTOR);
}

const f = (v: number) => Math.round(v * 100) / 100;

/**
 * A closed Catmull-Rom spline through the points as cubic Bézier commands.
 * Fewer than three points give a plain closed polyline (a dot or a line).
 */
function smoothPath(points: Point[]): string {
	if (points.length === 0) return "";
	if (points.length < 3)
		return `${points.map((p, i) => `${i ? "L" : "M"}${f(p[0])} ${f(p[1])}`).join(" ")} Z`;
	const n = points.length;
	const at = (i: number) => points[((i % n) + n) % n];
	let d = `M${f(points[0][0])} ${f(points[0][1])}`;
	for (let i = 0; i < n; i++) {
		const p0 = at(i - 1);
		const p1 = at(i);
		const p2 = at(i + 1);
		const p3 = at(i + 2);
		const c1: Point = [
			p1[0] + (p2[0] - p0[0]) / 6,
			p1[1] + (p2[1] - p0[1]) / 6,
		];
		const c2: Point = [
			p2[0] - (p3[0] - p1[0]) / 6,
			p2[1] - (p3[1] - p1[1]) / 6,
		];
		d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
	}
	return `${d} Z`;
}

type Cells = { polygons: Point[][]; neighbors: (i: number) => number[] };

/**
 * The Voronoi cells of the node centres clipped to `bounds`, without the
 * repeated closing point; empty cells for fewer than two nodes. Every centre
 * lies inside the bounds, so every cell has a polygon.
 */
function cells(
	nodes: SketchNode[],
	bounds: [number, number, number, number],
): Cells {
	if (nodes.length < 2)
		return { polygons: nodes.map(() => []), neighbors: () => [] };
	const voronoi = Delaunay.from(nodes.map(centre)).voronoi(bounds);
	return {
		polygons: nodes.map((_, i) =>
			(voronoi.cellPolygon(i) as Point[]).slice(0, -1),
		),
		neighbors: (i) => [...voronoi.neighbors(i)],
	};
}

/**
 * The edge two neighbouring cells share, from the first cell's vertices.
 * Voronoi neighbours share an edge by definition (d3 checks that after
 * clipping), so there is always one.
 */
function sharedEdge(cell: Point[], other: Point[]): Segment {
	const shared = (p: Point) => other.some((q) => same(p, q));
	const k = cell.findIndex(
		(a, i) => shared(a) && shared(cell[(i + 1) % cell.length]),
	);
	return { a: cell[k], b: cell[(k + 1) % cell.length] };
}

/**
 * The Voronoi edges between cells whose `key` differs, each once. With the
 * group as key they are the boundaries drawn dashed between subdomains; with
 * the domain, the thicker borders between domains.
 */
function boundariesBy(
	nodes: SketchNode[],
	{ polygons, neighbors }: Cells,
	key: (n: SketchNode) => string | undefined,
): Segment[] {
	const out: Segment[] = [];
	polygons.forEach((cell, i) => {
		for (const j of neighbors(i)) {
			if (j < i || key(nodes[i]) === key(nodes[j])) continue;
			out.push(sharedEdge(cell, polygons[j]));
		}
	});
	return out;
}

/** The Voronoi edges separating nodes of different groups: the dashed subdomain lines. */
const groupBoundaries = (nodes: SketchNode[], cells: Cells) =>
	boundariesBy(nodes, cells, (n) => n.groupId);

/** The Voronoi edges separating nodes of different domains: the thick domain borders. */
const domainBoundaries = (nodes: SketchNode[], cells: Cells) =>
	boundariesBy(nodes, cells, (n) => n.domainId);

/**
 * The border of each domain: its Voronoi boundary segments oriented so the
 * domain lies on the side text sits on when it runs along the path, of which
 * the longest carries the domain name, straight as a map boundary label. A
 * segment that would read right to left is reversed, and the name then
 * hangs below it.
 */
function domainBorders(
	nodes: SketchNode[],
	{ polygons, neighbors }: Cells,
): DomainBorder[] {
	const segments = new Map<string, Segment[]>();
	polygons.forEach((cell, i) => {
		const domain = nodes[i].domainId;
		if (!domain) return;
		for (const j of neighbors(i)) {
			if (nodes[j].domainId === domain) continue;
			const { a, b } = sharedEdge(cell, polygons[j]);
			// d3 walks a cell with its centre on the clockwise side in screen coordinates; text on a
			// path stands on the counter-clockwise side, so the edge is reversed to put the domain there.
			segments.set(domain, [...(segments.get(domain) ?? []), { a: b, b: a }]);
		}
	});
	const length = ({ a, b }: Segment) => Math.hypot(b[0] - a[0], b[1] - a[1]);
	return [...segments].map(([id, segs]) => {
		const [longest] = segs.sort((x, y) => length(y) - length(x));
		const below = longest.b[0] < longest.a[0];
		const { a, b } = below ? { a: longest.b, b: longest.a } : longest;
		return {
			id,
			labelPath: `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}`,
			below,
		};
	});
}

/**
 * Where each group's label sits: centred under the group's nodes, just below
 * the lowest of them, so it never lands on a node and stays in the group's
 * own cells, which reach at least halfway to the nearest neighbour.
 */
function groupLabels(nodes: SketchNode[], gap = LABEL_GAP): GroupLabel[] {
	const acc = new Map<string, { n: number; x: number; bottom: number }>();
	for (const n of nodes) {
		if (!n.groupId) continue;
		const cur = acc.get(n.groupId) ?? {
			n: 0,
			x: 0,
			bottom: Number.NEGATIVE_INFINITY,
		};
		acc.set(n.groupId, {
			n: cur.n + 1,
			x: cur.x + centre(n)[0],
			bottom: Math.max(cur.bottom, n.y + n.height),
		});
	}
	return [...acc].map(([id, { n, x, bottom }]) => ({
		id,
		x: x / n,
		y: bottom + gap,
	}));
}

const segmentsPath = (segments: Segment[]) =>
	segments
		.map(({ a, b }) => `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}`)
		.join(" ");

/** Everything the backdrop draws for the given nodes; empty paths for no nodes. */
export function sketchBackdrop(nodes: SketchNode[], padding: number): Backdrop {
	if (nodes.length === 0) return EMPTY_BACKDROP;
	const bounds = paddedBounds(nodes, padding * BOUNDARY_BOUNDS_FACTOR);
	const nodeCells = cells(nodes, bounds);
	return {
		blob: smoothPath(outerBlob(nodes, padding)),
		boundaries: segmentsPath(groupBoundaries(nodes, nodeCells)),
		domainBorders: segmentsPath(domainBoundaries(nodes, nodeCells)),
		domains: domainBorders(nodes, nodeCells),
		labels: groupLabels(nodes),
	};
}

/** Geometry helpers, exposed only for `voronoi.test.ts`'s direct unit coverage. */
export const internals = {
	centre,
	paddedBounds,
	convexHull,
	ellipsePoints,
	resample,
	outerBlob,
	smoothPath,
	sharedEdge,
	cells,
	groupBoundaries,
	domainBoundaries,
	domainBorders,
	groupLabels,
};
