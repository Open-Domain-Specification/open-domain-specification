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
		expect(disclosure.open).toEqual({
			relationship,
			x: 12,
			y: 34,
			invoker: undefined,
		});
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

describe("returning focus", () => {
	const badge = () => {
		const button = document.createElement("button");
		document.body.append(button);
		return button;
	};

	it("gives each disclosure its own card id, so two figures on a page never share one", () => {
		const [a, b] = [createDisclosure(), createDisclosure()];
		expect(a.id).toMatch(/^disclosure-card-\d+$/);
		expect(b.id).not.toBe(a.id);
	});

	it("hands focus back to the badge on Escape and on dismiss, and remembers which badge opened it", () => {
		const disclosure = createDisclosure();
		const first = badge();
		disclosure.show(relationship, { x: 0, y: 0 }, first);
		expect(disclosure.open?.invoker).toBe(first);
		press("Escape");
		expect(disclosure.open).toBeUndefined();
		expect(document.activeElement).toBe(first);

		const second = badge();
		disclosure.show(relationship, { x: 0, y: 0 }, second);
		first.focus();
		disclosure.dismiss();
		expect(disclosure.open).toBeUndefined();
		expect(document.activeElement).toBe(second);
		first.remove();
		second.remove();
	});

	it("does not take focus back when the card closes because the reader went elsewhere", () => {
		const disclosure = createDisclosure();
		const button = badge();
		const elsewhere = badge();
		disclosure.show(relationship, { x: 0, y: 0 }, button);
		elsewhere.focus();
		disclosure.close();
		expect(document.activeElement).toBe(elsewhere);
		button.remove();
		elsewhere.remove();
	});

	it("dismisses a card opened without a badge, and one that is not open, without error", () => {
		const disclosure = createDisclosure();
		disclosure.dismiss();
		disclosure.show(relationship, { x: 0, y: 0 });
		disclosure.dismiss();
		expect(disclosure.open).toBeUndefined();
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
		const invoker = document.createElement("button");
		expect(data.cardId).toBe(disclosure.id);
		expect(data.disclosedBy?.()).toBeUndefined();
		data.onBadgeClick?.({ x: 7, y: 9 }, invoker);
		expect(disclosure.open).toEqual({ relationship, x: 7, y: 9, invoker });
		// The badge that opened the card is the one that reads as expanded.
		expect(data.disclosedBy?.()).toBe(invoker);
		// An edge with no intent is handed back untouched, so its badges stay inert.
		expect(plain).toBe(edges[1]);
		disclosure.stop();
	});
});
