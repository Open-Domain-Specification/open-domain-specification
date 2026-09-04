<script lang="ts">
import type { Snippet } from "svelte";
import Markdown from "../../atoms/Markdown.svelte";
import Heading from "../Heading.svelte";
import type { Kind } from "../kinds";
import Lockup from "../Lockup.svelte";
import Ref from "../Ref.svelte";

/**
 * The top of every page: crumbs, the title lockup, the description, the
 * facts. The uppercase kind eyebrow of v1 becomes the `detail` of the title
 * lockup, after the id, so the h1 holds nothing but the lockup; the id loses
 * its bordered pill; and the wrapped facts strip becomes a `DefinitionList`.
 * What v1 put in its `meta` slot beside the title is a line of `Keyword`s
 * under it, or a `Definition` when the fact has a term.
 */
const {
	kind,
	kindLabel,
	name,
	id,
	description,
	crumbs = [],
	keywords,
	facts,
}: {
	kind: Kind;
	kindLabel: string;
	name: string;
	id: string;
	description?: string;
	crumbs?: [string, string][];
	keywords?: Snippet;
	facts?: Snippet;
} = $props();
</script>

<header class="page-header">
	{#if crumbs.length}
		<nav class="crumbs" aria-label="Breadcrumb">
			{#each crumbs as [ref, label], i (ref + i)}{#if i}<span class="sep" aria-hidden="true">›</span>{/if}<Ref {ref} {label} />{/each}
		</nav>
	{/if}
	<Heading level={1}><Lockup {kind} {name} {id} detail={kindLabel} size="title" /></Heading>
	{#if keywords}<p class="keywords">{@render keywords()}</p>{/if}
	{#if description}<div class="description"><Markdown text={description} /></div>{/if}
	{#if facts}{@render facts()}{/if}
</header>

<style>
	.page-header {
		margin-bottom: 8px;
	}
	/* The v1 stylesheet draws `.crumbs .kind` as tracked capitals; v2 has no eyebrow. */
	.crumbs {
		line-height: 22px;
		margin-bottom: 4px;
	}
	.sep {
		color: var(--vscode-descriptionForeground);
		margin: 0 6px;
	}
	.keywords {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 0;
		line-height: 22px;
	}
	.description {
		margin: 4px 0 8px;
	}
	.description :global(.md) {
		max-width: 80ch;
	}
	.description :global(.md > :first-child) {
		margin-top: 0;
	}
	.description :global(.md > :last-child) {
		margin-bottom: 0;
	}
</style>
