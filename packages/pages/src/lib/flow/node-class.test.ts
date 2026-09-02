import { describe, expect, it } from "vitest";
import { sketchClass } from "./node-class";

describe("sketchClass", () => {
	it("names the sketch class when the data flags it", () => {
		expect(sketchClass({ sketch: true })).toBe("sketch");
	});
	it("gives nothing for false or missing sketch data", () => {
		expect(sketchClass({ sketch: false })).toBe("");
		expect(sketchClass({})).toBe("");
	});
});
