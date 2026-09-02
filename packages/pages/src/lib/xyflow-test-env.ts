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

/** A placed, sized node for the internal-node mock; `handles` are its target handles. */
export type Box = {
	x: number;
	y: number;
	w: number;
	h: number;
	handles?: { id: string; x: number; y: number; w: number; h: number }[];
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
				return {
					data: {},
					internals: {
						positionAbsolute: { x: b.x, y: b.y },
						handleBounds: b.handles
							? {
									target: b.handles.length
										? b.handles.map((h) => ({
												id: h.id,
												x: h.x,
												y: h.y,
												width: h.w,
												height: h.h,
											}))
										: null,
								}
							: undefined,
					},
					measured: { width: b.w, height: b.h },
				};
			},
		}),
	};
}
