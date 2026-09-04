<script lang="ts">
/**
 * The list of sections down the right of a page. The uppercase, tracked
 * title of v1 becomes plain secondary text; everything else is already the
 * shape of the breadcrumb's outline list, so it keeps its hairline left rule
 * and its 2px active marker in the link colour, at 22px rows.
 */
const { sections }: { sections: { id: string; label: string }[] } = $props();
const anchor = (id: string) => `#${id}`;
const jump = (id: string) => (e: Event) => {
	e.preventDefault();
	document
		.getElementById(id)
		?.scrollIntoView({ behavior: "smooth", block: "start" });
};
</script>

<aside class="toc-v2" aria-label="On this page">
	<p class="title">On this page</p>
	<ul>{#each sections as s (s.id)}<li><a href={anchor(s.id)} onclick={jump(s.id)}>{s.label}</a></li>{/each}</ul>
</aside>

<style>
	.toc-v2 {
		position: sticky;
		top: 40px;
		align-self: start;
	}
	/* The v1 stylesheet draws `.toc-title` as tracked capitals at 0.8em. */
	.title {
		margin: 0 0 4px;
		padding: 0 10px;
		color: var(--vscode-descriptionForeground);
		font-size: 1em;
		text-transform: none;
		letter-spacing: normal;
		line-height: 22px;
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
		color: var(--vscode-descriptionForeground);
		text-decoration: none;
		border-left: 2px solid transparent;
		margin-left: -1px;
	}
	a:hover {
		color: var(--vscode-foreground);
		background: var(--vscode-list-hoverBackground);
		border-left-color: var(--vscode-textLink-foreground);
	}
	a:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: -1px;
	}
</style>
