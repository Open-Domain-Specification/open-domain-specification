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
	it("spells out each part of a combined label", () => {
		expect(roleTitle("OHS+PL")).toBe("open-host-service + published-language");
		expect(roleTitle("CF")).toBe("conformist");
		expect(roleTitle("?")).toBe("?");
	});
});
