import type { ContextRelationship } from "@open-domain-specification/core";
import type { Edge } from "@xyflow/svelte";
import { describe, expect, it, vi } from "vitest";
import { createDisclosure, withDisclosure } from "./disclosure.svelte";
import type { ContextEdgeData } from "./flow-nodes";
import type { Graph } from "./graph";

const relationship = { ref: "#/relationships/r" } as ContextRelationship;
const other = { ref: "#/relationships/s" } as ContextRelationship;

const press = (key: string) =>
	window.dispatchEvent(new KeyboardEvent("keydown", { key }));

describe("createDisclosure", () => {
	it("starts closed and opens anchored at the badge's flow point", () => {
		const disclosure = createDisclosure();
		expect(disclosure.open).toBeUndefined();
		disclosure.show(relationship, { x: 12, y: 34 });
		expect(disclosure.open).toEqual({ relationship, x: 12, y: 34 });
		disclosure.close();
		expect(disclosure.open).toBeUndefined();
	});

	it("closes on Escape and ignores every other key", () => {
		const disclosure = createDisclosure();
		disclosure.show(relationship, { x: 0, y: 0 });
		press("Enter");
		expect(disclosure.open).toBeTruthy();
		press("Escape");
		expect(disclosure.open).toBeUndefined();
	});

	it("closes on a pointer down that reaches the window, and on navigation", () => {
		const disclosure = createDisclosure();
		disclosure.show(relationship, { x: 0, y: 0 });
		window.dispatchEvent(new Event("pointerdown"));
		expect(disclosure.open).toBeUndefined();

		disclosure.show(relationship, { x: 0, y: 0 });
		window.dispatchEvent(new Event("hashchange"));
		expect(disclosure.open).toBeUndefined();
	});

	it("listens only while a card is up, and rebinds once when another badge opens one", () => {
		const add = vi.spyOn(window, "addEventListener");
		const remove = vi.spyOn(window, "removeEventListener");
		const disclosure = createDisclosure();
		expect(add).not.toHaveBeenCalled();

		disclosure.show(relationship, { x: 0, y: 0 });
		expect(add).toHaveBeenCalledTimes(3);
		// A second badge replaces the card rather than stacking another set of listeners.
		disclosure.show(other, { x: 1, y: 1 });
		expect(remove).toHaveBeenCalledTimes(3);
		expect(add).toHaveBeenCalledTimes(6);
		expect(disclosure.open?.relationship).toBe(other);

		disclosure.stop();
		expect(remove).toHaveBeenCalledTimes(6);
		// Already unbound: nothing more to drop on teardown.
		disclosure.stop();
		disclosure.close();
		expect(remove).toHaveBeenCalledTimes(6);
		add.mockRestore();
		remove.mockRestore();
	});
});

describe("withDisclosure", () => {
	const graph: Graph = {
		nodes: [],
		edges: [
			{
				id: "known",
				type: "context",
				source: "#/a",
				target: "#/b",
				intent: relationship,
			},
			{ id: "plain", type: "context", source: "#/b", target: "#/c" },
		],
	};
	const edges: Edge[] = [
		{ id: "known", source: "#/a", target: "#/b", data: { sourceLabel: "OHS" } },
		{ id: "plain", source: "#/b", target: "#/c", data: {} },
	];

	it("opens the intent behind the badge that was clicked, keeping the rest of its data", () => {
		const disclosure = createDisclosure();
		const [known, plain] = withDisclosure(edges, graph, disclosure);
		const data = known.data as ContextEdgeData;
		expect(data.sourceLabel).toBe("OHS");
		data.onBadgeClick?.({ x: 7, y: 9 });
		expect(disclosure.open).toEqual({ relationship, x: 7, y: 9 });
		// An edge with no intent is handed back untouched, so its badges stay inert.
		expect(plain).toBe(edges[1]);
		disclosure.stop();
	});
});
