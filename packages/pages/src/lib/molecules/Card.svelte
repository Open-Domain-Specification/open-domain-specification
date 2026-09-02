<script lang="ts">
import type { Snippet } from "svelte";
import Markdown from "../atoms/Markdown.svelte";
import RefLink from "../atoms/RefLink.svelte";

const {
	ref,
	name,
	icon,
	description,
	highlight = false,
	meta,
	children,
}: {
	ref: string;
	name: string;
	icon: string;
	description?: string;
	highlight?: boolean;
	meta?: Snippet;
	children?: Snippet;
} = $props();
</script>

<article class="card" class:highlight id={ref}>
	<div class="card-head">
		<RefLink {ref} label={name} {icon} />
		{#if meta}<span class="meta">{@render meta()}</span>{/if}
	</div>
	<Markdown text={description} />
	{#if children}{@render children()}{/if}
</article>
