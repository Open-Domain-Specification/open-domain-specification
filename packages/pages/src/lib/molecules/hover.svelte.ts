/**
 * Open/closed state for one hover disclosure.
 *
 * A hover disclosure is not a tooltip: it opens on hover after a pause, it
 * opens on keyboard focus, a click pins it open, and Escape or a click
 * anywhere else closes it. The pause matters because a table row is a line of
 * keywords — sweeping the pointer along it must open nothing.
 *
 * Only one disclosure is open at a time, which is why the current one is
 * module state: a second opening closes the first without the two components
 * having to know about each other.
 *
 * This is deliberately not `flow/disclosure.svelte.ts`: that one is per
 * diagram, in flow coordinates, with no delay and no pinning.
 */

/** Long enough that the pointer can cross a keyword on its way somewhere else. */
export const OPEN_DELAY = 150;

/** The disclosure that currently owns the screen, if any. */
let current: Hover | undefined;

export type Hover = {
	/** True while the card is on screen. */
	readonly open: boolean;
	/** Pointer entered the trigger: open after {@link OPEN_DELAY}. */
	hover(): void;
	/** Pointer left the trigger and its card: close unless pinned. */
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

	const onKeydown = (event: Event) => {
		if ((event as KeyboardEvent).key === "Escape") hover.close();
	};
	// Captured on pointerdown rather than click so a card closes before whatever
	// was clicked underneath it reacts.
	const onPointerDown = (event: Event) => {
		const target = event.target as Node | null;
		if (target && root()?.contains(target)) return;
		hover.close();
	};

	const listen = (on: boolean) => {
		const bind = on ? document.addEventListener : document.removeEventListener;
		bind.call(document, "keydown", onKeydown, true);
		bind.call(document, "pointerdown", onPointerDown, true);
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
		hover() {
			clearTimeout(timer);
			if (open) return;
			timer = setTimeout(show, OPEN_DELAY);
		},
		unhover() {
			clearTimeout(timer);
			if (!pinned) hover.close();
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
