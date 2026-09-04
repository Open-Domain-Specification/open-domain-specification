<script lang="ts">
/**
 * The sections of the page, in the shape the Outline's breadcrumb list has:
 * a 1px rule down the left, 22px rows, and a 2px marker in the link colour on
 * the row you are on. The only v1 change is the title, which was small tracked
 * capitals and is now plain secondary text — one of five uppercase label
 * styles the design language drops.
 */
const {
	sections,
	active,
}: { sections: { id: string; label: string }[]; active?: string } = $props();

const jump = (id: string) => (e: Event) => {
	e.preventDefault();
	document
		.getElementById(id)
		?.scrollIntoView({ behavior: "smooth", block: "start" });
};
</script>

<aside class="contents">
	<p class="title">On this page</p>
	<ul>
		{#each sections as s (s.id)}
			<li><a href={`#${s.id}`} class:active={s.id === active} onclick={jump(s.id)}>{s.label}</a></li>
		{/each}
	</ul>
</aside>

<style>
	.contents {
		position: sticky;
		top: 48px;
		align-self: start;
	}
	/* Reset: the v1 page stylesheet draws `.toc-title` as tracked capitals. */
	.title {
		margin: 0 0 4px;
		padding: 0 10px;
		line-height: 22px;
		font-size: inherit;
		text-transform: none;
		letter-spacing: normal;
		color: var(--vscode-descriptionForeground);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		border-left: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
	}
	a {
		display: block;
		margin-left: -1px;
		padding: 0 10px;
		line-height: 22px;
		border-left: 2px solid transparent;
		color: var(--vscode-descriptionForeground);
		text-decoration: none;
	}
	a:hover {
		color: var(--vscode-foreground);
		border-left-color: var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
		text-decoration: none;
	}
	a.active {
		color: var(--vscode-textLink-foreground);
		border-left-color: var(--vscode-textLink-foreground);
	}
	a:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: -1px;
	}
</style>
