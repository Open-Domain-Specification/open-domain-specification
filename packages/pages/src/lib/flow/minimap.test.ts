import { describe, expect, it } from "vitest";
import { minimapNodeClass } from "./minimap";

describe("minimapNodeClass", () => {
	it("marks cluster nodes and leaves the rest unclassed", () => {
		expect(minimapNodeClass({ type: "cluster" })).toBe("minimap-cluster");
		expect(minimapNodeClass({ type: "ods" })).toBe("");
		expect(minimapNodeClass({})).toBe("");
	});
});
