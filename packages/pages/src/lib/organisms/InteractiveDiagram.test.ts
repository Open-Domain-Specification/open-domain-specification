import {
	ODSConsumableMap,
	ODSContextMap,
	ODSRelationMap,
} from "@open-domain-specification/core";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { beforeAll, describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import { consumableGraph, contextGraph, relationGraph } from "../flow/graph";
import { diagramOptions } from "../flow/options.svelte";
import { installXyflowTestEnv } from "../xyflow-test-env";
import InteractiveDiagram from "./InteractiveDiagram.svelte";

installXyflowTestEnv();

const { workspace } = petstoreModel();
// The suite reads the cards style unless a test says otherwise; sketch is the shipped default.
beforeAll(() => diagramOptions.set({ style: "cards" }));
const sales = workspace.boundedcontexts.get("sales_bc")!;
const order = sales.aggregates.get("order")!;

describe("InteractiveDiagram", () => {
	it("draws the context map with context nodes, nested clusters and context edges, and navigates on click", async () => {
		location.hash = "";
		const graph = contextGraph(ODSContextMap.fromWorkspace(workspace));
		const { container } = render(InteractiveDiagram, { graph });
		await waitFor(() => {
			expect(container.querySelectorAll(".context-node").length).toBe(
				graph.nodes.length,
			);
		});
		expect(container.querySelectorAll(".cluster-node").length).toBe(
			graph.groups?.length,
		);
		expect(container.querySelector(".group")).toBeInTheDocument();
		// The workspace cluster is the outermost region; contexts sit inside their domain's region.
		const ws = container.querySelector(
			'.cluster-node[data-depth="0"]',
		) as HTMLElement;
		expect(ws.getAttribute("style")).toContain("--shade: 0.14");
		expect(
			container
				.querySelector('.cluster-node[data-depth="1"]')
				?.getAttribute("style"),
		).toContain("--shade: 0.11");
		const node = container.querySelector(
			`[data-id="${sales.ref}"]`,
		) as HTMLElement;
		const region = container.querySelector(
			'.svelte-flow__node[data-id^="cluster:"]',
		) as HTMLElement;
		// Svelte Flow stacks children above their parent, so the region sits behind its members.
		expect(Number(node.style.zIndex)).toBeGreaterThan(
			Number(region.style.zIndex),
		);
		await fireEvent.click(node);
		expect(location.hash).toBe(sales.ref);
		// Regions are grouping, not pages: clicking one must not navigate.
		await fireEvent.click(region);
		expect(location.hash).toBe(sales.ref);
		// Read-only diagram: nodes stay clickable (just proven above), but no handle may start
		// a drag connection.
		const handles = container.querySelectorAll(".svelte-flow__handle");
		expect(handles.length).toBeGreaterThan(0);
		for (const handle of handles) expect(handle).not.toHaveClass("connectable");
	});

	it("draws the consumable and relation maps with their own node and edge components", async () => {
		const consumables = render(InteractiveDiagram, {
			graph: consumableGraph(ODSConsumableMap.fromBoundedContext(sales)),
			direction: "TB",
		});
		await waitFor(() => {
			expect(
				consumables.container.querySelector(".consumable-node .slot"),
			).toBeTruthy();
		});
		const relations = render(InteractiveDiagram, {
			graph: relationGraph(ODSRelationMap.fromAggregate(order)),
		});
		await waitFor(() => {
			expect(
				relations.container.querySelectorAll(".relation-node").length,
			).toBeGreaterThan(1);
		});
		expect(relations.container.querySelector(".stereotype")).toBeTruthy();
	});
});

describe("InteractiveDiagram with a bare graph", () => {
	it("draws ungrouped nodes at the top level and dashed, directed edges", async () => {
		const { container } = render(InteractiveDiagram, {
			graph: {
				nodes: [
					{ id: "#/a", type: "context", label: "A", icon: "boundedcontext" },
					{ id: "#/b", type: "context", label: "B", icon: "boundedcontext" },
				],
				edges: [
					{
						id: "e",
						type: "context",
						source: "#/a",
						target: "#/b",
						label: "U/D",
						dashed: true,
						directed: true,
					},
				],
			},
		});
		await waitFor(() => {
			expect(container.querySelectorAll(".context-node").length).toBe(2);
		});
		expect(container.querySelector(".cluster-node")).toBeNull();
	});
});

describe("diagram options in the interactive view", () => {
	it("hides the fixed handles while floating and shows the options panel", async () => {
		diagramOptions.set({ handles: "floating", edges: "straight" });
		const { container } = render(InteractiveDiagram, {
			graph: contextGraph(ODSContextMap.fromWorkspace(workspace)),
		});
		await waitFor(() => {
			expect(
				container.querySelectorAll(".handle-hidden").length,
			).toBeGreaterThan(0);
		});
		expect(
			container.querySelector(".svelte-flow__panel.top.right"),
		).toBeTruthy();
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
		await waitFor(() => {
			expect(container.querySelectorAll(".handle-hidden").length).toBe(0);
		});
	});
});

describe("diagram kinds", () => {
	it("never applies the sketch style to the consumable or relation map and hides their style select", async () => {
		diagramOptions.set({ style: "sketch" });
		const consumables = render(InteractiveDiagram, {
			graph: consumableGraph(ODSConsumableMap.fromBoundedContext(sales)),
		});
		await waitFor(() => {
			expect(
				consumables.container.querySelector(".consumable-node"),
			).toBeTruthy();
		});
		expect(consumables.container.querySelector(".sketch")).toBeNull();
		expect(consumables.container.querySelector(".sketch-backdrop")).toBeNull();
		expect(
			consumables.container.querySelectorAll(".cluster-node").length,
		).toBeGreaterThan(0);
		expect(
			consumables.container.querySelector('[aria-label="Diagram style"]'),
		).toBeNull();
		const relations = render(InteractiveDiagram, {
			graph: relationGraph(ODSRelationMap.fromAggregate(order)),
		});
		await waitFor(() => {
			expect(relations.container.querySelector(".relation-node")).toBeTruthy();
		});
		expect(relations.container.querySelector(".sketch-backdrop")).toBeNull();
		expect(
			relations.container.querySelector('[aria-label="Diagram style"]'),
		).toBeNull();
		diagramOptions.set({ style: "cards" });
	});
});

describe("sketch style", () => {
	it("draws ellipse nodes over the Voronoi backdrop and hides the clusters, then restores the cards", async () => {
		diagramOptions.set({ style: "sketch" });
		const graph = contextGraph(ODSContextMap.fromWorkspace(workspace));
		const { container } = render(InteractiveDiagram, { graph });
		await waitFor(() => {
			expect(container.querySelectorAll(".context-node.sketch").length).toBe(
				graph.nodes.length,
			);
		});
		expect(container.querySelector(".cluster-node")).toBeNull();
		const backdrop = container.querySelector(".sketch-backdrop") as SVGElement;
		expect(backdrop).toBeTruthy();
		expect(backdrop.querySelector(".blob")?.getAttribute("d")).toMatch(/^M/);
		expect(backdrop.querySelector(".boundaries")?.getAttribute("d")).toContain(
			" L",
		);
		const labels = [...backdrop.querySelectorAll(".region-label")].map(
			(t) => t.textContent,
		);
		expect(labels.length).toBeGreaterThan(1);
		for (const g of graph.groups ?? [])
			if (graph.nodes.some((n) => n.groupId === g.id))
				expect(labels).toContain(g.label);
		diagramOptions.set({ style: "cards" });
		await waitFor(() => {
			expect(container.querySelector(".sketch-backdrop")).toBeNull();
		});
		expect(container.querySelector(".context-node.sketch")).toBeNull();
		expect(container.querySelectorAll(".cluster-node").length).toBe(
			graph.groups?.length,
		);
	});
});

describe("dragging a node in the cards style", () => {
	it("refits the cluster boxes round their members as a node moves", async () => {
		diagramOptions.set({ style: "cards" });
		const graph = contextGraph(ODSContextMap.fromWorkspace(workspace));
		const { container } = render(InteractiveDiagram, { graph });
		await waitFor(() => {
			expect(container.querySelectorAll(".context-node").length).toBe(
				graph.nodes.length,
			);
		});
		const cluster = container.querySelector(
			'.svelte-flow__node[data-id^="cluster:"]',
		) as HTMLElement;
		const before = cluster.getAttribute("style");
		const node = container.querySelector(
			'.svelte-flow__node[data-id^="#/"]',
		) as HTMLElement;
		// d3-drag reads the window off the event and listens there for the rest of the gesture.
		const win = node.ownerDocument.defaultView as Window & typeof globalThis;
		// jsdom rejects `view` in the init, yet d3-drag reads the window off the event; define it after.
		const mouse = (target: EventTarget, type: string, x: number, y: number) => {
			const e = new win.MouseEvent(type, {
				bubbles: true,
				cancelable: true,
				button: 0,
				clientX: x,
				clientY: y,
			});
			Object.defineProperty(e, "view", { value: win });
			target.dispatchEvent(e);
		};
		mouse(node, "mousedown", 10, 10);
		mouse(win, "mousemove", 600, 400);
		mouse(win, "mousemove", 900, 700);
		mouse(win, "mouseup", 900, 700);
		await waitFor(() => {
			expect(cluster.getAttribute("style")).not.toBe(before);
		});
	});
});

describe("host theme", () => {
	it("paints in the VS Code editor's colour mode, not the OS one, and follows a theme switch", async () => {
		const { container } = render(InteractiveDiagram, {
			graph: contextGraph(ODSContextMap.fromWorkspace(workspace)),
		});
		const flow = () => container.querySelector(".svelte-flow") as HTMLElement;
		await waitFor(() => expect(flow()).toBeTruthy());
		// No webview class: Svelte Flow keeps its own media-query mode.
		expect(flow().classList.contains("dark")).toBe(false);
		document.body.classList.add("vscode-dark");
		await waitFor(() => expect(flow().classList.contains("dark")).toBe(true));
		document.body.classList.replace("vscode-dark", "vscode-light");
		await waitFor(() => expect(flow().classList.contains("light")).toBe(true));
		document.body.classList.remove("vscode-light");
	});
});

describe("fullscreen", () => {
	it("turns the figure into an overlay, leaves on Escape, and leaves again when a node navigates", async () => {
		diagramOptions.set({ style: "cards" });
		const { container } = render(InteractiveDiagram, {
			graph: contextGraph(ODSContextMap.fromWorkspace(workspace)),
		});
		const box = () => container.querySelector(".interactive") as HTMLElement;
		await waitFor(() => expect(box()).toBeTruthy());
		const button = () =>
			container.querySelector("button.fullscreen") as HTMLButtonElement;
		expect(box().classList.contains("fullscreen")).toBe(false);
		// d3-drag swallows the first click after a gesture and only drops that guard on
		// the next macrotask; the drag test above leaves it armed.
		await new Promise((resolve) => setTimeout(resolve, 0));

		await fireEvent.click(button());
		await waitFor(() =>
			expect(box().classList.contains("fullscreen")).toBe(true),
		);
		await fireEvent.keyDown(window, { key: "Escape" });
		await waitFor(() =>
			expect(box().classList.contains("fullscreen")).toBe(false),
		);

		// Clicking through to another element must not leave the overlay behind.
		await fireEvent.click(button());
		await waitFor(() =>
			expect(box().classList.contains("fullscreen")).toBe(true),
		);
		location.hash = "";
		await fireEvent.click(
			container.querySelector(`[data-id="${sales.ref}"]`) as HTMLElement,
		);
		expect(location.hash).toBe(sales.ref);
		await waitFor(() =>
			expect(box().classList.contains("fullscreen")).toBe(false),
		);
	});
});
