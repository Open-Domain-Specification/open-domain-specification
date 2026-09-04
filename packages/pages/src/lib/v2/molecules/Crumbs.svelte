<script lang="ts">
import Ref from "../Ref.svelte";

/**
 * The trail back to the workspace, one line, with `›` between the links in
 * the secondary colour — the breadcrumbs bar's own separator. v1 ended the
 * trail with the element's kind in tracked capitals; v2 does not, because the
 * title's lockup says the kind.
 */
const { crumbs }: { crumbs: [string, string][] } = $props();
</script>

<nav class="crumbs">
	{#each crumbs as [ref, label], i (ref)}{#if i}<span class="sep">›</span>{/if}<Ref {ref} {label} />{/each}
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
