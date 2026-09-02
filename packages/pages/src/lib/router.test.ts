import { afterEach, describe, expect, it, vi } from "vitest";
import { createRouter } from "./router.svelte";

afterEach(() => {
	location.hash = "";
});

describe("createRouter", () => {
	it("starts at the workspace when the hash is empty", () => {
		location.hash = "";
		const router = createRouter();
		expect(router.ref).toBe("#");
	});

	it("treats a bare '#' or a single-character hash as the workspace", () => {
		location.hash = "#a";
		const router = createRouter();
		expect(router.ref).toBe("#");
	});

	it("strips a trailing slash from the current hash", () => {
		location.hash = "#/domains/sales/";
		const router = createRouter();
		expect(router.ref).toBe("#/domains/sales");
	});

	it("keeps a hash with no trailing slash as-is", () => {
		location.hash = "#/domains/sales";
		const router = createRouter();
		expect(router.ref).toBe("#/domains/sales");
	});

	it("updates ref when the hash changes", () => {
		location.hash = "";
		const router = createRouter();
		expect(router.ref).toBe("#");
		location.hash = "#/teams/pet_shop_team";
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		expect(router.ref).toBe("#/teams/pet_shop_team");
	});

	it("go() navigates by setting the location hash", () => {
		location.hash = "";
		const router = createRouter();
		router.go("#/domains/sales");
		expect(location.hash).toBe("#/domains/sales");
	});

	it("starts at the workspace when there is no location, as in SSR", () => {
		vi.stubGlobal("location", undefined);
		try {
			const router = createRouter();
			expect(router.ref).toBe("#");
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
