/**
 * The open disclosure card of one interactive diagram.
 *
 * RFC-002 section 4.2 asks for the relationship detail to open *inside* the
 * diagram, anchored to the badge that was clicked, so it pans, zooms and
 * survives fullscreen with the map. That means flow coordinates, not screen
 * ones, and it means the card closes the three ways a reader expects: Escape,
 * a click anywhere else, and following a link out of it.
 *
 * The window listeners exist only while a card is open, so this never swallows
 * a key or a click on a page that has no card up. The card element itself
 * stops `pointerdown` from reaching the window, which is what makes "anywhere
 * else" mean anywhere else.
 */
import type { ContextRelationship } from "@open-domain-specification/core";
import type { Edge } from "@xyflow/svelte";
import type { ContextEdgeData } from "./flow-nodes";
import type { Graph } from "./graph";

/** The relationship on show, and the flow point its badge sits at. */
export type Anchored = {
	relationship: ContextRelationship;
	x: number;
	y: number;
};

export type Disclosure = {
	/** The card on show, or nothing. */
	readonly open: Anchored | undefined;
	/** Opens the detail for `relationship`, anchored at the badge's flow point. */
	show(relationship: ContextRelationship, at: { x: number; y: number }): void;
	/** Closes the card, if one is up. */
	close(): void;
	/** Drops the window listeners; call on teardown. */
	stop(): void;
};

export function createDisclosure(): Disclosure {
	let open = $state.raw<Anchored | undefined>(undefined);
	let onKeydown: ((event: KeyboardEvent) => void) | undefined;
	let onDismiss: (() => void) | undefined;
	const stop = () => {
		if (!onKeydown || !onDismiss) return;
		window.removeEventListener("keydown", onKeydown);
		window.removeEventListener("pointerdown", onDismiss);
		window.removeEventListener("hashchange", onDismiss);
		onKeydown = undefined;
		onDismiss = undefined;
	};
	const close = () => {
		open = undefined;
		stop();
	};
	return {
		get open() {
			return open;
		},
		show(relationship, at) {
			stop();
			open = { relationship, x: at.x, y: at.y };
			onKeydown = (event) => {
				if (event.key === "Escape") close();
			};
			onDismiss = close;
			window.addEventListener("keydown", onKeydown);
			window.addEventListener("pointerdown", onDismiss);
			window.addEventListener("hashchange", onDismiss);
		},
		close,
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
			onBadgeClick: (at) => disclosure.show(intent, at),
		};
		return { ...edge, data };
	});
}
