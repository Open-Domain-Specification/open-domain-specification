import {
	type EdgeProps,
	getBezierPath,
	getSmoothStepPath,
	getStraightPath,
	Position,
} from "@xyflow/svelte";
import { floatingEdgeParams, type Rect, rectOf } from "./floating";
import { type DiagramOptions, diagramOptions } from "./options.svelte";

/** Both ends of an edge, as the Svelte Flow path helpers take them. */
export type EdgeEndpoints = {
	sourceX: number;
	sourceY: number;
	sourcePosition: Position;
	targetX: number;
	targetY: number;
	targetPosition: Position;
};

/** What an edge needs of an internal node: where it is and how big it measured. */
export type MeasuredNode = Parameters<typeof rectOf>[0];

/** Radius of a port badge or port handle, in flow pixels. */
export const PORT_RADIUS = 11;

/** Path string plus the label point, as every Svelte Flow path helper returns. */
export type EdgePath = [string, number, number, number, number];

/**
 * Where an edge starts and ends: the fixed handles Svelte Flow passed, or with
 * floating handles the facing sides of both nodes, which is undefined until
 * both are measured.
 */
export function edgeEndpoints(
	props: Pick<
		EdgeProps,
		| "sourceX"
		| "sourceY"
		| "sourcePosition"
		| "targetX"
		| "targetY"
		| "targetPosition"
	>,
	sourceNode: MeasuredNode | undefined,
	targetNode: MeasuredNode | undefined,
	handles: DiagramOptions["handles"] = diagramOptions.handles,
): EdgeEndpoints | undefined {
	if (handles !== "floating")
		return {
			sourceX: props.sourceX,
			sourceY: props.sourceY,
			sourcePosition: props.sourcePosition,
			targetX: props.targetX,
			targetY: props.targetY,
			targetPosition: props.targetPosition,
		};
	return sourceNode && targetNode
		? floatingEdgeParams(rectOf(sourceNode), rectOf(targetNode))
		: undefined;
}

/** The path for the ends in the edge style the diagram options ask for. */
export function edgePath(
	params: EdgeEndpoints,
	style: DiagramOptions["edges"] = diagramOptions.edges,
): EdgePath {
	switch (style) {
		case "straight":
			return getStraightPath(params);
		case "step":
			return getSmoothStepPath({ ...params, borderRadius: 0 });
		case "smoothstep":
			return getSmoothStepPath(params);
		default:
			return getBezierPath(params);
	}
}

/** Unit vector pointing away from a node at a handle on the given side. */
export const outward = (position: Position): { x: number; y: number } => {
	switch (position) {
		case Position.Left:
			return { x: -1, y: 0 };
		case Position.Right:
			return { x: 1, y: 0 };
		case Position.Top:
			return { x: 0, y: -1 };
		default:
			return { x: 0, y: 1 };
	}
};

/** A point moved `distance` away from the node an endpoint sits on. */
export const pushOut = (
	x: number,
	y: number,
	position: Position,
	distance: number,
) => {
	const n = outward(position);
	return { x: x + n.x * distance, y: y + n.y * distance };
};

/**
 * The ends moved outward so a port of `PORT_RADIUS` at each padded end sits
 * on the node border with the line starting at its rim rather than under it.
 * `source` and `target` say which ends carry a port.
 */
export function padEndpoints(
	params: EdgeEndpoints,
	ports: { source?: boolean; target?: boolean },
): EdgeEndpoints {
	const s = ports.source
		? pushOut(
				params.sourceX,
				params.sourceY,
				params.sourcePosition,
				2 * PORT_RADIUS,
			)
		: { x: params.sourceX, y: params.sourceY };
	const t = ports.target
		? pushOut(
				params.targetX,
				params.targetY,
				params.targetPosition,
				2 * PORT_RADIUS,
			)
		: { x: params.targetX, y: params.targetY };
	return {
		...params,
		sourceX: s.x,
		sourceY: s.y,
		targetX: t.x,
		targetY: t.y,
	};
}

/** Centre of the port badge at an endpoint: tangent to the node border, just outside it. */
export const portCentre = (x: number, y: number, position: Position) =>
	pushOut(x, y, position, PORT_RADIUS);

export type { Rect };
