import { PATTERNS } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { roleLabel, roleTitle } from "./roles";

describe("roleLabel", () => {
	it("abbreviates known patterns and passes unknown text through", () => {
		expect(roleLabel("open-host-service")).toBe("OHS");
		expect(roleLabel("anti-corruption-layer")).toBe("ACL");
		expect(roleLabel("custom")).toBe("custom");
		expect(roleLabel(undefined)).toBeUndefined();
	});
});

describe("roleTitle", () => {
	it("explains each part of a combined label in core's words", () => {
		expect(roleTitle("CF")).toBe(`Conformist — ${PATTERNS.conformist.summary}`);
		expect(roleTitle("OHS+PL")).toBe(
			[
				`Open Host Service — ${PATTERNS["open-host-service"].summary}`,
				`Published Language — ${PATTERNS["published-language"].summary}`,
			].join("\n"),
		);
	});
	it("passes an unknown mark through", () => {
		expect(roleTitle("?")).toBe("?");
	});
});
