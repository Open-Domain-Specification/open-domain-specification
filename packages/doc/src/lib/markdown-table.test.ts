import { describe, expect, it } from "vitest";
import { markdownTable } from "./markdown-table";

describe("markdownTable", () => {
	it("returns an empty string when headers are empty", () => {
		expect(markdownTable([], [["data1", "data2"]])).toMatchInlineSnapshot(`""`);
	});

	it("returns an empty string when rows are empty", () => {
		expect(markdownTable(["Header1", "Header2"], [])).toMatchInlineSnapshot(
			`""`,
		);
	});

	it("generates a table with headers and rows", () => {
		const headers = ["Header1", "Header2"];
		const rows = [
			["data1", "data2"],
			["data3", "data4"],
		];
		expect(markdownTable(headers, rows)).toMatchInlineSnapshot(`
			"| Header1 | Header2 |
			| --- | --- |
			| data1 | data2 |
			| data3 | data4 |
			"
		`);
	});
});
