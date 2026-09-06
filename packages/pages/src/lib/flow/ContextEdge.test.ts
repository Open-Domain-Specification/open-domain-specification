import { PATTERNS } from "@open-domain-specification/core";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
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
			[
				`Open Host Service — ${PATTERNS["open-host-service"].summary}`,
				`Published Language — ${PATTERNS["published-language"].summary}`,
			].join("\n"),
		);
		expect(down.querySelector(".port-label")?.textContent).toBe("ACL");
		expect(down.getAttribute("title")).toBe(
			`Anti-Corruption Layer — ${PATTERNS["anti-corruption-layer"].summary}`,
		);
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
	// Two agreements between one pair in one direction are two lines, and the
	// stereotype badge carries the name that tells them apart (card 103).
	it("names the agreement on the stereotype badge when the pair holds two", async () => {
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
		const { container } = edge({
			label: "U/D",
			data: { name: "Legacy Feed", summary: "Should become an event." },
		});
		await waitFor(() => expect(container.querySelector("path")).toBeTruthy());
		const stereotype = container.querySelector(".stereotype");
		expect(stereotype?.textContent).toBe("U/D · Legacy Feed");
		expect(stereotype).toHaveAttribute(
			"title",
			"Legacy Feed\nShould become an event.",
		);
	});

	it("colours symmetric stereotypes and omits ports and labels it has none for", async () => {
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
		const { container } = edge({ label: "SK" });
		await waitFor(() => expect(container.querySelector("path")).toBeTruthy());
		expect(container.querySelector("path")?.getAttribute("style")).toContain(
			"stroke: rgb(141, 110, 99)",
		);
		// A symmetric relationship gives neither side a role, so the stereotype is
		// the only badge it draws.
		expect(container.querySelector(".port.role")).toBeNull();
		expect(container.querySelector(".port.stereotype")).toBeTruthy();
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

/**
 * The evidence layer on the same edge (RFC-002 section 4.2). These were card
 * 19's `DispositionEdge` cases; the marks now ride on the shipped edge, so
 * they belong here.
 */
describe("ContextEdge disposition marks", () => {
	const badges = (c: Element) => [...c.querySelectorAll<HTMLElement>(".port")];

	it("marks every badge of a refactor intent and hovers to the pattern then the evidence", async () => {
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
		const { container } = edge({
			label: "U/D",
			data: {
				sourceLabel: "OHS",
				targetLabel: "ACL",
				disposition: "refactor",
				summary: "Should become an event.",
			},
		});
		await waitFor(() => expect(container.querySelector("path")).toBeTruthy());
		const [stereotype, up, down] = badges(container);
		for (const badge of [stereotype, up, down])
			expect(badge).toHaveClass("refactor");
		// The stereotype hovers to what is known; the roles name their patterns first.
		expect(stereotype).toHaveAttribute("title", "Should become an event.");
		expect(up).toHaveAttribute(
			"title",
			`Open Host Service — ${PATTERNS["open-host-service"].summary}\nShould become an event.`,
		);
		expect(down.querySelector(".port-label")?.textContent).toBe("ACL");
	});

	it("outlines a tolerated badge and leaves a by-design one exactly as it was", async () => {
		const tolerated = edge({
			label: "SK",
			data: { disposition: "tolerated", summary: "Living with it." },
		});
		await waitFor(() =>
			expect(tolerated.container.querySelector("path")).toBeTruthy(),
		);
		expect(badges(tolerated.container)[0]).toHaveClass("tolerated");
		tolerated.unmount();

		const plain = edge({
			label: "U/D",
			data: { sourceLabel: "PL", disposition: "by-design" },
		});
		await waitFor(() =>
			expect(plain.container.querySelector("path")).toBeTruthy(),
		);
		const [, role] = badges(plain.container);
		expect(role).not.toHaveClass("tolerated");
		expect(role).not.toHaveClass("refactor");
		// With no evidence summary the hover is just the pattern's own meaning.
		expect(role).toHaveAttribute(
			"title",
			`Published Language — ${PATTERNS["published-language"].summary}`,
		);
	});

	it("reports each badge's flow coordinates when it is clicked", async () => {
		const onBadgeClick = vi.fn();
		const { container } = edge({
			label: "C/S",
			data: { sourceLabel: "OHS", targetLabel: "ACL", onBadgeClick },
		});
		await waitFor(() => expect(container.querySelector("path")).toBeTruthy());
		for (const badge of badges(container)) {
			await fireEvent.click(badge.querySelector("button") as HTMLElement);
			const [x, y] = portAt(badge);
			expect(onBadgeClick).toHaveBeenLastCalledWith({ x, y });
		}
		expect(onBadgeClick).toHaveBeenCalledTimes(3);
	});

	it("leaves a badge with nothing to disclose inert, as it has always been", async () => {
		const { container } = edge({ label: "P", data: { sourceLabel: "OHS" } });
		await waitFor(() => expect(container.querySelector("path")).toBeTruthy());
		for (const badge of badges(container)) {
			expect(badge).not.toHaveClass("intent");
			expect(badge.querySelector("button")).toBeNull();
			expect(badge.querySelector("span.port-label")).toBeTruthy();
		}
	});
});
