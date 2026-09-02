<script lang="ts">
import type { Snippet } from "svelte";
import Icon from "../atoms/Icon.svelte";
import IdChip from "../atoms/IdChip.svelte";
import Markdown from "../atoms/Markdown.svelte";
import RefLink from "../atoms/RefLink.svelte";

const {
	kind,
	icon,
	name,
	id,
	description,
	crumbs = [],
	meta,
	facts,
}: {
	kind: string;
	icon: string;
	name: string;
	id: string;
	description?: string;
	crumbs?: [string, string][];
	meta?: Snippet;
	facts?: Snippet;
} = $props();
</script>

<header class="page-head">
	<nav class="crumbs">
		{#each crumbs as [ref, label]}<RefLink {ref} {label} /><span class="sep">›</span>{/each}
		<span class="kind">{kind}</span>
	</nav>
	<h1><Icon name={icon} /> {name} <IdChip {id} /> {#if meta}{@render meta()}{/if}</h1>
	<Markdown text={description} />
	{#if facts}<dl class="facts">{@render facts()}</dl>{/if}
</header>
