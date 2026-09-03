import { PATTERNS } from "@open-domain-specification/core";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { diagramOptions } from "../flow/options.svelte";
import { type Box, installXyflowTestEnv } from "../xyflow-test-env";
import Harness from "./DispositionEdge.harness.svelte";

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

const badges = (c: Element) => [
	...c.querySelectorAll<HTMLElement>(".disposition-badge"),
];
const drawn = async (c: Element) =>
	waitFor(() => expect(c.querySelector("path")).toBeTruthy());

describe("DispositionEdge", () => {
	it("marks a refactor badge with the warning class and keeps the shipped role text", async () => {
		const { container } = render(Harness, {
			label: "U/D",
			data: {
				sourceLabel: "OHS",
				targetLabel: "ACL",
				disposition: "refactor" as const,
				summary: "Should become an event.",
			},
		});
		await drawn(container);
		expect(container.querySelector(".stereotype")?.textContent).toBe("U/D");
		const [up, down] = badges(container);
		expect(up).toHaveClass("refactor", "upstream");
		expect(down).toHaveClass("refactor", "downstream");
		expect(up).toHaveAttribute(
			"title",
			`Open Host Service — ${PATTERNS["open-host-service"].summary}\nShould become an event.`,
		);
		expect(up.querySelector("button")?.textContent).toBe("OHS");
	});

	it("outlines a tolerated badge and leaves a by-design one unmarked", async () => {
		const tolerated = render(Harness, {
			data: { sourceLabel: "PL", disposition: "tolerated" as const },
		});
		await drawn(tolerated.container);
		expect(badges(tolerated.container)[0]).toHaveClass("tolerated");
		tolerated.unmount();

		const plain = render(Harness, {
			data: { sourceLabel: "PL", disposition: "by-design" as const },
		});
		await drawn(plain.container);
		const [badge] = badges(plain.container);
		expect(badge).not.toHaveClass("tolerated", "refactor");
		// With no evidence summary the hover is just the pattern's own meaning.
		expect(badge).toHaveAttribute(
			"title",
			`Published Language — ${PATTERNS["published-language"].summary}`,
		);
	});

	it("reports the badge's flow coordinates when it is clicked", async () => {
		const onBadgeClick = vi.fn();
		const { container } = render(Harness, {
			data: { sourceLabel: "OHS", targetLabel: "ACL", onBadgeClick },
		});
		await drawn(container);
		const [up, down] = badges(container);
		await fireEvent.click(up.querySelector("button") as HTMLElement);
		expect(onBadgeClick).toHaveBeenCalledWith({
			x: Number(up.getAttribute("data-x")),
			y: Number(up.getAttribute("data-y")),
		});
		await fireEvent.click(down.querySelector("button") as HTMLElement);
		expect(onBadgeClick).toHaveBeenCalledTimes(2);
	});

	it("does nothing on click when no handler is wired, and draws no badge without a label", async () => {
		const { container } = render(Harness, {
			data: { sourceLabel: "OHS" },
		});
		await drawn(container);
		const marks = badges(container);
		expect(marks).toHaveLength(1);
		await fireEvent.click(marks[0].querySelector("button") as HTMLElement);
		expect(marks[0]).toBeInTheDocument();
	});

	it("keeps the Graphviz colour of a symmetric stereotype and draws no stereotype text without a label", async () => {
		const { container } = render(Harness, { label: "SK" });
		await drawn(container);
		expect(container.querySelector("path")?.getAttribute("style")).toContain(
			"rgb(141, 110, 99)",
		);
	});

	it("draws neither a stereotype nor a badge when the edge carries no label", async () => {
		const { container } = render(Harness, { data: {} });
		await drawn(container);
		expect(container.querySelector(".stereotype")).toBeNull();
		expect(badges(container)).toHaveLength(0);
	});

	it("draws nothing at all until both of its nodes have been measured", () => {
		// Only floating handles need the measurements; fixed ends come from the props.
		diagramOptions.set({ handles: "floating" });
		boxes["#/b"] = undefined;
		const { container } = render(Harness, { label: "U/D", data: {} });
		expect(container.querySelector("path")).toBeNull();
		boxes["#/b"] = { x: 300, y: 120, w: 120, h: 60 };
		diagramOptions.set({ handles: "fixed" });
	});
});
