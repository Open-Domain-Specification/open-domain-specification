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

	it("keeps a hash with a malformed escape instead of throwing", () => {
		location.hash = "#/search?q=100%";
		const router = createRouter();
		expect(router.ref).toBe("#/search?q=100%");
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

describe("createRouter link delegation", () => {
	const click = (a: HTMLAnchorElement, init: MouseEventInit = {}) => {
		const e = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
			button: 0,
			...init,
		});
		a.dispatchEvent(e);
		return e;
	};
	const anchor = (href: string) => {
		const a = document.createElement("a");
		a.href = href;
		a.textContent = "link";
		document.body.appendChild(a);
		return a;
	};
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("navigates route anchors itself so the webview host cannot swallow them", () => {
		location.hash = "";
		const router = createRouter();
		const e = click(anchor("#/domains/sales"));
		expect(e.defaultPrevented).toBe(true);
		expect(location.hash).toBe("#/domains/sales");
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		expect(router.ref).toBe("#/domains/sales");
	});

	it("leaves section anchors and modified clicks to the browser", () => {
		location.hash = "";
		createRouter();
		expect(click(anchor("#overview")).defaultPrevented).toBe(false);
		expect(
			click(anchor("#/domains/sales"), { metaKey: true }).defaultPrevented,
		).toBe(false);
		expect(location.hash).toBe("");
	});

	it("treats a bare '#' anchor as the workspace", () => {
		location.hash = "#/domains/sales";
		const router = createRouter();
		click(anchor("#"));
		window.dispatchEvent(new HashChangeEvent("hashchange"));
		expect(router.ref).toBe("#");
	});
});
