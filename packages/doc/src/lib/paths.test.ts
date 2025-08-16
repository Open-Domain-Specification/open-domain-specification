import { describe, expect, it } from "vitest";
import { pathToContextMapSvg, pathToIndexMd } from "./paths";

describe("pathToContextMapSvg", () => {
	it("returns the correct path when relativeRef is not provided", () => {
		expect(pathToContextMapSvg("ref/path")).toBe("ref/path/contextmap.svg");
	});
});

describe("pathToIndexMd", () => {
	it("returns the correct path when relativeRef is not provided", () => {
		expect(pathToIndexMd("ref/path")).toBe("ref/path/index.md");
	});
});
