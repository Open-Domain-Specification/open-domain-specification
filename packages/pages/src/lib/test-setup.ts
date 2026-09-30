import "@testing-library/jest-dom/vitest";
import { installXyflowTestEnv } from "./xyflow-test-env";

/**
 * Hands the jsdom suites jsdom's own web storage. Node 25 and later define
 * `localStorage` and `sessionStorage` on the global (undefined without
 * `--localstorage-file`), and Vitest 3 does not copy a jsdom key the global
 * already has, so Node's empty getters would shadow jsdom's storage.
 */
function useJsdomStorage(): void {
	const { jsdom } = globalThis as { jsdom?: { window: Window } };
	if (!jsdom) return;
	for (const key of ["localStorage", "sessionStorage"] as const) {
		Object.defineProperty(globalThis, key, {
			get: () => jsdom.window[key],
			configurable: true,
		});
	}
}

// Every page carries a Svelte Flow figure, so the jsdom stand-ins apply to the whole suite.
if (typeof window !== "undefined") {
	useJsdomStorage();
	installXyflowTestEnv();
}
