/**
 * Fullscreen state for one interactive diagram.
 *
 * There is no `requestFullscreen` here on purpose: a VS Code webview is an
 * iframe without the fullscreen permission, so the only path that works
 * everywhere is a fixed overlay the figure paints itself. This module owns the
 * boolean behind that overlay and its place in the stack of layers Escape closes (only
 * while the overlay is up, so it never swallows the key on a normal page). The refit
 * that follows the size change is the fit's (`PanelFit.svelte`): it waits for Svelte
 * Flow to measure the new canvas, which no frame count here could promise.
 */
import { openLayer } from "../layers";

export type Fullscreen = {
	/** True while the diagram is drawn as a full-viewport overlay. */
	readonly active: boolean;
	/** Flips the overlay. */
	toggle(): void;
	/** Leaves the overlay, if it is up. Used before navigating away from the page. */
	exit(): void;
	/** Drops the Escape binding; call on teardown. */
	stop(): void;
};

export function createFullscreen(): Fullscreen {
	let active = $state(false);
	let releaseLayer: (() => void) | undefined;
	const stop = () => {
		releaseLayer?.();
		releaseLayer = undefined;
	};
	const set = (next: boolean) => {
		if (next === active) return;
		active = next;
		if (next) {
			// The overlay is the outermost layer: Escape reaches it only once
			// everything opened from inside it has been closed (`layers.ts`).
			releaseLayer = openLayer({ dismiss: () => set(false) });
		} else stop();
	};
	return {
		get active() {
			return active;
		},
		toggle() {
			set(!active);
		},
		exit: () => set(false),
		stop,
	};
}
