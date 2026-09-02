import { describe, expect, it } from "vitest";
import { diagramKind, hasSketchStyle, sketchApplies } from "./kind";

const graph = (type?: string) => ({
	nodes: type ? [{ id: "#/a", type, label: "A", icon: "x" }] : [],
});

describe("diagramKind", () => {
	it("reads the kind from the first node's type and defaults to context", () => {
		expect(diagramKind(graph("context"))).toBe("context");
		expect(diagramKind(graph("consumable"))).toBe("consumable");
		expect(diagramKind(graph("relation"))).toBe("relation");
		expect(diagramKind(graph("cluster"))).toBe("context");
		expect(diagramKind(graph())).toBe("context");
	});
});

describe("sketchApplies", () => {
	it("is true only for the context map in sketch style", () => {
		expect(sketchApplies("context", "sketch")).toBe(true);
		expect(sketchApplies("context", "cards")).toBe(false);
		expect(sketchApplies("consumable", "sketch")).toBe(false);
		expect(sketchApplies("relation", "sketch")).toBe(false);
	});
});

describe("hasSketchStyle", () => {
	it("is true only for the context map", () => {
		expect(hasSketchStyle("context")).toBe(true);
		expect(hasSketchStyle("consumable")).toBe(false);
		expect(hasSketchStyle("relation")).toBe(false);
	});
});
