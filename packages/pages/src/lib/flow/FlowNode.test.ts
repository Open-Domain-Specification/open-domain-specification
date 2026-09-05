import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { ICONS } from "../icons";
import { installXyflowTestEnv } from "../xyflow-test-env";
import FlowNode from "./FlowNode.svelte";
import type { FlowNodeData } from "./flow-graph";
import Harness from "./NodeHarness.svelte";

installXyflowTestEnv();

const base: FlowNodeData = {
	id: "#/boundedcontexts/sales_bc/aggregates/order/provides/order_placed",
	type: "flow",
	label: "OrderPlaced",
	icon: ICONS.event,
	step: "event",
};
const flow = (data: FlowNodeData & { floating?: boolean }) =>
	render(Harness, { node: FlowNode, type: "flow", data });
const card = (container: Element) =>
	container.querySelector(".flow-node") as HTMLElement;

describe("FlowNode", () => {
	it("names the step in its class and its data attribute, so the shape is the kind", () => {
		for (const step of ["event", "command", "policy", "process"] as const) {
			const { container } = flow({ ...base, step });
			expect(card(container)).toHaveClass(step);
			expect(card(container).dataset.step).toBe(step);
			expect(card(container)).not.toHaveClass("focus");
		}
	});

	it("shows the icon, the name and the cluster path, and hovers to the description", () => {
		const { container } = flow({
			...base,
			icon: ICONS.process,
			step: "process",
			label: "Order fulfilment",
			groupPath: "Sales",
			description: "From placed to sold.",
		});
		const node = card(container);
		expect(node.querySelector("strong")?.textContent).toBe("Order fulfilment");
		expect(node.querySelector(".group")?.textContent).toBe("Sales");
		expect(node.getAttribute("title")).toBe("From placed to sold.");
		expect(node.querySelector(`.codicon-${ICONS.process}`)).toBeTruthy();
		// A read-only map: the plain handles never start a connection.
		const handles = node.querySelectorAll(".svelte-flow__handle");
		expect(handles).toHaveLength(2);
		for (const handle of handles) expect(handle).not.toHaveClass("connectable");
	});

	it("falls back to the ref as the hover text and drops the subtitle when the step has no cluster path", () => {
		const { container } = flow(base);
		expect(card(container).getAttribute("title")).toBe(base.id);
		expect(card(container).querySelector(".group")).toBeNull();
	});

	it("marks the page's own reaction and hides the plain handles when they float", () => {
		const { container } = flow({
			...base,
			step: "policy",
			focus: true,
			floating: true,
		});
		expect(card(container)).toHaveClass("focus");
		expect(container.querySelectorAll(".handle-hidden")).toHaveLength(2);
	});
});
