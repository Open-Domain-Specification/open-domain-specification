import { Position } from "@xyflow/svelte";
import { describe, expect, it } from "vitest";
import {
	edgeEndpoints,
	edgePath,
	outward,
	PORT_RADIUS,
	padEndpoints,
	portCentre,
} from "./edge-path";
import { diagramOptions } from "./options.svelte";

const props = {
	sourceX: 10,
	sourceY: 20,
	sourcePosition: Position.Right,
	targetX: 200,
	targetY: 80,
	targetPosition: Position.Left,
};
const node = (x: number, y: number, width: number, height: number) => ({
	internals: { positionAbsolute: { x, y } },
	measured: { width, height },
});

describe("edgeEndpoints", () => {
	it("returns the fixed handles unless the handles float", () => {
		expect(edgeEndpoints(props, undefined, undefined, "fixed")).toEqual(props);
		diagramOptions.set({ handles: "fixed" });
		expect(edgeEndpoints(props, undefined, undefined)).toEqual(props);
	});
	it("uses the facing sides of both measured nodes when floating, or nothing", () => {
		const a = node(0, 0, 100, 50);
		const b = node(300, 120, 120, 60);
		const ends = edgeEndpoints(props, a, b, "floating");
		expect(ends?.sourceX).toBe(100);
		expect(ends?.sourcePosition).toBe(Position.Right);
		expect(ends?.targetX).toBe(300);
		expect(edgeEndpoints(props, a, undefined, "floating")).toBeUndefined();
		expect(edgeEndpoints(props, undefined, b, "floating")).toBeUndefined();
		diagramOptions.set({ handles: "floating" });
		expect(edgeEndpoints(props, a, b)?.sourceX).toBe(100);
		diagramOptions.set({ handles: "fixed" });
	});
});

describe("edgePath", () => {
	it("draws each style the options offer, defaulting to the current option", () => {
		const seen = new Set<string>();
		for (const style of ["straight", "step", "smoothstep", "bezier"] as const)
			seen.add(edgePath(props, style)[0]);
		expect(seen.size).toBe(4);
		diagramOptions.set({ edges: "straight" });
		expect(edgePath(props)[0]).toBe(edgePath(props, "straight")[0]);
		diagramOptions.set({ edges: "bezier" });
	});
});

describe("ports", () => {
	it("points away from the node on every side", () => {
		expect(outward(Position.Left)).toEqual({ x: -1, y: 0 });
		expect(outward(Position.Right)).toEqual({ x: 1, y: 0 });
		expect(outward(Position.Top)).toEqual({ x: 0, y: -1 });
		expect(outward(Position.Bottom)).toEqual({ x: 0, y: 1 });
	});
	it("pads only the ends that carry a port, by a full port diameter", () => {
		const both = padEndpoints(props, { source: true, target: true });
		expect(both.sourceX).toBe(10 + 2 * PORT_RADIUS);
		expect(both.targetX).toBe(200 - 2 * PORT_RADIUS);
		expect(both.sourceY).toBe(20);
		const none = padEndpoints(props, {});
		expect(none).toEqual(props);
		const vertical = padEndpoints(
			{
				...props,
				sourcePosition: Position.Bottom,
				targetPosition: Position.Top,
			},
			{ source: true, target: true },
		);
		expect(vertical.sourceY).toBe(20 + 2 * PORT_RADIUS);
		expect(vertical.targetY).toBe(80 - 2 * PORT_RADIUS);
	});
	it("centres a port one radius outside its endpoint", () => {
		expect(portCentre(10, 20, Position.Right)).toEqual({
			x: 10 + PORT_RADIUS,
			y: 20,
		});
	});
});
