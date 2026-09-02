import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { installXyflowTestEnv } from "../xyflow-test-env";
import ConsumableNode from "./ConsumableNode.svelte";
import type { ConsumableNodeData } from "./consumable-graph";
import Harness from "./NodeHarness.svelte";

installXyflowTestEnv();

const base: ConsumableNodeData = {
	id: "#/boundedcontexts/catalog/aggregates/pet",
	type: "consumable",
	label: "Pet",
	icon: "symbol-structure",
	slots: [],
};
const consumable = (
	data: ConsumableNodeData & { floating?: boolean; sketch?: boolean },
) => render(Harness, { node: ConsumableNode, type: "consumable", data });

describe("ConsumableNode", () => {
	it("shows the name, cluster path and one slot per consumable with icon and a port handle carrying the pattern", () => {
		const { container } = consumable({
			...base,
			groupPath: "Commerce / Catalog",
			description: "A pet for sale",
			slots: [
				{
					id: `${base.id}/provides/reserve_pet`,
					name: "Reserve Pet",
					kind: "operation",
					pattern: "open-host-service",
					description: "Holds a pet",
				},
				{
					id: `${base.id}/provides/pet_status_changed`,
					name: "Pet Status Changed",
					kind: "event",
				},
			],
		});
		const node = container.querySelector(".consumable-node") as HTMLElement;
		expect(node.querySelector("strong")?.textContent).toBe("Pet");
		expect(node.querySelector(".group")?.textContent).toBe(
			"Commerce / Catalog",
		);
		expect(node.getAttribute("title")).toBe("A pet for sale");
		const slots = node.querySelectorAll(".slot");
		expect(slots).toHaveLength(2);
		expect(slots[0].getAttribute("title")).toBe("Holds a pet");
		expect(slots[0].querySelector(".name")?.textContent).toBe("Reserve Pet");
		expect(slots[0].querySelector(".codicon-zap")).toBeTruthy();
		expect(slots[1].querySelector(".codicon-broadcast")).toBeTruthy();
		expect(slots[1].getAttribute("title")).toBe(
			`${base.id}/provides/pet_status_changed`,
		);
		// Each slot carries its own target handle, named by the consumable's ref.
		for (const slot of slots) {
			const handle = slot.querySelector(
				".svelte-flow__handle.target",
			) as HTMLElement;
			expect(handle.getAttribute("data-handleid")).toBe(
				slot.getAttribute("data-slot"),
			);
		}
		// A slot with a pattern is a labelled port; one without is a plain handle.
		const port = slots[0].querySelector(".port-handle") as HTMLElement;
		expect(port.querySelector(".port-label")?.textContent).toBe("OHS");
		expect(port.getAttribute("title")).toBe("open-host-service");
		expect(slots[1].querySelector(".port-handle")).toBeNull();
		expect(node.querySelectorAll(".svelte-flow__handle.source")).toHaveLength(
			1,
		);
		expect(node.querySelector(".handle-hidden")).toBeNull();
	});
	it("omits the slot list and group when there are none, falls back to the ref as title and hides floating handles but not ports", () => {
		const { container } = consumable({
			...base,
			floating: true,
			slots: [
				{
					id: `${base.id}/provides/reserve_pet`,
					name: "Reserve Pet",
					kind: "operation",
					pattern: "published-language",
				},
			],
		});
		const node = container.querySelector(".consumable-node") as HTMLElement;
		expect(node.querySelector(".group")).toBeNull();
		expect(node.getAttribute("title")).toBe(base.id);
		expect(node.querySelectorAll(".handle-hidden")).toHaveLength(1);
		expect(node.querySelector(".port-handle")).not.toHaveClass("handle-hidden");
		const { container: bare } = consumable(base);
		expect(bare.querySelector(".slots")).toBeNull();
	});
});

describe("ConsumableNode in sketch style", () => {
	it("takes the sketch class for the ellipse style", () => {
		const { container } = consumable({ ...base, sketch: true });
		expect(container.querySelector(".consumable-node.sketch")).toBeTruthy();
	});
});
