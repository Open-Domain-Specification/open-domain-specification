import { ODSContextMap } from "@open-domain-specification/core";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import { installXyflowTestEnv } from "../xyflow-test-env";
import { contextGraph } from "./graph";
import Harness from "./LegendPanel.harness.svelte";
import { diagramOptions } from "./options.svelte";

installXyflowTestEnv();

const { workspace } = petstoreModel();
const graph = contextGraph(ODSContextMap.fromWorkspace(workspace));

describe("LegendPanel", () => {
	it("lists the terms present at the top left and collapses from its header, remembering the choice", async () => {
		diagramOptions.set({ legendCollapsed: false });
		const { container } = render(Harness, { graph, kind: "context" });
		const panel = container.querySelector(".diagram-legend") as HTMLElement;
		expect(panel.closest(".svelte-flow__panel")).toHaveClass("top", "left");
		const terms = [...panel.querySelectorAll("dt")].map((t) => t.textContent);
		expect(terms).toContain("OHS");
		expect(terms).toContain("U/D");
		expect(panel.querySelector("dd")?.textContent?.length ?? 0).toBeGreaterThan(
			0,
		);
		const header = screen.getByRole("button", { name: "Legend" });
		expect(header).toHaveAttribute("aria-expanded", "true");
		await fireEvent.click(header);
		expect(diagramOptions.legendCollapsed).toBe(true);
		expect(header).toHaveAttribute("aria-expanded", "false");
		expect(panel.querySelector("dl")).toBeNull();
		await fireEvent.click(header);
		expect(diagramOptions.legendCollapsed).toBe(false);
		expect(panel.querySelector("dl")).toBeTruthy();
	});
	it("names the disposition marks the map draws, each hovering to what it claims", () => {
		diagramOptions.set({ legendCollapsed: false });
		const { container } = render(Harness, {
			graph: contextGraph(
				ODSContextMap.fromWorkspace(workspace),
				workspace.relationships,
			),
			kind: "context",
		});
		const panel = container.querySelector(".diagram-legend") as HTMLElement;
		const rows = new Map(
			[...panel.querySelectorAll("dt")].map((dt) => [
				dt.textContent,
				dt.nextElementSibling as HTMLElement,
			]),
		);
		expect(rows.get("outlined badge")?.textContent).toBe("tolerated");
		expect(rows.get("warning badge")?.textContent).toBe("refactor");
		expect(rows.get("warning badge")?.getAttribute("title")).toContain(
			"Should be removed or replaced",
		);
		// A term the graph does draw carries no tooltip of its own.
		expect(rows.get("OHS")?.getAttribute("title")).toBeNull();
	});
	it("renders nothing for a graph with no terms", () => {
		const { container } = render(Harness, {
			graph: { nodes: [], edges: [] },
			kind: "relation",
		});
		expect(container.querySelector(".diagram-legend")).toBeNull();
	});
});
