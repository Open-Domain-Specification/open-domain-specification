import { ODSContextMap } from "@open-domain-specification/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import { contextGraph } from "../flow/graph";
import { installXyflowTestEnv } from "../xyflow-test-env";
import Harness from "./DiagramFigure.harness.svelte";

installXyflowTestEnv();

describe("DiagramFigure", () => {
	it("says what would fill it, with no hairlines, when the graph is empty", () => {
		render(Harness, {
			model: petstoreModel(),
			caption: "Context map",
			emptyText: "No bounded contexts yet.",
			graph: { nodes: [], edges: [], groups: [] },
		});
		expect(screen.getByText("No bounded contexts yet.")).toHaveClass("empty");
		expect(document.querySelector("figure.diagram")).not.toBeInTheDocument();
	});

	it("is the canvas between two hairlines with the caption below it", () => {
		const model = petstoreModel();
		render(Harness, {
			model,
			caption: "Catalog BC context map",
			emptyText: "unused",
			graph: contextGraph(
				ODSContextMap.fromWorkspace(model.workspace),
				model.workspace.relationships,
			),
		});
		expect(
			document.querySelector("figure.diagram .canvas .interactive"),
		).toBeInTheDocument();
		expect(document.querySelector("figcaption")).toHaveTextContent(
			"Catalog BC context map",
		);
	});
});

describe("DiagramFigure bypass (#83)", () => {
	const draw = () => {
		const model = petstoreModel();
		render(Harness, {
			model,
			caption: "Catalog BC context map",
			emptyText: "unused",
			graph: contextGraph(
				ODSContextMap.fromWorkspace(model.workspace),
				model.workspace.relationships,
			),
		});
		const box = document.querySelector(".interactive") as HTMLElement;
		const caption = document.querySelector("figcaption") as HTMLElement;
		return { box, caption };
	};

	it("is the first Tab stop inside the diagram, named for the caption, ahead of every node and control", () => {
		const { box } = draw();
		const stops = [
			...box.querySelectorAll<HTMLElement>(
				"a[href], button, select, [tabindex]:not([tabindex='-1'])",
			),
		];
		expect(stops.length).toBeGreaterThan(1);
		expect(stops[0]).toBe(
			screen.getByRole("button", {
				name: "Skip diagram: Catalog BC context map",
			}),
		);
		expect(stops[0].tagName).toBe("BUTTON");
		expect(box.firstElementChild).toBe(stops[0]);
	});

	it("focuses the caption, which is not itself a stop, so Tab continues beyond the figure", async () => {
		const { caption } = draw();
		const bypass = screen.getByRole("button", { name: /^Skip diagram/ });
		bypass.focus();
		await fireEvent.click(bypass);
		await waitFor(() => expect(document.activeElement).toBe(caption));
		expect(caption).toHaveAttribute("tabindex", "-1");
	});

	it("leaves fullscreen first and focuses the caption only once the overlay is gone", async () => {
		const { box, caption } = draw();
		// d3-drag keeps a click guard armed until the next macrotask.
		await new Promise((resolve) => setTimeout(resolve, 0));
		await fireEvent.click(
			box.querySelector("button.fullscreen") as HTMLButtonElement,
		);
		await waitFor(() => expect(box).toHaveClass("fullscreen"));
		// The bypass is still there to be reached from inside the overlay.
		const bypass = screen.getByRole("button", { name: /^Skip diagram/ });
		expect(box.contains(bypass)).toBe(true);

		const overlayAtFocus: boolean[] = [];
		caption.addEventListener("focus", () =>
			overlayAtFocus.push(box.classList.contains("fullscreen")),
		);
		bypass.focus();
		await fireEvent.click(bypass);
		await waitFor(() => expect(document.activeElement).toBe(caption));
		expect(box).not.toHaveClass("fullscreen");
		expect(overlayAtFocus).toEqual([false]);
	});
});
