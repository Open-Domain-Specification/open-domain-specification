import { describe, expect, it } from "vitest";
import { getRelativePath } from "./path";

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
});
