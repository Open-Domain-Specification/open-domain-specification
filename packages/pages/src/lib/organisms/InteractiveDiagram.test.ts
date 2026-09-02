import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { Graph } from "../flow/graph";
import { installXyflowTestEnv } from "../xyflow-test-env";
import InteractiveDiagram from "./InteractiveDiagram.svelte";

installXyflowTestEnv();

const graph: Graph = {
	nodes: [
		{ id: "#/a", label: "A", icon: "symbol-field" },
		{
			id: "#/b",
			label: "B",
			icon: "symbol-field",
			group: "Group",
			tone: "core",
		},
		{
			id: "#/c",
			label: "C",
			icon: "symbol-field",
			chips: ["root"],
			tone: "warn",
			attributes: [
				{ name: "id", type: "string", identity: true },
				{ name: "name", type: "string", identity: false },
			],
		},
	],
	edges: [
		{
			id: "e1",
			source: "#/a",
			target: "#/b",
			label: "relates",
			directed: true,
		},
		{
			id: "e2",
			source: "#/b",
			target: "#/c",
			label: "includes",
			directed: false,
			dashed: true,
		},
	],
};

describe("InteractiveDiagram", () => {
	it("renders every node, including groups, chips and attribute compartments", async () => {
		location.hash = "";
		const { container } = render(InteractiveDiagram, { graph });

		await waitFor(() => {
			expect(container.querySelector('[data-id="#/a"]')).toBeTruthy();
			expect(container.querySelector('[data-id="#/b"]')).toBeTruthy();
			expect(container.querySelector('[data-id="#/c"]')).toBeTruthy();
		});
		expect(container.querySelector(".ods-node.core")).toBeInTheDocument();
		expect(container.querySelector(".ods-node.warn")).toBeInTheDocument();
		expect(container.querySelector(".group")).toHaveTextContent("Group");
		expect(container.querySelector(".chips")).toHaveTextContent("root");
		expect(container.querySelectorAll(".attrs li")).toHaveLength(2);

		const node = container.querySelector('[data-id="#/b"]') as HTMLElement;
		await fireEvent.click(node);
		expect(location.hash).toBe("#/b");
	});

	it("accepts a top-to-bottom direction", async () => {
		const { container } = render(InteractiveDiagram, {
			graph,
			direction: "TB",
		});
		await waitFor(() => {
			expect(container.querySelector(".interactive")).toBeInTheDocument();
		});
	});
});

describe("OdsNode tone", () => {
	it("falls back to no tone class when the node has none", () => {
		const { container } = render(InteractiveDiagram, {
			graph: {
				nodes: [{ id: "#/plain", label: "Plain", icon: "symbol-class" }],
				edges: [],
			},
		});
		const node = container.querySelector(".ods-node");
		expect(node).toBeTruthy();
		for (const tone of ["core", "warn", "muted"])
			expect(node?.classList.contains(tone)).toBe(false);
	});
});
