import { beforeAll, vi } from "vitest";

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

/**
 * Makes `prefers-reduced-motion` read `reduced` until the spy is restored (the
 * suite restores mocks after each test), and hands back a switch that flips it
 * and tells whoever is listening, as the browser does when a reader changes
 * the setting with the page open.
 */
export function stubReducedMotion(reduced: boolean) {
	const listeners = new Set<(event: MediaQueryListEvent) => void>();
	let matches = reduced;
	vi.spyOn(window, "matchMedia").mockImplementation((media) => {
		// Only the reduced-motion query is stubbed; any other (the colour scheme
		// Svelte Flow reads) is a query nothing matches and nobody can change.
		const ours = media.includes("prefers-reduced-motion");
		return {
			get matches() {
				return ours && matches;
			},
			media,
			addEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => {
				if (ours) listeners.add(l);
			},
			removeEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => {
				if (ours) listeners.delete(l);
			},
			// biome-ignore lint/suspicious/noExplicitAny: minimal test stand-in
		} as any;
	});
	return {
		listeners,
		set(next: boolean) {
			matches = next;
			for (const l of listeners) l({ matches: next } as MediaQueryListEvent);
		},
	};
}

/** A placed, sized node for the internal-node mock; `handles` are its target handles unless typed `source`. */
export type Box = {
	x: number;
	y: number;
	w: number;
	h: number;
	handles?: {
		id: string;
		x: number;
		y: number;
		w: number;
		h: number;
		type?: "source" | "target";
	}[];
};

/**
 * A stand-in for `useInternalNode`: jsdom never measures nodes, so edge tests
 * describe them as boxes by id. Reads go through the map on every access, so
 * a test can change a box between renders. An empty `handles` list mimics a
 * node measured with no handles; a missing one, a node not yet measured.
 */
export function mockInternalNodeBoxes(boxes: Record<string, Box | undefined>) {
	return {
		useInternalNode: (id: string) => ({
			get current() {
				const b = boxes[id];
				if (!b) return undefined;
				const of = (type: "source" | "target") => {
					const list = (b.handles ?? [])
						.filter((h) => (h.type ?? "target") === type)
						.map((h) => ({
							id: h.id,
							x: h.x,
							y: h.y,
							width: h.w,
							height: h.h,
						}));
					return list.length ? list : null;
				};
				return {
					data: {},
					internals: {
						positionAbsolute: { x: b.x, y: b.y },
						handleBounds: b.handles
							? { source: of("source"), target: of("target") }
							: undefined,
					},
					measured: { width: b.w, height: b.h },
				};
			},
		}),
	};
}
