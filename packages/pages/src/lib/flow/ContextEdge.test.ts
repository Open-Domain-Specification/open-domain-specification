import { render, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { type Box, installXyflowTestEnv } from "../xyflow-test-env";
import ContextEdge from "./ContextEdge.svelte";
import Harness from "./EdgeHarness.svelte";
import { PORT_RADIUS } from "./edge-path";
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

const edge = (props: Record<string, unknown>) =>
	render(Harness, { edge: ContextEdge, type: "context", ...props });
const pathD = (c: Element) => c.querySelector("path")?.getAttribute("d") ?? "";
/** Where a port badge sits, from the data attributes the badge carries. */
const portAt = (el: Element | null) => [
	Number(el?.getAttribute("data-x")),
	Number(el?.getAttribute("data-y")),
];

describe("ContextEdge", () => {
	it("draws the stereotype in the middle and the roles as ports at each end in fixed mode", async () => {
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
		const { container } = edge({
			label: "U/D",
			style: "stroke-dasharray: 5 4",
			data: { sourceLabel: "OHS+PL", targetLabel: "ACL" },
		});
		await waitFor(() => expect(container.querySelector("path")).toBeTruthy());
		expect(container.querySelector(".stereotype")?.textContent).toBe("U/D");
		const up = container.querySelector(".port.upstream") as HTMLElement;
		const down = container.querySelector(".port.downstream") as HTMLElement;
		expect(up.querySelector(".port-label")?.textContent).toBe("OHS+PL");
		expect(up.getAttribute("title")).toBe(
			"open-host-service + published-language",
		);
		expect(down.querySelector(".port-label")?.textContent).toBe("ACL");
		expect(down.getAttribute("title")).toBe("anti-corruption-layer");
		// Ports sit just outside the handles and the line starts at their rim.
		expect(portAt(up)).toEqual([10 + PORT_RADIUS, 20]);
		expect(portAt(down)).toEqual([200 - PORT_RADIUS, 80]);
		expect(pathD(container).startsWith(`M${10 + 2 * PORT_RADIUS},20`)).toBe(
			true,
		);
		expect(pathD(container).endsWith(`${200 - 2 * PORT_RADIUS},80`)).toBe(true);
		expect(container.querySelector("path")?.getAttribute("style")).toContain(
			"stroke-dasharray",
		);
		for (const edges of ["straight", "step", "smoothstep", "bezier"] as const) {
			diagramOptions.set({ edges });
			await waitFor(() => expect(diagramOptions.edges).toBe(edges));
			expect(pathD(container)).toBeTruthy();
		}
	});
	it("colours symmetric stereotypes and omits ports and labels it has none for", async () => {
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
		const { container } = edge({ label: "SK" });
		await waitFor(() => expect(container.querySelector("path")).toBeTruthy());
		expect(container.querySelector("path")?.getAttribute("style")).toContain(
			"stroke: rgb(141, 110, 99)",
		);
		expect(container.querySelector(".port")).toBeNull();
		// No ports, so the line runs handle to handle.
		expect(pathD(container).startsWith("M10,20")).toBe(true);
		const { container: plain } = edge({ label: "" });
		await waitFor(() => expect(plain.querySelector("path")).toBeTruthy());
		expect(plain.querySelector(".stereotype")).toBeNull();
		expect(plain.querySelector("path")?.getAttribute("style")).toBeFalsy();
	});
	it("attaches at the facing sides in floating mode, ports following, and draws nothing while a node is missing", async () => {
		diagramOptions.set({ handles: "floating", edges: "bezier" });
		const { container } = edge({
			label: "U/D",
			data: { sourceLabel: "OHS", targetLabel: "CF" },
		});
		await waitFor(() => expect(container.querySelector("path")).toBeTruthy());
		// The source box's right edge is at x=100, not the fixed handle at x=10; the port sits there.
		expect(pathD(container).startsWith(`M${100 + 2 * PORT_RADIUS}`)).toBe(true);
		expect(portAt(container.querySelector(".port.upstream"))[0]).toBe(
			100 + PORT_RADIUS,
		);
		boxes["#/b"] = undefined;
		const { container: missing } = edge({ label: "P" });
		expect(missing.querySelector("path")).toBeNull();
		boxes["#/b"] = { x: 300, y: 120, w: 120, h: 60 };
		diagramOptions.set({ handles: "fixed" });
	});
});
