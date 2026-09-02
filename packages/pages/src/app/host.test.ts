import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `vscode`, `embedded` and `bootstrap` are evaluated (or read live globals)
 * as soon as the module is loaded, so every case gets a fresh module via
 * `vi.resetModules()` plus a dynamic import.
 */

afterEach(() => {
	vi.unstubAllGlobals();
	(window as unknown as { __ODS__?: unknown }).__ODS__ = undefined;
});

describe("vscode / embedded", () => {
	it("is undefined and not embedded when there is no host bridge", async () => {
		vi.resetModules();
		const host = await import("./host");
		expect(host.vscode).toBeUndefined();
		expect(host.embedded).toBe(false);
	});

	it("exposes the bridge and is embedded when acquireVsCodeApi is a function", async () => {
		const api = { postMessage: vi.fn() };
		vi.stubGlobal("acquireVsCodeApi", () => api);
		vi.resetModules();
		const host = await import("./host");
		expect(host.vscode).toBe(api);
		expect(host.embedded).toBe(true);
	});

	it("treats a non-function acquireVsCodeApi as absent", async () => {
		vi.stubGlobal("acquireVsCodeApi", "not-a-function");
		vi.resetModules();
		const host = await import("./host");
		expect(host.vscode).toBeUndefined();
		expect(host.embedded).toBe(false);
	});
});

describe("bootstrap", () => {
	it("returns undefined when window.__ODS__ is not set", async () => {
		vi.resetModules();
		const host = await import("./host");
		expect(host.bootstrap()).toBeUndefined();
	});

	it("returns window.__ODS__ when the host set it", async () => {
		vi.resetModules();
		const host = await import("./host");
		const value = { workspaces: [] };
		(window as unknown as { __ODS__?: unknown }).__ODS__ = value;
		expect(host.bootstrap()).toBe(value);
	});
});
