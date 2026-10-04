import { describe, expect, it } from "vitest";
import {
	fileComponents,
	getRelativePath,
	physicalPath,
	physicalPathUrl,
} from "./path";

describe("getRelativePath", () => {
	it("should return the target path when no relativeTo is provided", () => {
		expect(
			getRelativePath("domains/test-domain/subdomains/test-subdomain"),
		).toBe("domains/test-domain/subdomains/test-subdomain");
	});

	it('should return "." when target and relativeTo are the same', () => {
		expect(
			getRelativePath(
				"domains/test-domain/subdomains/test-subdomain",
				"domains/test-domain/subdomains/test-subdomain",
			),
		).toBe(".");
	});

	it("should return the relative path when relativeTo is provided", () => {
		expect(
			getRelativePath(
				"domains/test-domain/subdomains/test-subdomain",
				"domains/test-domain",
			),
		);
	});

	it("should return the relative back with backtracing when relativeTo is in a different path", () => {
		expect(
			getRelativePath(
				"domains/test-domain/subdomains/test-subdomain/boundedcontexts/test-bc/services/test-service",
				"domains/test-domain/subdomains/other-subdomain/boundedcontexts/other-bc/services/other-service",
			),
		).toBe(
			"../../../../../test-subdomain/boundedcontexts/test-bc/services/test-service",
		);
	});

	it.each([
		["safe_name", "safe_name"],
		["a~1b", "_ods_0061007e00310062"],
		["a~01b", "_ods_0061007e003000310062"],
		["%2F", "_ods_002500320046"],
		["", "_ods_"],
		["é", "_ods_00e9"],
		[".", "_ods_002e"],
		["a\\b", "_ods_0061005c0062"],
		["Case", "_ods_0043006100730065"],
		["_ods_claimed", "_ods_005f006f00640073005f0063006c00610069006d00650064"],
		["\ud800", "_ods_d800"],
		["con", "_ods_0063006f006e"],
	])("projects model segment %j injectively", (segment, expected) => {
		expect(fileComponents(segment)).toEqual([expected]);
	});

	it("expands long safe and escaped segments into bounded framed components", () => {
		for (const segment of ["a".repeat(260), "~0".repeat(70)]) {
			const components = fileComponents(segment);
			expect(components.length).toBeGreaterThan(1);
			expect(
				components.slice(0, -1).every((part) => /^_ods_long_[sb]c_/.test(part)),
			).toBe(true);
			expect(components[components.length - 1]).toMatch(/^_ods_long_[sb]e_/);
			expect(components.every((part) => part.length <= 240)).toBe(true);
		}
	});

	it("reserves long framing against literal and adjacent logical segments", () => {
		const long = "~0".repeat(70);
		const projected = physicalPath(long);
		expect(physicalPath(projected)).not.toBe(projected);
		expect(
			physicalPath(
				"_ods_long_bc_candidate/_ods_long_be_candidate/_ods_long_sc_candidate",
			),
		).not.toContain("_ods_long_bc_candidate/");
	});

	it.each([
		["", "\0"],
		["\0", "\0\0"],
		["\u0001", "\u0002"],
		["\ud800", "\udc00"],
		["\ud800", "\ufffd"],
		["\0", "0"],
	])("keeps long UTF-16 tails %j and %j distinct", (leftTail, rightTail) => {
		const prefix = "~".repeat(80);
		const left = fileComponents(`${prefix}${leftTail}`);
		const right = fileComponents(`${prefix}${rightTail}`);
		expect(left.every((part) => /^_ods_long_b[ce]_/.test(part))).toBe(true);
		expect(right.every((part) => /^_ods_long_b[ce]_/.test(part))).toBe(true);
		expect(left).not.toEqual(right);
	});

	it("keeps structural separators while preserving empty terminal segments", () => {
		expect(physicalPath("boundedcontexts/a~1b/services/")).toBe(
			"boundedcontexts/_ods_0061007e00310062/services/_ods_",
		);
	});

	it("encodes physical paths separately for Markdown URLs", () => {
		expect(physicalPathUrl("domains/sales/index.md")).toBe(
			"domains/sales/index.md",
		);
	});
});
