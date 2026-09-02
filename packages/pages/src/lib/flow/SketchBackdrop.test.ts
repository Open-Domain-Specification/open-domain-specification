import { render, waitFor } from "@testing-library/svelte";
import type { Node } from "@xyflow/svelte";
import { describe, expect, it, vi } from "vitest";
import { installXyflowTestEnv } from "../xyflow-test-env";
import Harness from "./SketchBackdrop.harness.svelte";
import * as voronoi from "./voronoi";

installXyflowTestEnv();

const ctx = (
	id: string,
	x: number,
	y: number,
	parentId?: string,
	measured?: { width: number; height: number },
): Node => ({
	id,
	type: "default",
	position: { x, y },
	parentId,
	measured,
	data: { label: id, groupPath: "A / B" },
});

const nodes: Node[] = [
	{
		id: "cluster:a",
		type: "cluster",
		position: { x: 100, y: 100 },
		data: {},
		width: 400,
		height: 300,
	},
	ctx("#/a", 0, 0, "cluster:a", { width: 120, height: 60 }),
	ctx("#/b", 200, 0, "cluster:a"),
	ctx("#/c", 0, 400, undefined, { width: 120, height: 60 }),
	{
		id: "cluster:b",
		type: "cluster",
		position: { x: 300, y: 400 },
		data: {},
		width: 200,
		height: 100,
		hidden: true,
	},
	ctx("#/d", 0, 0, "cluster:b"),
];
const labels = new Map([["cluster:a", "Alpha"]]);

describe("SketchBackdrop", () => {
	it("draws the blob, dashed boundaries clipped to it, and a label per group under the nodes", async () => {
		const { container } = render(Harness, { nodes, groupLabels: labels });
		await waitFor(() =>
			expect(container.querySelector(".sketch-backdrop")).toBeTruthy(),
		);
		const svg = container.querySelector(".sketch-backdrop") as SVGElement;
		expect(svg.closest(".svelte-flow__viewport-back")).toBeTruthy();
		const blob = svg.querySelector(".blob")?.getAttribute("d") ?? "";
		expect(blob.startsWith("M")).toBe(true);
		expect(blob).toContain(" C");
		const boundaries = svg.querySelector(".boundaries");
		expect(boundaries?.getAttribute("d")).toContain(" L");
		expect(boundaries?.getAttribute("clip-path")).toMatch(
			/^url\(#sketch-clip-/,
		);
		const texts = [...svg.querySelectorAll(".region-label")].map(
			(t) => t.textContent,
		);
		// Members of a cluster sit relative to it, so the blob spans the cluster's absolute space.
		expect(texts).toEqual(["Alpha", "cluster:b"]);
		const alpha = svg.querySelector(".region-label") as SVGTextElement;
		expect(Number(alpha.getAttribute("x"))).toBeGreaterThan(100);
	});
	it("draws nothing but an empty svg for no nodes", async () => {
		const { container } = render(Harness, {
			nodes: [],
			groupLabels: labels,
			padding: 10,
		});
		await waitFor(() =>
			expect(container.querySelector(".sketch-backdrop")).toBeTruthy(),
		);
		expect(container.querySelector(".blob")?.getAttribute("d")).toBe("");
		expect(container.querySelectorAll(".region-label").length).toBe(0);
	});
	it("recomputes only when a re-render actually changes the boxes' geometry", async () => {
		const spy = vi.spyOn(voronoi, "sketchBackdrop");
		spy.mockClear();
		const { container, rerender } = render(Harness, {
			nodes,
			groupLabels: labels,
		});
		await waitFor(() =>
			expect(container.querySelector(".blob")?.getAttribute("d")).toMatch(/^M/),
		);
		expect(spy).toHaveBeenCalledTimes(1);

		// A fresh array with the same ids and positions: no real move, no recompute.
		await rerender({
			nodes: nodes.map((n) => ({ ...n })),
			groupLabels: labels,
		});
		await waitFor(() =>
			expect(container.querySelector(".blob")?.getAttribute("d")).toMatch(/^M/),
		);
		expect(spy).toHaveBeenCalledTimes(1);

		// Moving a node changes its rounded position, so the backdrop recomputes.
		await rerender({
			nodes: nodes.map((n) =>
				n.id === "#/a" ? { ...n, position: { x: 40, y: 40 } } : n,
			),
			groupLabels: labels,
		});
		await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));

		spy.mockRestore();
	});
});
