import { beforeAll } from "vitest";

/** jsdom lacks what @xyflow/svelte measures with; install minimal stand-ins once per file. */
export function installXyflowTestEnv(): void {
	beforeAll(() => {
		if (typeof ResizeObserver === "undefined") {
			// biome-ignore lint/suspicious/noExplicitAny: minimal test polyfill
			(globalThis as any).ResizeObserver = class {
				observe() {}
				unobserve() {}
				disconnect() {}
			};
		}
		if (typeof window.matchMedia !== "function") {
			window.matchMedia = (query: string) =>
				({
					matches: false,
					media: query,
					onchange: null,
					addListener() {},
					removeListener() {},
					addEventListener() {},
					removeEventListener() {},
					dispatchEvent: () => false,
					// biome-ignore lint/suspicious/noExplicitAny: minimal test polyfill
				}) as any;
		}
	});
}
