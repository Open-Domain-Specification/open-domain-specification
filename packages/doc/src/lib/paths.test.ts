import { describe, expect, it } from "vitest";
import {
	pathToContextMapSvg,
	pathToIndexMd,
	pathToSetIndexMd,
	placed,
} from "./paths";

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

describe("placed", () => {
	const inSet = (size: number) => ({
		set: { workspaces: new Array(size) },
		file: "team/ü.json",
	});

	// Read by shape, not by class: a CommonJS build of core beside an ES module
	// one makes no object an instance of the other's classes.
	it("puts an element of a workspace in a set of several under the folder of its file, whatever loaded its class", () => {
		const workspace = { path: "w", ...inSet(2) };
		const context = { path: "boundedcontexts/ledger", workspace };
		const aggregate = {
			path: "boundedcontexts/ledger/aggregates/account",
			boundedcontext: context,
		};
		const subdomain = { path: "domains/d/subdomains/s", domain: { workspace } };
		const folder = "team/_ods_00fc.json";
		expect(placed(workspace)).toBe(`${folder}\u0000w`);
		expect(placed(context)).toBe(`${folder}\u0000boundedcontexts/ledger`);
		expect(placed(aggregate)).toBe(
			`${folder}\u0000boundedcontexts/ledger/aggregates/account`,
		);
		expect(placed(subdomain)).toBe(`${folder}\u0000domains/d/subdomains/s`);
	});

	it("leaves an element alone, or of a set of one, where it has always been", () => {
		const alone = { path: "w" };
		expect(placed(alone)).toBe("w");
		const only = { path: "w", ...inSet(1) };
		const context = { path: "boundedcontexts/x", workspace: only };
		expect(placed(context)).toBe("boundedcontexts/x");
	});
});

describe("pathToSetIndexMd", () => {
	it("climbs one folder for each component between the page and the first page", () => {
		expect(pathToSetIndexMd()).toBe("index.md");
		expect(pathToSetIndexMd("a.json\u0000w")).toBe("../../index.md");
		expect(pathToSetIndexMd("team/b.json\u0000w")).toBe("../../../index.md");
	});
});
