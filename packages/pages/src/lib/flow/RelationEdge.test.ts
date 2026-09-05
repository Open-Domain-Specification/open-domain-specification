import { render, waitFor } from "@testing-library/svelte";
import { Position } from "@xyflow/svelte";
import { describe, expect, it, vi } from "vitest";
import { type Box, installXyflowTestEnv } from "../xyflow-test-env";
import Harness from "./EdgeHarness.svelte";
import { PORT_RADIUS } from "./edge-path";
import { diagramOptions } from "./options.svelte";
import RelationEdge from "./RelationEdge.svelte";

installXyflowTestEnv();

// Hoisted with the mock: the factory reads the map when the module under test loads.
const boxes = vi.hoisted<Record<string, Box | undefined>>(() => ({
	"#/a": { x: 0, y: 0, w: 100, h: 50 },
	"#/b": { x: 300, y: 120, w: 120, h: 60 },
}));
vi.mock("@xyflow/svelte", async (importOriginal) => ({
	...(await importOriginal<typeof import("@xyflow/svelte")>()),
	...(await import("../xyflow-test-env")).mockInternalNodeBoxes(boxes),
}));

const edge = (props: Record<string, unknown> = {}) =>
	render(Harness, {
		edge: RelationEdge,
		type: "relation-uses",
		label: "uses",
		...props,
	});
const edgePath = (c: Element) => c.querySelector(".svelte-flow__edge-path");
/** Where a port badge sits, from the data attributes the badge carries. */
const portAt = (el: Element | null) => [
	Number(el?.getAttribute("data-x")),
	Number(el?.getAttribute("data-y")),
];
const cardinality = (c: Element) =>
	c.querySelector(".port.cardinality") as HTMLElement | null;

