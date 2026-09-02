import { Position } from "@xyflow/svelte";

/** A node as a rectangle in flow coordinates. */
export type Rect = { x: number; y: number; width: number; height: number };

/** Where an edge leaves or enters a rectangle when aimed at another rectangle's centre. */
export type Anchor = { x: number; y: number; position: Position };

export const centre = (r: Rect) => ({
	x: r.x + r.width / 2,
	y: r.y + r.height / 2,
});

/**
 * Point on the border of `from` along the line towards the centre of `to`,
 * and which side it sits on so path helpers can pick a sensible curve.
 * Degenerate (zero-size or coincident) rectangles fall back to the centre.
 */
export function anchorTowards(from: Rect, to: Rect): Anchor {
	const a = centre(from);
	const b = centre(to);
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const hw = from.width / 2;
	const hh = from.height / 2;
	if ((dx === 0 && dy === 0) || hw === 0 || hh === 0)
		return { x: a.x, y: a.y, position: Position.Right };
	// Scale the direction so it reaches the border: whichever axis hits first.
	const scale = Math.min(
		hw / Math.abs(dx || Number.EPSILON),
		hh / Math.abs(dy || Number.EPSILON),
	);
	const x = a.x + dx * scale;
	const y = a.y + dy * scale;
	const horizontal = Math.abs(dx) * hh >= Math.abs(dy) * hw;
	const position = horizontal
		? dx > 0
			? Position.Right
			: Position.Left
		: dy > 0
			? Position.Bottom
			: Position.Top;
	return { x, y, position };
}

/** A Svelte Flow internal node as a rectangle; unmeasured nodes count as zero-size. */
export function rectOf(node: {
	internals: { positionAbsolute: { x: number; y: number } };
	measured: { width?: number; height?: number };
}): Rect {
	return {
		...node.internals.positionAbsolute,
		width: node.measured.width ?? 0,
		height: node.measured.height ?? 0,
	};
}

/** Both ends of a floating edge between two rectangles. */
export function floatingEdgeParams(source: Rect, target: Rect) {
	const s = anchorTowards(source, target);
	const t = anchorTowards(target, source);
	return {
		sourceX: s.x,
		sourceY: s.y,
		sourcePosition: s.position,
		targetX: t.x,
		targetY: t.y,
		targetPosition: t.position,
	};
}
