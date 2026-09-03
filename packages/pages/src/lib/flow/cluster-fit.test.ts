import type { Node } from "@xyflow/svelte";
import { describe, expect, it } from "vitest";
import { absoluteBox, absolutePosition, fitClusters } from "./cluster-fit";

const leaf = (
	id: string,
	x: number,
	y: number,
	parentId?: string,
	measured?: { width: number; height: number },
): Node => ({
	id,
	type: "context",
	position: { x, y },
	parentId,
	measured,
	data: { label: id, icon: "x" },
});
const cluster = (
	id: string,
	x: number,
	y: number,
	parentId?: string,
): Node => ({
	id,
	type: "cluster",
	position: { x, y },
	parentId,
	width: 10,
	height: 10,
	data: { label: id, depth: 0 },
});

describe("absolutePosition and absoluteBox", () => {
	it("adds up the parent chain and measures or estimates the size", () => {
		const nodes = [
			cluster("ws", 100, 100),
			cluster("dom", 20, 30, "ws"),
			leaf("a", 5, 5, "dom", { width: 50, height: 40 }),
			leaf("b", 1, 2),
		];
		expect(absolutePosition(nodes, nodes[2])).toEqual({ x: 125, y: 135 });
		expect(absoluteBox(nodes, nodes[2])).toEqual({
			x: 125,
			y: 135,
			width: 50,
			height: 40,
		});
		const estimated = absoluteBox(nodes, nodes[3]);
		expect(estimated).toMatchObject({ x: 1, y: 2 });
		expect(estimated.width).toBeGreaterThan(0);
		expect(estimated.height).toBeGreaterThan(0);
	});
});

describe("fitClusters", () => {
	it("returns the same array when there are no clusters", () => {
		const nodes = [leaf("a", 0, 0)];
		expect(fitClusters(nodes)).toBe(nodes);
	});

	it("wraps each cluster round its members, parents round fitted children, keeping leaves in place", () => {
		const nodes = [
			cluster("ws", 0, 0),
			cluster("dom", 0, 0, "ws"),
			leaf("a", 100, 100, "dom", { width: 50, height: 40 }),
			leaf("b", 400, 300, "ws", { width: 60, height: 30 }),
		];
		const fitted = fitClusters(nodes);
		const byId = new Map(fitted.map((n) => [n.id, n]));
		const dom = byId.get("dom")!;
		const ws = byId.get("ws")!;
		// dom hugs a with the padding; its position is relative to ws.
		expect(absolutePosition(fitted, dom)).toEqual({ x: 84, y: 72 });
		expect(dom.width).toBe(50 + 32);
		expect(dom.height).toBe(40 + 28 + 16);
		// ws spans the fitted dom box and b.
		expect(absolutePosition(fitted, ws)).toEqual({ x: 68, y: 44 });
		expect(ws.width).toBe(400 + 60 + 16 - 68);
		expect(ws.height).toBe(300 + 30 + 16 - 44);
		// Leaves keep their absolute positions though their offsets changed.
		expect(absolutePosition(fitted, byId.get("a")!)).toEqual({
			x: 100,
			y: 100,
		});
		expect(absolutePosition(fitted, byId.get("b")!)).toEqual({
			x: 400,
			y: 300,
		});
		// A second pass changes nothing and hands back the same leaf objects.
		const again = fitClusters(fitted);
		expect(again.find((n) => n.id === "a")).toBe(byId.get("a"));
		expect(again.find((n) => n.id === "ws")).toMatchObject({
			position: ws.position,
			width: ws.width,
			height: ws.height,
		});
	});

	it("leaves an empty cluster where it is", () => {
		const nodes = [
			cluster("ws", 7, 9),
			cluster("empty", 3, 4, "ws"),
			{
				...cluster("unsized", 1, 1, "ws"),
				width: undefined,
				height: undefined,
			},
		];
		const fitted = fitClusters(nodes);
		expect(absolutePosition(fitted, fitted[1])).toEqual({ x: 10, y: 13 });
		expect(fitted[1]).toMatchObject({ width: 10, height: 10 });
		expect(absolutePosition(fitted, fitted[2])).toEqual({ x: 8, y: 10 });
		expect(fitted[2]).toMatchObject({ width: 0, height: 0 });
	});
});
