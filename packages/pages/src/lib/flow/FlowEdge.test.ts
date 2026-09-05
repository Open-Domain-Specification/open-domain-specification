import { render, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { type Box, installXyflowTestEnv } from "../xyflow-test-env";
import Harness from "./EdgeHarness.svelte";
import FlowEdge from "./FlowEdge.svelte";
import { ENDS_LABEL } from "./flow-graph";
import { diagramOptions } from "./options.svelte";

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
	render(Harness, { edge: FlowEdge, type: "flow", ...props });
const path = (c: Element) => c.querySelector(".svelte-flow__edge-path");
const label = (c: Element) => c.querySelector(".edge-label");

describe("FlowEdge", () => {
	it("draws a step as a plain unlabelled line between the fixed handles", async () => {
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
		const { container } = edge({ markerEnd: "arrow" });
		await waitFor(() => expect(path(container)).toBeTruthy());
		// No port at either end, so the line runs handle to handle unpadded.
		expect(path(container)?.getAttribute("d")?.startsWith("M10,20")).toBe(true);
		expect(path(container)?.getAttribute("d")?.endsWith("200,80")).toBe(true);
		expect(path(container)?.getAttribute("marker-end")).toBe("url('#arrow')");
		expect(label(container)).toBeNull();
	});

	it("labels what completes a process at the midpoint, so the dash is never read as a step", async () => {
		diagramOptions.set({ handles: "fixed", edges: "straight" });
		const { container } = edge({ label: ENDS_LABEL });
		await waitFor(() => expect(label(container)).toBeTruthy());
		expect(label(container)?.textContent).toBe("ends");
		expect(label(container)?.getAttribute("x")).toBe("105");
		expect(label(container)?.getAttribute("y")).toBe("50");
		diagramOptions.set({ edges: "bezier" });
	});

	it("follows the edge-style option and the floating anchors", async () => {
		diagramOptions.set({ handles: "floating", edges: "step" });
		const { container } = edge({ label: ENDS_LABEL });
		await waitFor(() => expect(path(container)).toBeTruthy());
		// The floating source leaves the source box's own edge, not the handle at (10, 20).
		expect(path(container)?.getAttribute("d")?.startsWith("M10,20")).toBe(
			false,
		);
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
	});

	it("renders nothing while floating and a node is missing", async () => {
		diagramOptions.set({ handles: "floating" });
		boxes["#/b"] = undefined;
		const { container } = edge({ label: ENDS_LABEL });
		expect(path(container)).toBeNull();
		expect(label(container)).toBeNull();
		boxes["#/b"] = { x: 300, y: 120, w: 120, h: 60 };
		diagramOptions.set({ handles: "fixed" });
	});
});
