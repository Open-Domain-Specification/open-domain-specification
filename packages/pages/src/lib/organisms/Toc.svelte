<script lang="ts">
import { focusArrival } from "../focus";
import { scrollBehavior } from "../motion.svelte";

/**
 * The page's own sections, as the Outline lists a file's symbols: a title in
 * plain secondary text (v1 tracked it in capitals), 22px rows against a
 * hairline left rule, and the link colour with a 2px marker on the row the
 * pointer is on. Clicking scrolls rather than navigates, so the reader keeps
 * their place in the page and history is untouched; it also moves focus to
 * the section's heading, so the next Tab is the next control in that section
 * and a screen reader starts reading at it. The scroll is smooth unless the
 * reader has asked for less motion.
 */
const { sections }: { sections: { id: string; label: string }[] } = $props();

const jump = (id: string) => (e: Event) => {
	e.preventDefault();
	const section = document.getElementById(id);
	if (!section) return;
	section.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
	focusArrival(section.querySelector<HTMLElement>(".heading") ?? section, {
		preventScroll: true,
	});
};
</script>

<nav class="toc" aria-label="On this page">
	<p class="toc-title" aria-hidden="true">On this page</p>
	<ul>
		{#each sections as s (s.id)}
			<li><a href={`#${s.id}`} onclick={jump(s.id)}>{s.label}</a></li>
		{/each}
	</ul>
</nav>

<style>
	.toc {
		position: sticky;
		top: 48px;
		align-self: start;
	}
	.toc-title {
		margin: 0 0 2px 10px;
		line-height: 22px;
		color: var(--vscode-descriptionForeground);
		text-transform: none;
		letter-spacing: normal;
		font-size: 1em;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		border-left: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
	}
	a {
		display: block;
		padding: 0 10px;
		line-height: 22px;
		margin-left: -1px;
		border-left: 2px solid transparent;
		color: var(--vscode-descriptionForeground);
		text-decoration: none;
	}
	a:hover {
		color: var(--vscode-textLink-foreground);
		border-left-color: var(--vscode-textLink-foreground);
		text-decoration: none;
	}
	a:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: -1px;
	}
</style>
