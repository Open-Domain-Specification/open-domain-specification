import { describe, expect, it } from "vitest";
import { createDiagramOptions } from "./options.svelte";

const KEY = "ods-diagram-options";

describe("diagram options", () => {
	it("defaults to fixed handles and bezier edges", () => {
		localStorage.removeItem(KEY);
		const o = createDiagramOptions();
		expect(o.handles).toBe("fixed");
		expect(o.edges).toBe("bezier");
	});
	it("remembers a choice and reads it back", () => {
		localStorage.removeItem(KEY);
		const o = createDiagramOptions();
		o.set({ handles: "floating" });
		o.set({ edges: "step" });
		expect(JSON.parse(localStorage.getItem(KEY) ?? "{}")).toEqual({
			handles: "floating",
			edges: "step",
		});
		const again = createDiagramOptions();
		expect(again.handles).toBe("floating");
		expect(again.edges).toBe("step");
	});
	it("ignores unknown or corrupt stored values", () => {
		localStorage.setItem(
			KEY,
			JSON.stringify({ handles: "diagonal", edges: "zigzag" }),
		);
		let o = createDiagramOptions();
		expect(o.handles).toBe("fixed");
		expect(o.edges).toBe("bezier");
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
