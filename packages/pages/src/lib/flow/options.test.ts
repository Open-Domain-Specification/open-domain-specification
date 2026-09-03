import { describe, expect, it } from "vitest";
import { createDiagramOptions, defaultHandles } from "./options.svelte";

const KEY = "ods-diagram-options";

describe("diagram options", () => {
	it("defaults to no handle override, bezier edges and the sketch style", () => {
		localStorage.removeItem(KEY);
		const o = createDiagramOptions();
		expect(o.handles).toBeUndefined();
		expect(o.edges).toBe("bezier");
		expect(o.style).toBe("sketch");
		expect(o.legendCollapsed).toBe(false);
	});
	it("defaults context diagrams to floating handles and other kinds to fixed", () => {
		expect(defaultHandles("context")).toBe("floating");
		expect(defaultHandles("consumable")).toBe("fixed");
		expect(defaultHandles("relation")).toBe("fixed");
		localStorage.removeItem(KEY);
		const o = createDiagramOptions();
		expect(o.handlesFor("context")).toBe("floating");
		expect(o.handlesFor("consumable")).toBe("fixed");
		expect(o.handlesFor("relation")).toBe("fixed");
	});
	it("an explicit override wins over the per-kind default, for every kind", () => {
		localStorage.removeItem(KEY);
		const o = createDiagramOptions();
		o.set({ handles: "fixed" });
		expect(o.handlesFor("context")).toBe("fixed");
		o.set({ handles: "floating" });
		expect(o.handlesFor("consumable")).toBe("floating");
		expect(o.handlesFor("relation")).toBe("floating");
	});
	it("remembers a choice and reads it back", () => {
		localStorage.removeItem(KEY);
		const o = createDiagramOptions();
		o.set({ handles: "floating" });
		o.set({ edges: "step" });
		o.set({ style: "cards" });
		o.set({ legendCollapsed: true });
		expect(JSON.parse(localStorage.getItem(KEY) ?? "{}")).toEqual({
			handles: "floating",
			edges: "step",
			style: "cards",
			legendCollapsed: true,
		});
		const again = createDiagramOptions();
		expect(again.handles).toBe("floating");
		expect(again.edges).toBe("step");
		expect(again.style).toBe("cards");
		expect(again.legendCollapsed).toBe(true);
	});
	it("honours a legacy stored value that already set handles", () => {
		localStorage.setItem(
			KEY,
			JSON.stringify({
				handles: "fixed",
				edges: "bezier",
				style: "sketch",
				legendCollapsed: false,
			}),
		);
		const o = createDiagramOptions();
		expect(o.handles).toBe("fixed");
		expect(o.handlesFor("context")).toBe("fixed");
	});
	it("ignores unknown or corrupt stored values", () => {
		localStorage.setItem(
			KEY,
			JSON.stringify({
				handles: "diagonal",
				edges: "zigzag",
				style: "oil",
				legendCollapsed: "yes",
			}),
		);
		let o = createDiagramOptions();
		expect(o.handles).toBeUndefined();
		expect(o.edges).toBe("bezier");
		expect(o.style).toBe("sketch");
		expect(o.legendCollapsed).toBe(false);
		localStorage.setItem(KEY, "not json");
		o = createDiagramOptions();
		expect(o.handles).toBeUndefined();
	});
	it("still works when storage throws", () => {
		const real = Storage.prototype.setItem;
		const realGet = Storage.prototype.getItem;
		Storage.prototype.getItem = () => {
			throw new Error("blocked");
		};
		Storage.prototype.setItem = () => {
			throw new Error("blocked");
		};
		try {
			const o = createDiagramOptions();
			o.set({ edges: "straight" });
			expect(o.edges).toBe("straight");
		} finally {
			Storage.prototype.setItem = real;
			Storage.prototype.getItem = realGet;
		}
	});
});
