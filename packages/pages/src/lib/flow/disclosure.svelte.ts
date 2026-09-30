/**
 * The open disclosure card of one interactive diagram.
 *
 * RFC-002 section 4.2 asks for the relationship detail to open *inside* the
 * diagram, anchored to the badge that was clicked, so it pans, zooms and
 * survives fullscreen with the map. That means flow coordinates, not screen
 * ones, and it means the card closes the three ways a reader expects: Escape,
 * a click anywhere else, and following a link out of it.
 *
 * A card opened from the keyboard is left the way it was entered. Focus moves
 * into it when it opens (DisclosureCard) and Escape or its own Close button
 * hands focus back to the badge that opened it, as the modal does for the
 * toggle that opened that. A click somewhere else, or a link followed out of
 * the card, closes it without taking focus from wherever the reader went.
 *
 * Escape is not this module's to interpret: the card is one layer in the
 * stack of things Escape closes (`layers.ts`), so a fullscreen diagram behind
 * it stays fullscreen and a pattern explanation inside it goes first.
 *
 * The window listeners exist only while a card is open, so this never swallows
 * a key or a click on a page that has no card up. The card element itself
 * stops `pointerdown` from reaching the window, which is what makes "anywhere
 * else" mean anywhere else.
 */
import type { ContextRelationship } from "@open-domain-specification/core";
import type { Edge } from "@xyflow/svelte";
import { openLayer } from "../layers";
import type { ContextEdgeData } from "./flow-nodes";
import type { Graph } from "./graph";

/** The relationship on show, and the flow point its badge sits at. */
export type Anchored = {
	relationship: ContextRelationship;
	x: number;
	y: number;
	/** The badge that opened the card, which is where focus goes back to. */
	invoker?: HTMLElement;
};

export type Disclosure = {
	/** The card's element id, which each badge's `aria-controls` points at while it is open. */
	readonly id: string;
	/** The card on show, or nothing. */
	readonly open: Anchored | undefined;
	/**
	 * Opens the detail for `relationship`, anchored at the badge's flow point.
	 * `invoker` is the badge, so a keyboard reader can be handed back to it.
	 */
	show(
		relationship: ContextRelationship,
		at: { x: number; y: number },
		invoker?: HTMLElement,
	): void;
	/** Closes the card, if one is up, and leaves focus where it is. */
	close(): void;
	/** Closes the card and returns focus to the badge that opened it: Escape and the Close button. */
	dismiss(): void;
	/** Drops the window listeners; call on teardown. */
	stop(): void;
};

/** One id per diagram on a page, so two figures never share a card id. */
let issued = 0;

export function createDisclosure(): Disclosure {
	const id = `disclosure-card-${++issued}`;
	let open = $state.raw<Anchored | undefined>(undefined);
	let releaseLayer: (() => void) | undefined;
	let onDismiss: (() => void) | undefined;
	const stop = () => {
		if (!releaseLayer || !onDismiss) return;
		releaseLayer();
		window.removeEventListener("pointerdown", onDismiss);
		window.removeEventListener("hashchange", onDismiss);
		releaseLayer = undefined;
		onDismiss = undefined;
	};
	const close = () => {
		open = undefined;
		stop();
	};
	const dismiss = () => {
		const back = open?.invoker;
		close();
		back?.focus();
	};
	return {
		id,
		get open() {
			return open;
		},
		show(relationship, at, invoker) {
			stop();
			open = { relationship, x: at.x, y: at.y, invoker };
			// Escape closes whichever layer is innermost (`layers.ts`); while the card
			// is the top one that is the card, and it hands focus back to its badge.
			releaseLayer = openLayer({ dismiss });
			onDismiss = close;
			window.addEventListener("pointerdown", onDismiss);
			window.addEventListener("hashchange", onDismiss);
		},
		close,
		dismiss,
		stop,
	};
}

/**
 * The same edges, with every badge over a known intent wired to open that
 * intent's card. The intent rides on the graph edge, so this is the one step
 * that needs the diagram: only a component can hold the card that opens.
 */
export function withDisclosure(
	edges: Edge[],
	graph: Graph,
	disclosure: Disclosure,
): Edge[] {
	return edges.map((edge) => {
		const intent = graph.edges.find((e) => e.id === edge.id)?.intent;
		if (!intent) return edge;
		const data: ContextEdgeData = {
			...(edge.data as ContextEdgeData),
			cardId: disclosure.id,
			disclosedBy: () => disclosure.open?.invoker,
			onBadgeClick: (at, invoker) => disclosure.show(intent, at, invoker),
		};
		return { ...edge, data };
	});
}
