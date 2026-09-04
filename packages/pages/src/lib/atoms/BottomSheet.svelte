<script lang="ts">
import type { Snippet } from "svelte";

/**
 * The docked panel a page opens for disclosure too big for a hover. Principle
 * 8 of the design language puts a pattern's meaning and an intent's evidence
 * summary in the editor's hover widget; a whole relationship — a description,
 * a definition list, a comment list and a table of crossings — cannot live in
 * a hover, and inside a table row it drew a table within a table. It goes
 * here instead, in the frame of VS Code's own bottom panel: a header row with
 * the view's name and a close button, one hairline under it, one border on
 * top, an opaque panel background, no rounded corners, no scrim and no shadow.
 *
 * It is pinned to the bottom of the viewport rather than docked at the end of
 * the page column, because the row that opened it has to stay on screen; it
 * starts at the page column's left edge (`--ods-panel-inset`, which the site
 * shell sets to the width of its tree) exactly as the platform's panel starts
 * at the editor's, never under the side bar. Its height is a third to a half
 * of the window and the body scrolls; it is deliberately not resizable, since
 * a drag edge would need a keyboard equivalent and a remembered size to earn
 * itself, and the long read is the thing's own page.
 *
 * The page reserves the height while the sheet is open, so a fixed panel
 * never hides the last rows of what it was opened from. The reservation is a
 * class on `<body>` and the height is declared once, in CSS, here.
 *
 * Semantics are a disclosure, not a dialog: nothing is blocked, so the page
 * stays live, the trigger keeps `aria-expanded`/`aria-controls` and focus
 * stays on it. Escape closes from anywhere, and focus returns to whatever was
 * focused when the sheet opened — the trigger, unless the reader has tabbed
 * into the sheet, in which case it is the trigger again rather than nowhere.
 * One prop opens it and says what is in it: `showing` names the thing on show
 * and is `undefined` when the sheet is closed, so it cannot be open with
 * nothing in it, and a second trigger pressed while the sheet is up re-aims
 * that focus return at the second one.
 */
const {
	showing,
	id,
	title,
	onclose,
	children,
}: {
	/** What the sheet is showing; `undefined` closes it. */
	showing: string | undefined;
	/** The sheet's element id, which the trigger's `aria-controls` points at. */
	id: string;
	/** The view's name, as a panel names itself; the content names which one. */
	title: string;
	onclose: () => void;
	children: Snippet;
} = $props();

/** The class that makes the page leave room for the sheet. */
const RESERVED = "ods-sheet-open";

/* Built here rather than interpolated in the markup: the template compiler
   guards every interpolation with a `?? ""` that these two, both required
   strings, can never take. */
const titleId = $derived(`${id}-title`);
const closeLabel = $derived(`Close ${title}`);

let returnTo: HTMLElement | null = null;

$effect(() => {
	if (showing === undefined) {
		const back = returnTo;
		returnTo = null;
		back?.focus();
		return;
	}
	returnTo = document.activeElement as HTMLElement | null;
});

$effect(() => {
	if (showing === undefined) return;
	const onkeydown = (e: KeyboardEvent) => {
		if (e.key === "Escape") onclose();
	};
	window.addEventListener("keydown", onkeydown);
	document.body.classList.add(RESERVED);
	return () => {
		window.removeEventListener("keydown", onkeydown);
		document.body.classList.remove(RESERVED);
	};
});
</script>

{#if showing !== undefined}
	<!-- A labelled `section` is already a landmark region; no role is added. -->
	<section class="bottom-sheet" {id} aria-labelledby={titleId}>
		<header>
			<div class="column">
				<h2 id={titleId}>{title}</h2>
				<button type="button" class="close" aria-label={closeLabel} onclick={onclose}>
					<i class="codicon codicon-close" aria-hidden="true"></i>
				</button>
			</div>
		</header>
		<div class="body"><div class="column">{@render children()}</div></div>
	</section>
{/if}

<style>
	/* The height lives here and nowhere else, so the room the page leaves for
	   the sheet and the sheet itself can never disagree. A third of a tall
	   window, with a floor that still shows the title and a few lines, and a
	   cap so a large monitor does not give half its height to one disclosure. */
	:global(:root) {
		--ods-sheet-height: clamp(220px, 40vh, 560px);
	}
	:global(body.ods-sheet-open) {
		padding-bottom: var(--ods-sheet-height);
	}
	/* Above the page's sticky toolbar (z-index 2), below the hover card (20),
	   which is the one thing that may be read over the sheet. */
	.bottom-sheet {
		position: fixed;
		bottom: 0;
		left: var(--ods-panel-inset, 0px);
		right: 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		height: var(--ods-sheet-height);
		background: var(--vscode-panel-background, var(--vscode-editor-background));
		color: var(--vscode-foreground);
		border-top: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
		font-size: var(--vscode-font-size);
	}
	header {
		flex: none;
		border-bottom: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
	}
	/* Header and body share the page's own column — the same 1200px cap and
	   24px gutter `templates/PageLayout` uses — so the sheet reads as the foot
	   of the page it was opened from rather than a bar across the window. */
	.column {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 24px;
	}
	header .column {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-top: 4px;
		padding-bottom: 4px;
	}
	/* Sentence case at the body size, as every other header in v2: the
	   platform's panel tabs are uppercase, and the language is not. */
	h2 {
		flex: 1;
		margin: 0;
		font-size: 1em;
		font-weight: 600;
		line-height: 22px;
		color: var(--vscode-foreground);
		text-transform: none;
		letter-spacing: normal;
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
	}
	.body .column {
		padding-top: 8px;
		padding-bottom: 16px;
	}
	/* High contrast draws its edges with the contrast border, as the workbench does. */
	:global(.vscode-high-contrast) .bottom-sheet,
	:global(.vscode-high-contrast) .bottom-sheet header {
		border-color: var(--vscode-contrastBorder, var(--vscode-panel-border));
	}
</style>
