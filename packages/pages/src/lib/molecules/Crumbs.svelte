<script module lang="ts">
/** A link in the trail: a route or a ref of the page's own workspace, or the element itself when it may be in another file. */
export type Crumb = [string | { ref: string }, string];
</script>

<script lang="ts">
import Ref from "../atoms/Ref.svelte";

/**
 * The trail back to the workspace, one line, with `›` between the links in
 * the secondary colour — the breadcrumbs bar's own separator. v1 ended the
 * trail with the element's kind in tracked capitals; v2 does not, because the
 * title's lockup says the kind. The trail holds the ancestors and never the
 * page being read, so no crumb is `aria-current`. It is named, because a page
 * has more than one navigation landmark and they are told apart by name.
 */
const { crumbs }: { crumbs: Crumb[] } = $props();
</script>

<nav class="crumbs" aria-label="Breadcrumb">
	{#each crumbs as [ref, label], i (`${i}:${label}`)}{#if i}<span class="sep">›</span>{/if}<Ref {ref} {label} />{/each}
</nav>

<style>
	.crumbs {
		line-height: 22px;
	}
	.sep {
		color: var(--vscode-descriptionForeground);
		margin: 0 6px;
	}
</style>
