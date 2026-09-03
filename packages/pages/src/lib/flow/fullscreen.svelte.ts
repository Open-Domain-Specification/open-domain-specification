/**
 * Fullscreen state for one interactive diagram.
 *
 * There is no `requestFullscreen` here on purpose: a VS Code webview is an
 * iframe without the fullscreen permission, so the only path that works
 * everywhere is a fixed overlay the figure paints itself. This module owns the
 * boolean behind that overlay, the Escape binding (listened for only while the
 * overlay is up, so it never swallows the key on a normal page) and the refit
 * that follows a size change.
 */
import { tick } from "svelte";

export type Fullscreen = {
	/** True while the diagram is drawn as a full-viewport overlay. */
	readonly active: boolean;
	/**
	 * Flips the overlay. `fit` re-centres the canvas and is supplied by the
	 * caller because only a component inside Svelte Flow can reach `fitView`.
	 * It is remembered, so a later Escape refits the same canvas.
	 */
	toggle(fit: () => void): void;
	/** Leaves the overlay, if it is up. Used before navigating away from the page. */
	exit(): void;
	/** Drops the Escape binding; call on teardown. */
	stop(): void;
};

/**
 * A tick lets the class land on the element, a frame lets the browser lay the
 * new size out; only then does Svelte Flow measure a viewport worth fitting to.
 */
async function refit(fit: (() => void) | undefined): Promise<void> {
	await tick();
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	fit?.();
}

export function createFullscreen(): Fullscreen {
	let active = $state(false);
	let fit: (() => void) | undefined;
	let onKeydown: ((event: KeyboardEvent) => void) | undefined;
	const stop = () => {
		if (!onKeydown) return;
		window.removeEventListener("keydown", onKeydown);
		onKeydown = undefined;
	};
	const set = (next: boolean) => {
		if (next === active) return;
		active = next;
		if (next) {
			onKeydown = (event) => {
				if (event.key === "Escape") set(false);
			};
			window.addEventListener("keydown", onKeydown);
		} else stop();
		void refit(fit);
	};
	return {
		get active() {
			return active;
		},
		toggle(next: () => void) {
			fit = next;
			set(!active);
		},
		exit: () => set(false),
		stop,
	};
}
