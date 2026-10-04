<script lang="ts">
import { tick } from "svelte";
import Icon from "../lib/atoms/Icon.svelte";
import Sidebar from "../lib/organisms/Sidebar.svelte";
import { currentRow, revealRow, scrollContainer } from "../lib/tree-scroll";

/**
 * The site's navigation. Above 900px it is the persistent sidebar. At and
 * below it the one tree sits behind a disclosure button placed before the
 * page, so a phone reader meets the page first and opens the tree on purpose.
 * There is a single tree: the disclosure only hides and shows it, and the
 * container is the tree's own bounded scroller while open.
 *
 * Focus is never left on a hidden element: Escape and a collapse by resize
 * move it to the button, a widening that removes the button moves it to the
 * reader's own row, and a selection leaves it to the router's arrival focus on
 * the page heading. Nothing here takes focus otherwise.
 */
const { current }: { current: string } = $props();

const query = window.matchMedia("(max-width: 900px)");
let narrow = $state(query.matches);
let open = $state(false);
// The button exists only below the breakpoint, so it is state, not a fixed node.
let button = $state<HTMLButtonElement>();
let nav: HTMLElement;
let tree: HTMLElement;

$effect(() => {
	const onChange = async (event: MediaQueryListEvent) => {
		narrow = event.matches;
		open = false;
		const focus = document.activeElement;
		await tick();
		if (event.matches) {
			// Collapsing under a reader who was in the tree.
			if (tree.contains(focus)) (button as HTMLButtonElement).focus();
			return;
		}
		// The button is gone and the tree is the navigation: keep a reader who was
		// on the button in it, on their own row when it has one. Focus moves now, so
		// it is never nowhere while the layout settles; it does not scroll, because
		// the row is brought into view below, once the sidebar has its final size.
		const row = currentRow(list());
		if (focus?.id === "site-tree-toggle") {
			(
				row?.querySelector<HTMLElement>("a") ??
				tree.querySelector<HTMLElement>("a")
			)?.focus({ preventScroll: true });
		}
		// The tree is now the sidebar, a scroller of its own, and the row the reader
		// was brought to is shown there as it was in the disclosure. Crossing the
		// breakpoint restyles the layout (the sidebar's padding, the tree's box) and
		// with less motion asked for those changes are transitions of a hundredth of
		// a millisecond, which land a frame after this event: measured then, the row
		// is placed against the old layout and ends up clipped. So wait for the
		// layout's own transitions, and look again only if the window is still wide.
		await Promise.allSettled(
			nav
				.getAnimations?.({ subtree: true })
				.map((animation) => animation.finished) ?? [],
		);
		if (!narrow) reveal();
	};
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
});

const list = () => tree.querySelector<HTMLElement>("nav.tree") as HTMLElement;

/** Brings the current row, or the deepest row on its path, into the tree's own scroller, and returns it. */
function reveal(): HTMLElement | null {
	const row = currentRow(list());
	const container = scrollContainer(list());
	if (row && container) revealRow(container, row, "auto");
	return row;
}

async function toggle() {
	open = !open;
	if (!open) return;
	await tick();
	reveal();
}

function onkeydown(event: KeyboardEvent) {
	if (event.key !== "Escape" || !narrow || !open) return;
	event.preventDefault();
	(button as HTMLButtonElement).focus();
	open = false;
}

/*
 * Both handlers below are on containers and only observe events that bubbled
 * from the button and the tree's own links: they add no interaction target.
 */

/**
 * Choosing a row navigates (the router's click handler) and puts the tree away.
 * The router claims a click it takes with preventDefault before this container
 * sees it; a click it leaves to the browser (a modifier, a non-primary button, a
 * new-tab link) is not a selection, so the tree stays open with focus on the
 * row the reader is still on.
 */
function onclick(event: MouseEvent) {
	if (event.defaultPrevented && (event.target as Element).closest("a[href]")) {
		open = false;
	}
}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="site-nav" {onkeydown} bind:this={nav}>
	{#if narrow}
		<button
			type="button"
			class="tree-toggle"
			id="site-tree-toggle"
			aria-expanded={open}
			aria-controls="site-tree"
			bind:this={button}
			onclick={toggle}
		><span aria-hidden="true"><Icon name={open ? "chevron-down" : "chevron-right"} /></span> Workspace tree</button>
	{/if}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="site-tree" id="site-tree" hidden={narrow && !open} bind:this={tree} {onclick}>
		<Sidebar {current} />
	</div>
</div>
