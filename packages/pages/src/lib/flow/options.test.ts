import { describe, expect, it } from "vitest";
import { createDiagramOptions } from "./options.svelte";

const KEY = "ods-diagram-options";

describe("diagram options", () => {
	it("defaults to fixed handles and bezier edges", () => {
		localStorage.removeItem(KEY);
		const o = createDiagramOptions();
		expect(o.handles).toBe("fixed");
		expect(o.edges).toBe("bezier");
		expect(o.style).toBe("cards");
		expect(o.legendCollapsed).toBe(false);
	});
	it("remembers a choice and reads it back", () => {
		localStorage.removeItem(KEY);
		const o = createDiagramOptions();
		o.set({ handles: "floating" });
		o.set({ edges: "step" });
		o.set({ style: "sketch" });
		o.set({ legendCollapsed: true });
		expect(JSON.parse(localStorage.getItem(KEY) ?? "{}")).toEqual({
			handles: "floating",
			edges: "step",
			style: "sketch",
			legendCollapsed: true,
		});
		const again = createDiagramOptions();
		expect(again.handles).toBe("floating");
		expect(again.edges).toBe("step");
		expect(again.style).toBe("sketch");
		expect(again.legendCollapsed).toBe(true);
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
		expect(o.handles).toBe("fixed");
		expect(o.edges).toBe("bezier");
		expect(o.style).toBe("cards");
		expect(o.legendCollapsed).toBe(false);
		localStorage.setItem(KEY, "not json");
		o = createDiagramOptions();
		expect(o.handles).toBe("fixed");
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
