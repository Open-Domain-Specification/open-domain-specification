<script lang="ts">
import type { Snippet } from "svelte";

/**
 * The centred panel a page opens for disclosure too big for a hover.
 * Principle 8 of the design language puts a pattern's meaning and an intent's
 * evidence summary in the editor's hover widget; a whole relationship — a
 * description, a definition list, a comment list and a table of crossings —
 * cannot live in a hover, and inside a table row it drew a table within a
 * table. The bottom sheet that first replaced that row took two fifths of a
 * webview that is already short, pushed the table up and scrolled the row it
 * belonged to out of sight, so the detail lost the row it was opened from.
 *
 * This is VS Code's own modal dialog instead: a panel centred over a dimmed
 * workbench, drawn on the widget surface with the widget border and shadow,
 * a title row with a close button, and a body that scrolls. Because it is
 * modal, nothing behind it can be read or reached while it is open, so the
 * row it came from does not have to stay on screen — the reader closes it and
 * is back exactly where they were, with focus on the toggle they pressed.
 *
 * Semantics are a real dialog: `role="dialog"` with `aria-modal`, the title
 * as its accessible name, focus moved into the panel on open and trapped in
 * it while it is up, and returned to whatever opened it on close. Escape, the
 * close button and a click on the scrim all close it. One prop opens it and
 * says what is in it: `showing` names the thing on show and is `undefined`
 * when the modal is closed, so it cannot be open with nothing in it.
 */
const {
	showing,
	id,
	title,
	onclose,
	children,
}: {
	/** What the modal is showing; `undefined` closes it. */
	showing: string | undefined;
	/** The modal's element id, which the trigger's `aria-controls` points at. */
	id: string;
	/** The dialog's name, as a platform dialog names itself. */
	title: string;
	onclose: () => void;
	children: Snippet;
} = $props();

/**
 * What Tab may reach inside the panel. The panel always holds its close
 * button, so this never comes back empty.
 */
const FOCUSABLE =
	'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/* Built here rather than interpolated in the markup: the template compiler
   guards every interpolation with a `?? ""` that these two, both required
   strings, can never take. */
const titleId = $derived(`${id}-title`);
const closeLabel = $derived(`Close ${title}`);

/**
 * The panel, once it is drawn. Everything that reads it runs while the modal
 * is open and after the markup exists, so the casts below are the type system
 * catching up with `showing`, not cases to handle.
 */
let panel = $state<HTMLElement>();
let returnTo: HTMLElement | null = null;

$effect(() => {
	if (showing === undefined) {
		const back = returnTo;
		returnTo = null;
		back?.focus();
		return;
	}
	returnTo = document.activeElement as HTMLElement | null;
	// The panel, not its close button: a reader lands on the title rather than
	// on "close", and the first Tab from there is the close button anyway.
	(panel as HTMLElement).focus();
});

/**
 * Escape closes; Tab cycles inside the panel. A modal that let Tab walk out
 * of itself would leave a keyboard reader typing into a page they cannot see,
 * so the two ends of the ring are joined here. Focus starts on the panel,
 * which is outside the ring, so a Shift+Tab from there wraps as well.
 */
const onkeydown = (e: KeyboardEvent) => {
	if (e.key === "Escape") {
		onclose();
		return;
	}
	if (e.key !== "Tab") return;
	const inside = panel as HTMLElement;
	const ring = [...inside.querySelectorAll<HTMLElement>(FOCUSABLE)];
	const first = ring[0];
	const last = ring[ring.length - 1];
	const active = document.activeElement;
	if (e.shiftKey && (active === first || active === inside)) {
		e.preventDefault();
		last.focus();
	} else if (!e.shiftKey && active === last) {
		e.preventDefault();
		first.focus();
	}
};
</script>

{#if showing !== undefined}
	<div class="modal-layer">
		<!-- The scrim is decoration over an inert page, not a control: Escape and
		     the close button are the keyboard ways out, and a screen reader is
		     inside the dialog, which is why this carries no role of its own. -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="scrim" onclick={onclose}></div>
		<div
			class="modal"
			{id}
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			tabindex="-1"
			bind:this={panel}
			{onkeydown}
		>
			<header>
				<h2 id={titleId}>{title}</h2>
				<button type="button" class="close" aria-label={closeLabel} onclick={onclose}>
					<i class="codicon codicon-close" aria-hidden="true"></i>
				</button>
			</header>
			<div class="body">{@render children()}</div>
		</div>
	</div>
{/if}

<style>
	/* Over everything the page can draw, the fullscreen diagram overlay (1000)
	   included: this is the one surface that takes the page away from the
	   reader, so nothing may sit on top of it. The layer's padding is the
	   inset the panel keeps from the window's edges, and the panel's
	   `max-height: 100%` reads it, so the two cannot disagree. */
	.modal-layer {
		position: fixed;
		inset: 0;
		z-index: 1100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 32px 24px;
		font-size: var(--vscode-font-size);
	}
	/* The workbench dimmed behind the dialog, as the platform dims it. There
	   is no theme token for the block VS Code draws over the workbench; it is
	   the same wash in every theme, so it is a constant here too. */
	.scrim {
		position: absolute;
		inset: 0;
		background: rgb(0 0 0 / 0.44);
	}
	/* 960px is what the content asks for: a `DataTable` narrows its cells
	   below 900px of its own frame, breaking a consumable's icon off its
	   name, and 960 less the border and the body's gutter leaves the
	   crossings table 926px — above that tier, and still 95px of page either
	   side of the panel in an editor tab, so the modal reads as being over
	   the page rather than replacing it. 760px tall is the cap on a large
	   monitor; in a short window the 32px inset is what decides it, and a
	   typical relationship fits in an editor tab at 1150x700 without the body
	   scrolling. */
	.modal {
		position: relative;
		display: flex;
		flex-direction: column;
		width: min(960px, 100%);
		max-height: min(760px, 100%);
		background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
		color: var(--vscode-foreground);
		border: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.35));
		border-radius: 6px;
		box-shadow: 0 8px 24px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.36));
	}
	.modal:focus {
		outline: none;
	}
	/* A hairline the platform's dialog does not have, because the platform's
	   dialog holds a sentence and this one holds a table: the body scrolls
	   under the header and a scrolled table needs an edge to scroll under. */
	header {
		flex: none;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 8px 8px 16px;
		border-bottom: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
	}
	/* Sentence case at the body size, as every other header in v2. */
	h2 {
		flex: 1;
		margin: 0;
		font-size: 1em;
		font-weight: 600;
		line-height: 22px;
		color: var(--vscode-foreground);
	}
	.close {
		flex: none;
		display: flex;
		padding: 4px;
		background: transparent;
		border: 0;
		border-radius: 4px;
		color: var(--vscode-icon-foreground);
		cursor: pointer;
	}
	.close:hover {
		background: var(--vscode-toolbar-hoverBackground);
	}
	.close:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: 1px;
	}
	.body {
		flex: 1;
		min-height: 0;
		overflow: auto;
		/* One scroller, not two: a long crossings table lengthens this column
		   and scrolls with everything else, rather than getting a scrollbar of
		   its own inside a scrolling panel. The long read is the
		   relationship's own page, which stays one click away. */
		padding: 12px 16px 16px;
	}
	/* High contrast draws its edges with the contrast border, as the workbench does. */
	:global(.vscode-high-contrast) .modal,
	:global(.vscode-high-contrast) .modal header {
		border-color: var(--vscode-contrastBorder, var(--vscode-widget-border));
	}
</style>
