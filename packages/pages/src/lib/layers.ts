/**
 * The layers that Escape closes, innermost first.
 *
 * A page can stack four things that each close on Escape: a fullscreen diagram,
 * the evidence card opened from a badge in it, a pattern explanation opened
 * from a keyword in the card, and a modal. Each used to listen for the key on
 * its own, and which one won depended on where its listener sat and in what
 * phase (window capture before document capture, and a modal's own element
 * last), so an outer layer could take the key before an inner one saw it and
 * one Escape closed two layers.
 *
 * This is the one place that answers the question. A layer registers when it
 * opens and releases when it closes, so the stack is in the order they opened,
 * which is inside-out: a layer opened from another one is on top of it. The
 * single listener closes the top entry and takes the key, so no other listener
 * on the page, registered or not, sees an Escape that has already been spent.
 * Each layer's `dismiss` does its own closing and its own return of focus:
 * the card hands focus back to its badge, a modal to its trigger, and a
 * pattern explanation leaves focus on the keyword that is still in the card.
 *
 * The listener is on the window in the capture phase, and is bound only while
 * a layer is up, so it never swallows the key on a page with none.
 */
export type Layer = { dismiss(): void };

const layers: Layer[] = [];

const onKeydown = (event: KeyboardEvent) => {
	if (event.key !== "Escape") return;
	// Bound only while the stack is not empty, so there is always a top.
	const top = layers[layers.length - 1];
	event.stopPropagation();
	top.dismiss();
};

/**
 * Puts `layer` on top of the stack; returns the function that takes it off,
 * wherever it then is in the stack. Releasing twice is harmless.
 */
export function openLayer(layer: Layer): () => void {
	if (layers.length === 0) window.addEventListener("keydown", onKeydown, true);
	layers.push(layer);
	return () => {
		const at = layers.indexOf(layer);
		if (at < 0) return;
		layers.splice(at, 1);
		if (layers.length === 0)
			window.removeEventListener("keydown", onKeydown, true);
	};
}
