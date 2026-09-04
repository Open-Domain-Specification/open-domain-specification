<script lang="ts">
import type { Snippet } from "svelte";
import Markdown from "../../atoms/Markdown.svelte";
import Heading from "../Heading.svelte";
import Crumbs from "../molecules/Crumbs.svelte";

/**
 * The top of every page: the trail back, the title, what the thing is, and
 * the facts about it. The v1 uppercase kind eyebrow is gone — the kind is the
 * `detail` of the title lockup the caller passes — and the facts strip is a
 * `DefinitionList`. Nothing sits inside the h1 but the lockup, so the words
 * v1 put beside the title (a classification, a big ball of mud, a version)
 * come after it as `meta`, or as a definition when they have a term.
 *
 * The title is the caller's snippet because only the template knows the kind,
 * the id and the detail of the thing it renders — and the one page that is a
 * read rather than an element, the health report, has no lockup at all.
 */
const {
	crumbs = [],
	title,
	description,
	meta,
	facts,
}: {
	crumbs?: [string, string][];
	title: Snippet;
	description?: string;
	meta?: Snippet;
	facts?: Snippet;
} = $props();
</script>

<header class="page-header">
	{#if crumbs.length}<Crumbs {crumbs} />{/if}
	<Heading level={1}>{@render title()}</Heading>
	{#if meta}<p class="meta">{@render meta()}</p>{/if}
	<Markdown text={description} />
	{#if facts}{@render facts()}{/if}
</header>

<style>
	.page-header {
		margin-bottom: 8px;
	}
	/* The keywords v1 packed into the h1 sit on their own line under it. */
	.meta {
		margin: 0;
		line-height: 22px;
	}
	.page-header :global(.md) {
		max-width: 80ch;
	}
	.page-header :global(.md p) {
		margin: 4px 0 8px;
		line-height: 1.5;
	}
</style>
