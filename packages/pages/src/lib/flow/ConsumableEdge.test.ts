import { render, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { type Box, installXyflowTestEnv } from "../xyflow-test-env";
import ConsumableEdge from "./ConsumableEdge.svelte";
import Harness from "./EdgeHarness.svelte";
import { PORT_RADIUS } from "./edge-path";
import { diagramOptions } from "./options.svelte";

installXyflowTestEnv();

const { slotId, provider, consumer } = vi.hoisted(() => ({
	slotId: "#/b/provides/reserve_pet",
	provider: (): Box => ({
		x: 300,
		y: 20,
		w: 120,
		h: 60,
		handles: [{ id: "#/b/provides/reserve_pet", x: -11, y: 23, w: 22, h: 22 }],
	}),
	/** The consumer with its socket for the same consumable on its right edge. */
	consumer: (): Box => ({
		x: 0,
		y: 0,
		w: 100,
		h: 50,
		handles: [
			{
				id: "#/b/provides/reserve_pet",
				type: "source",
				x: 89,
				y: 14,
				w: 22,
				h: 22,
			},
		],
	}),
}));
// Hoisted with the mock: the factory reads the map when the module under test loads.
const boxes = vi.hoisted<Record<string, Box | undefined>>(() => ({
	"#/a": { x: 0, y: 0, w: 100, h: 50 },
	"#/b": provider(),
}));
vi.mock("@xyflow/svelte", async (importOriginal) => ({
	...(await importOriginal<typeof import("@xyflow/svelte")>()),
	...(await import("../xyflow-test-env")).mockInternalNodeBoxes(boxes),
}));

const edge = (props: Record<string, unknown> = {}) =>
	render(Harness, {
		edge: ConsumableEdge,
		type: "consumable",
		label: "Reserve Pet",
		targetHandleId: slotId,
		sourceHandleId: slotId,
		...props,
	});
const pathD = (c: Element) => c.querySelector("path")?.getAttribute("d") ?? "";
/** Where a port badge sits, from the data attributes the badge carries. */
const portAt = (el: Element | null) => [
	Number(el?.getAttribute("data-x")),
	Number(el?.getAttribute("data-y")),
];
const port = (c: Element, which: string) =>
	c.querySelector(`.port.${which}`) as HTMLElement | null;

describe("ConsumableEdge as an assembly connector", () => {
	it("runs from the socket's rim to the lollipop's rim with no arrowhead and no port badges, in both handle modes", async () => {
		diagramOptions.set({ handles: "fixed", edges: "straight" });
		boxes["#/a"] = consumer();
		const { container } = edge({
			data: {
				sourceLabel: "anti-corruption-layer",
				targetLabel: "open-host-service",
			},
		});
		await waitFor(() => expect(container.querySelector("path")).toBeTruthy());
		// Socket centre (100,25) plus the port radius; lollipop centre (300,54) less it.
		expect(pathD(container)).toBe(
			`M ${100 + 2 * PORT_RADIUS},25L ${300 - 2 * PORT_RADIUS},54`,
		);
		expect(container.querySelector("path")).toHaveClass("assembly");
		expect(container.querySelector("path")?.getAttribute("marker-end")).toBe(
			null,
		);
		expect(container.querySelector(".port")).toBeNull();
		diagramOptions.set({ handles: "floating" });
		await waitFor(() => expect(diagramOptions.handles).toBe("floating"));
		expect(pathD(container).startsWith(`M ${100 + 2 * PORT_RADIUS},25`)).toBe(
			true,
		);
		boxes["#/a"] = { x: 0, y: 0, w: 100, h: 50 };
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
	});
});

describe("ConsumableEdge without a measured socket", () => {
	it("lands on the slot handle's rim, names the consumable and draws the consumer pattern as a port", async () => {
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
		const { container } = edge({
			data: {
				sourceLabel: "anti-corruption-layer",
				targetLabel: "open-host-service",
			},
		});
		await waitFor(() => expect(container.querySelector("path")).toBeTruthy());
		// Fixed source handle at (10,20) plus the port; the target is the slot handle centre (300,54) less its radius.
		expect(pathD(container).startsWith(`M${10 + 2 * PORT_RADIUS},20`)).toBe(
			true,
		);
		expect(pathD(container).endsWith(`${300 - PORT_RADIUS * 2},54`)).toBe(true);
		expect(container.querySelector(".edge-label")?.textContent).toBe(
			"Reserve Pet",
		);
		const consumer = port(container, "consumer") as HTMLElement;
		expect(consumer.querySelector(".port-label")?.textContent).toBe("ACL");
		expect(consumer.getAttribute("title")).toBe("anti-corruption-layer");
		expect(portAt(consumer)).toEqual([10 + PORT_RADIUS, 20]);
		// The slot handle already shows the provider pattern, so the edge draws none.
		expect(port(container, "provider")).toBeNull();
		for (const edges of ["straight", "step", "smoothstep", "bezier"] as const) {
			diagramOptions.set({ edges });
			await waitFor(() => expect(diagramOptions.edges).toBe(edges));
			expect(pathD(container)).toBeTruthy();
		}
	});
	it("shows what makes the consumption on hover, and nothing when it is the whole consumer", async () => {
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
		const { container } = edge({
			data: { sourceLabel: "conformist", by: ["ReservePet", "MarkPetSold"] },
		});
		await waitFor(() => expect(container.querySelector("path")).toBeTruthy());
		expect(container.querySelector(".edge-label title")?.textContent).toBe(
			"Made by ReservePet, MarkPetSold",
		);
		const { container: whole } = edge({ data: { by: [] } });
		await waitFor(() => expect(whole.querySelector("path")).toBeTruthy());
		expect(whole.querySelector(".edge-label title")).toBeNull();
	});
	it("omits what it has none for and falls back to the fixed target, drawing the provider port itself, when the slot handle is not measured or not named", async () => {
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
		boxes["#/b"] = { ...provider(), handles: undefined };
		const { container } = edge({ label: "" });
		await waitFor(() => expect(container.querySelector("path")).toBeTruthy());
		expect(container.querySelector(".edge-label")).toBeNull();
		expect(container.querySelector(".port")).toBeNull();
		expect(pathD(container).startsWith("M10,20")).toBe(true);
		expect(pathD(container).endsWith("200,80")).toBe(true);
		const { container: withPort } = edge({
			label: "",
			data: { targetLabel: "published-language" },
		});
		await waitFor(() => expect(withPort.querySelector("path")).toBeTruthy());
		expect(
			port(withPort, "provider")?.querySelector(".port-label")?.textContent,
		).toBe("PL");
		expect(portAt(port(withPort, "provider"))).toEqual([200 - PORT_RADIUS, 80]);
		expect(pathD(withPort).endsWith(`${200 - 2 * PORT_RADIUS},80`)).toBe(true);
		boxes["#/b"] = provider();
		const { container: noSlots } = edge({ data: {}, targetHandleId: null });
		await waitFor(() => expect(noSlots.querySelector("path")).toBeTruthy());
		expect(pathD(noSlots).endsWith("200,80")).toBe(true);
		boxes["#/b"] = { ...provider(), handles: [] };
		const { container: noHandles } = edge();
		await waitFor(() => expect(noHandles.querySelector("path")).toBeTruthy());
		expect(pathD(noHandles).endsWith("200,80")).toBe(true);
		boxes["#/b"] = undefined;
		const { container: noTarget } = edge();
		await waitFor(() => expect(noTarget.querySelector("path")).toBeTruthy());
		expect(pathD(noTarget).endsWith("200,80")).toBe(true);
		boxes["#/b"] = provider();
	});
	it("slides the consumer end and its port to face the provider in floating mode, or the fixed target when the provider is unmeasured", async () => {
		diagramOptions.set({ handles: "floating", edges: "bezier" });
		const { container } = edge({ data: { sourceLabel: "conformist" } });
		await waitFor(() => expect(container.querySelector("path")).toBeTruthy());
		// The consumer box's right edge is at x=100, not the fixed handle at x=10.
		expect(pathD(container).startsWith(`M${100 + 2 * PORT_RADIUS}`)).toBe(true);
		expect(portAt(port(container, "consumer"))[0]).toBe(100 + PORT_RADIUS);
		expect(pathD(container).endsWith(`${300 - 2 * PORT_RADIUS},54`)).toBe(true);
		boxes["#/b"] = { ...provider(), handles: undefined };
		const { container: noSlot } = edge();
		await waitFor(() => expect(noSlot.querySelector("path")).toBeTruthy());
		expect(pathD(noSlot).startsWith("M100")).toBe(true);
		expect(pathD(noSlot).endsWith("300,")).toBe(false);
		expect(pathD(noSlot).endsWith("200,80")).toBe(false);
		boxes["#/b"] = undefined;
		const { container: noTarget } = edge();
		await waitFor(() => expect(noTarget.querySelector("path")).toBeTruthy());
		// With no provider to face, the consumer end faces the fixed target point.
		expect(pathD(noTarget).startsWith("M100")).toBe(true);
		expect(pathD(noTarget).endsWith("200,80")).toBe(true);
		boxes["#/b"] = provider();
		boxes["#/a"] = undefined;
		const { container: noSource } = edge();
		await waitFor(() => expect(noSource.querySelector("path")).toBeTruthy());
		expect(pathD(noSource).startsWith("M10,20")).toBe(true);
		boxes["#/a"] = { x: 0, y: 0, w: 100, h: 50 };
		diagramOptions.set({ handles: "fixed" });
	});
	it("places ports on the side each end sits on", async () => {
		const { Position } = await import("@xyflow/svelte");
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
		boxes["#/b"] = { ...provider(), handles: undefined };
		const { container } = edge({
			data: { sourceLabel: "conformist", targetLabel: "published-language" },
			sourcePosition: Position.Top,
			targetPosition: Position.Bottom,
		});
		await waitFor(() => expect(container.querySelector("path")).toBeTruthy());
		expect(portAt(port(container, "consumer"))).toEqual([10, 20 - PORT_RADIUS]);
		expect(portAt(port(container, "provider"))).toEqual([
			200,
			80 + PORT_RADIUS,
		]);
		boxes["#/b"] = provider();
	});
});
