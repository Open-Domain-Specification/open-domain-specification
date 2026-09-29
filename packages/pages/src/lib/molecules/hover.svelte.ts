/**
 * Open/closed state for one hover disclosure.
 *
 * A hover disclosure is not a tooltip: it opens on hover after a pause, it
 * opens on keyboard focus, a click pins it open, and Escape (through the layer stack), a click anywhere
 * else, or the page scrolling or resizing closes it. The pause matters
 * because a table row is a line of keywords — sweeping the pointer along it
 * must open nothing. Scrolling closes it because the card is placed in
 * viewport coordinates when it opens, as the editor's hover is, and the
 * editor's hover goes when its line moves.
 *
 * Only one disclosure is open at a time, which is why the current one is
 * module state: a second opening closes the first without the two components
 * having to know about each other.
 *
 * This is deliberately not `flow/disclosure.svelte.ts`: that one is per
 * diagram, in flow coordinates, with no delay and no pinning.
 */

import { openLayer } from "../layers";

/** Long enough that the pointer can cross a keyword on its way somewhere else. */
export const OPEN_DELAY = 150;

/** The disclosure that currently owns the screen, if any. */
let current: Hover | undefined;

export type Hover = {
	/** True while the card is on screen. */
	readonly open: boolean;
	/** Counts scrolls that moved the keyword under an open card the keyboard has focus in. */
	readonly moves: number;
	/** Pointer entered the trigger: open after {@link OPEN_DELAY}. */
	hover(): void;
	/** Pointer left the trigger and its card: close unless pinned or the keyboard has focus in it. */
	unhover(): void;
	/** Keyboard focus reached the trigger: open at once, with no pause to wait through. */
	focus(): void;
	/** The trigger was clicked: pin it open, or unpin and close. */
	pin(): void;
	/** Close, whether pinned or not. */
	close(): void;
	/** Drops any pending timer and global listener; call on teardown. */
	stop(): void;
};

/**
 * `root` returns the element that owns both the trigger and the card, so a
 * click inside either counts as a click on this disclosure rather than
 * outside it. It is a callback because the element only exists once the
 * component mounts.
 */
export function createHover(root: () => HTMLElement | undefined): Hover {
	let open = $state(false);
	let pinned = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	// Captured on pointerdown rather than click so a card closes before whatever
	// was clicked underneath it reacts.
	// A pointer or a scroll inside the disclosure is the reader using it; the
	// card scrolls inside itself when it was given less room than it needs.
	const onOutside = (event: Event) => {
		const target = event.target as Node | null;
		if (target && root()?.contains(target)) return;
		hover.close();
	};

	/**
	 * How many times the keyword moved under a card the keyboard opened. Focusing
	 * a keyword can scroll a container to reveal it (a diagram's viewport, a card
	 * given less room than it needs), and the browser does that, and reports it,
	 * after the card has opened where the keyword was. That is not the reader
	 * leaving, so it must not close the card, but the card is placed in viewport
	 * coordinates and has to follow: the component places it again when this
	 * changes. It made a keyword focused by keyboard sometimes not disclose at
	 * all, about one run in seven in the real webview.
	 */
	let moves = $state(0);
	const onScroll = (event: Event) => {
		if (!pinned && root()?.contains(document.activeElement)) {
			moves += 1;
			return;
		}
		onOutside(event);
	};

	let releaseLayer: (() => void) | undefined;
	const listen = (on: boolean) => {
		// Escape is the layer stack's (`layers.ts`): this explanation is the top layer
		// while it is the last thing opened, and closing it leaves focus on its keyword.
		if (on) releaseLayer = openLayer({ dismiss: hover.close });
		else (releaseLayer as () => void)();
		const bind = on ? document.addEventListener : document.removeEventListener;
		bind.call(document, "pointerdown", onOutside, true);
		bind.call(document, "scroll", onScroll, true);
		const bindWindow = on
			? window.addEventListener
			: window.removeEventListener;
		bindWindow.call(window, "resize", hover.close);
	};

	const show = () => {
		clearTimeout(timer);
		if (open) return;
		// Never this one: a disclosure that is not open is never the current one.
		current?.close();
		current = hover;
		open = true;
		listen(true);
	};

	const hover: Hover = {
		get open() {
			return open;
		},
		get moves() {
			return moves;
		},
		hover() {
			clearTimeout(timer);
			if (open) return;
			timer = setTimeout(show, OPEN_DELAY);
		},
		unhover() {
			clearTimeout(timer);
			// A pointer leaving does not take away what the keyboard opened: while
			// focus is on the keyword the explanation stays, whatever the mouse
			// cursor does (a real one rests wherever it was left over the window).
			if (!pinned && !root()?.contains(document.activeElement)) hover.close();
		},
		focus: show,
		pin() {
			if (pinned) {
				hover.close();
				return;
			}
			show();
			pinned = true;
		},
		close() {
			clearTimeout(timer);
			if (!open) return;
			open = false;
			pinned = false;
			if (current === hover) current = undefined;
			listen(false);
		},
		stop() {
			hover.close();
		},
	};
	return hover;
}
