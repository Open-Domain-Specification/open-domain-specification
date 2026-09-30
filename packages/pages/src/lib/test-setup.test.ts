import { describe, expect, it } from "vitest";

// Node 25 and later shadow these globals with storage that is undefined unless
// `--localstorage-file` is given; the pages suites must read jsdom's instead.
const { jsdom } = globalThis as unknown as {
	jsdom: { window: Window & typeof globalThis };
};

describe("the jsdom suites' web storage", () => {
	for (const key of ["localStorage", "sessionStorage"] as const) {
		it(`${key} is jsdom's storage and keeps what is written`, () => {
			const storage = globalThis[key];
			expect(storage).toBe(jsdom.window[key]);
			expect(storage).toBe(window[key]);
			expect(storage).toBeInstanceOf(jsdom.window.Storage);
			storage.setItem("ods-storage-check", "kept");
			expect(storage.getItem("ods-storage-check")).toBe("kept");
			storage.removeItem("ods-storage-check");
			expect(storage.getItem("ods-storage-check")).toBeNull();
		});
	}
});
