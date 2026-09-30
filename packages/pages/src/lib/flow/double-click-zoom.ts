/** A viewport as Svelte Flow keeps it: the flow's origin on screen, and the zoom. */
export type Viewport = { x: number; y: number; zoom: number };

/**
 * The viewport a double click lands on, worked as d3-zoom works it for the
 * library's own gesture: the zoom doubles (halves with Shift), clamped to the
 * map's limits, and the point under the pointer stays where it is. This is
 * what the gesture becomes when motion is reduced and the library's eased
 * version is switched off, so the step and the pivot have to be the same.
 *
 * `at` is the pointer relative to the diagram's own box.
 */
export function zoomedAt(
	view: Viewport,
	at: { x: number; y: number },
	limits: { min: number; max: number },
	out: boolean,
): Viewport {
	const zoom = Math.min(
		limits.max,
		Math.max(limits.min, view.zoom * (out ? 0.5 : 2)),
	);
	const ratio = zoom / view.zoom;
	return {
		x: at.x - (at.x - view.x) * ratio,
		y: at.y - (at.y - view.y) * ratio,
		zoom,
	};
}
