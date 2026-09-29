/**
 * The reader's motion preference, in one place.
 *
 * CSS animations and transitions honour `prefers-reduced-motion` from the
 * stylesheet (`assets/page.css`). What a stylesheet cannot reach is motion the
 * page asks a script for: a smooth scroll, a viewport that eases to a new
 * zoom. Every such call reads the preference here, so there is one place that
 * says what "less motion" means and one query behind it. The query is the
 * host's: a VS Code webview, the viewer and a static export all inherit it
 * from the browser or the workbench, so nothing here is specific to any one.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

/** Whether the reader has asked for less motion, as of this moment. */
export const prefersReducedMotion = (): boolean =>
	window.matchMedia(QUERY).matches;

/**
 * How to scroll to something the reader asked to go to: smoothly, unless they
 * have asked for less motion, when the jump is immediate.
 */
export const scrollBehavior = (): ScrollBehavior =>
	prefersReducedMotion() ? "auto" : "smooth";

/**
 * The preference as reactive state, for what a component has to hand a library
 * as a prop and have follow the setting while the page is open. Call `stop`
 * on teardown.
 */
export function createReducedMotion() {
	const query = window.matchMedia(QUERY);
	let reduced = $state(query.matches);
	const onChange = (event: MediaQueryListEvent) => {
		reduced = event.matches;
	};
	query.addEventListener("change", onChange);
	return {
		get reduced() {
			return reduced;
		},
		stop() {
			query.removeEventListener("change", onChange);
		},
	};
}
