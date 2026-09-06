import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { installXyflowTestEnv } from "../xyflow-test-env";
import ContextNode from "./ContextNode.svelte";
import type { ContextNodeData } from "./context-graph";
import Harness from "./NodeHarness.svelte";

installXyflowTestEnv();

const base: ContextNodeData = {
	id: "#/boundedcontexts/sales",
	type: "context",
	label: "Sales",
	icon: "boundedcontext",
	bigBallOfMud: false,
	external: false,
	boundaryOnly: false,
};
const context = (
	data: ContextNodeData & { floating?: boolean; sketch?: boolean },
) => render(Harness, { node: ContextNode, type: "context", data });

describe("ContextNode", () => {
	it("shows the name, team in brackets, cluster path and colour band, with plain handles on both sides", () => {
		const { container } = context({
			...base,
			groupPath: "Commerce / Sales",
			cluster: "Commerce",
			team: "Team Sales",
			description: "Sells pets",
		});
		const node = container.querySelector(".context-node") as HTMLElement;
		expect(node).toHaveClass("flow-card");
		expect(node.querySelector("strong")?.textContent).toBe("Sales");
		expect(node.querySelector(".team")?.textContent).toBe("[Team Sales]");
		expect(node.querySelector(".group")?.textContent).toBe("Commerce / Sales");
		expect(node.getAttribute("title")).toBe("Sells pets");
		expect(node.getAttribute("style")).toContain("--band: hsl(");
		expect(node.classList.contains("mud")).toBe(false);
		expect(node.querySelector(".svelte-flow__handle.target")).toBeTruthy();
		expect(node.querySelector(".svelte-flow__handle.source")).toBeTruthy();
		expect(node.querySelector(".handle-hidden")).toBeNull();
		expect(node.querySelector(".port-handle")).toBeNull();
		// The map is read-only: neither handle may start a connection.
		expect(node.querySelector(".svelte-flow__handle.target")).not.toHaveClass(
			"connectable",
		);
		expect(node.querySelector(".svelte-flow__handle.source")).not.toHaveClass(
			"connectable",
		);
	});
	it("marks a big ball of mud, falls back to the ref as title and hides floating handles", () => {
		const { container } = context({
			...base,
			bigBallOfMud: true,
			floating: true,
		});
		const node = container.querySelector(".context-node") as HTMLElement;
		expect(node.classList.contains("mud")).toBe(true);
		expect(node.querySelector(".mud-label")?.textContent).toBe(
			"(big ball of mud)",
		);
		expect(node.querySelector(".team")).toBeNull();
		expect(node.querySelector(".group")).toBeNull();
		expect(node.getAttribute("title")).toBe(base.id);
		expect(node.getAttribute("style")).toBeFalsy();
		expect(node.querySelectorAll(".handle-hidden").length).toBe(2);
		expect(node.classList.contains("sketch")).toBe(false);
	});
	it("marks a system the enterprise does not own with its stereotype", () => {
		const { container } = context({ ...base, external: true });
		const node = container.querySelector(".context-node") as HTMLElement;
		expect(node.classList.contains("external")).toBe(true);
		expect(node.querySelector(".stereotype")?.textContent).toBe(
			"«external system»",
		);
		expect(node.classList.contains("mud")).toBe(false);
	});
	// The third context flag: ours and coherent, and nobody has interviewed it
	// yet (decision 28, sixth amendment; card 132).
	it("marks a context nobody has interviewed with its own stereotype", () => {
		const { container } = context({ ...base, boundaryOnly: true });
		const node = container.querySelector(".context-node") as HTMLElement;
		expect(node.classList.contains("boundary-only")).toBe(true);
		expect(node.querySelector(".stereotype")?.textContent).toBe(
			"«boundary only»",
		);
		expect(node.classList.contains("mud")).toBe(false);
		expect(node.classList.contains("external")).toBe(false);
	});
	it("takes the sketch class for the ellipse style", () => {
		const { container } = context({ ...base, sketch: true });
		expect(container.querySelector(".context-node.sketch")).toBeTruthy();
	});
});