describe("RelationEdge", () => {
	it('draws includes as a composition: solid line with a filled diamond at the whole, "1" there and the cardinality port at the part', async () => {
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
		const { container } = edge({
			type: "relation-includes",
			label: "has",
			data: { sourceLabel: "1", targetLabel: "*" },
		});
		await waitFor(() => expect(edgePath(container)).toBeTruthy());
		const path = edgePath(container) as SVGElement;
		expect(path).toHaveClass("includes");
		expect(path.getAttribute("marker-start")).toBe("url(#e-diamond)");
		expect(path.getAttribute("marker-end")).toBeNull();
		expect(path.getAttribute("style")).not.toContain("dasharray");
		expect(path).not.toHaveClass("dashed");
		expect(
			container.querySelector("marker#e-diamond .marker-fill"),
		).toBeTruthy();
		expect(container.querySelector(".edge-label")).toHaveTextContent("has");
		const card = container.querySelector(
			".port.cardinality.target",
		) as HTMLElement;
		expect(card.querySelector(".port-label")).toHaveTextContent("*");
		const whole = container.querySelector(
			".port.cardinality.source",
		) as HTMLElement;
		expect(whole.querySelector(".port-label")).toHaveTextContent("1");
		// Both ends carry a multiplicity, so the line runs from rim to rim.
		const d = path.getAttribute("d") ?? "";
		expect(d.startsWith(`M${10 + 2 * PORT_RADIUS},20`)).toBe(true);
		expect(d.endsWith(`${200 - 2 * PORT_RADIUS},80`)).toBe(true);
		expect(portAt(whole)).toEqual([10 + PORT_RADIUS, 20]);
		expect(portAt(card)).toEqual([200 - PORT_RADIUS, 80]);
	});

	it("draws references as an association and uses as a dashed dependency, both with an open arrow", async () => {
		const ref = edge({ type: "relation-references", label: "" });
		await waitFor(() => expect(edgePath(ref.container)).toBeTruthy());
		const refPath = edgePath(ref.container) as SVGElement;
		expect(refPath).toHaveClass("references");
		expect(refPath.getAttribute("marker-end")).toBe("url(#e-vee)");
		expect(refPath.getAttribute("marker-start")).toBeNull();
		expect(refPath.getAttribute("style")).not.toContain("dasharray");
		expect(refPath).not.toHaveClass("dashed");
		expect(ref.container.querySelector(".edge-label")).toBeNull();
		// No multiplicities: the line runs handle to handle.
		expect(refPath.getAttribute("d")?.startsWith("M10,20")).toBe(true);
		expect(refPath.getAttribute("d")?.endsWith("200,80")).toBe(true);
		expect(ref.container.querySelector(".port")).toBeNull();

		const uses = edge();
		await waitFor(() => expect(edgePath(uses.container)).toBeTruthy());
		const usesPath = edgePath(uses.container) as SVGElement;
		expect(usesPath).toHaveClass("uses");
		// The short dash pattern comes from the "dashed" class, paired with matching
		// keyframes in page.css, not an inline dasharray that would fight the animation.
		expect(usesPath).toHaveClass("dashed");
		expect(usesPath.getAttribute("style")).not.toContain("dasharray");
		expect(usesPath.getAttribute("marker-end")).toBe("url(#e-vee)");
		expect(cardinality(uses.container)).toBeNull();
	});

	it("draws an identity as a dashed dependency, stereotyped so it never reads as a uses", async () => {
		const held = edge({ type: "relation-identifies", label: "petId" });
		await waitFor(() => expect(edgePath(held.container)).toBeTruthy());
		const path = edgePath(held.container) as SVGElement;
		expect(path).toHaveClass("identifies");
		expect(path).toHaveClass("dashed");
		expect(path.getAttribute("marker-end")).toBe("url(#e-vee)");
		expect(held.container.querySelector(".edge-label")).toHaveTextContent(
			"«identifies» petId",
		);

		// An identity the map has no attribute name for says nothing extra.
		const bare = edge({ type: "relation-identifies", label: "" });
		await waitFor(() => expect(edgePath(bare.container)).toBeTruthy());
		expect(bare.container.querySelector(".edge-label")).toBeNull();
	});

	it("draws a kind as a generalisation: a solid line with a hollow triangle at the parent", async () => {
		const { container } = edge({ type: "relation-specialises", label: "" });
		await waitFor(() => expect(edgePath(container)).toBeTruthy());
		const path = edgePath(container) as SVGElement;
		expect(path).toHaveClass("specialises");
		expect(path).not.toHaveClass("dashed");
		expect(path.getAttribute("marker-end")).toBe("url(#e-triangle)");
		expect(path.getAttribute("marker-start")).toBeNull();
		// Hollow, not filled: the background shows through the triangle.
		const marker = container.querySelector("marker#e-triangle .marker-hollow");
		expect(marker).toBeTruthy();
		expect(marker?.getAttribute("d")).toBe("M0,0 L10,5 L0,10 Z");
		// The line says the whole of it: no role label, no multiplicity.
		expect(container.querySelector(".edge-label")).toBeNull();
		expect(cardinality(container)).toBeNull();
	});

	it("places the cardinality port on the side the edge enters from", async () => {
		const at = async (targetPosition: Position) => {
			const { container } = edge({
				data: { targetLabel: "1" },
				targetPosition,
			});
			await waitFor(() => expect(edgePath(container)).toBeTruthy());
			return portAt(cardinality(container));
		};
		expect(await at(Position.Right)).toEqual([200 + PORT_RADIUS, 80]);
		expect(await at(Position.Top)).toEqual([200, 80 - PORT_RADIUS]);
		expect(await at(Position.Bottom)).toEqual([200, 80 + PORT_RADIUS]);
	});

	it("follows the edge style and floats between the facing sides when the options say so", async () => {
		diagramOptions.set({ handles: "floating", edges: "straight" });
		const { container } = edge({ data: { targetLabel: "1" } });
		await waitFor(() => expect(edgePath(container)).toBeTruthy());
		const seen = new Set<string>();
		for (const edges of ["straight", "step", "smoothstep", "bezier"] as const) {
			diagramOptions.set({ edges });
			await waitFor(() => expect(diagramOptions.edges).toBe(edges));
			const d = edgePath(container)?.getAttribute("d") ?? "";
			expect(d).toMatch(/^M ?100[ ,]/);
			seen.add(d);
		}
		expect(seen.size).toBeGreaterThan(1);
		// The port follows the floating target end onto the target box's left side at x=300.
		expect(portAt(cardinality(container))[0]).toBe(300 - PORT_RADIUS);
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
	});

	it("renders nothing while floating and a node is missing", async () => {
		diagramOptions.set({ handles: "floating" });
		boxes["#/b"] = undefined;
		const { container } = edge({ label: "x", data: { targetLabel: "1" } });
		expect(edgePath(container)).toBeNull();
		expect(cardinality(container)).toBeNull();
		boxes["#/b"] = { x: 300, y: 120, w: 120, h: 60 };
		diagramOptions.set({ handles: "fixed" });
	});
});
