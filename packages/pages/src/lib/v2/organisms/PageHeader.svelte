<script lang="ts">
import type { Snippet } from "svelte";
import Markdown from "../../atoms/Markdown.svelte";
import DefinitionList from "../DefinitionList.svelte";
import Heading from "../Heading.svelte";
import type { Kind } from "../kinds";
import Lockup from "../Lockup.svelte";
import Ref from "../Ref.svelte";

/**
 * The top of every page: where you are, what this is, what it says about
 * itself, and the handful of facts that place it.
 *
 * v1 put the kind in an uppercase eyebrow above the title and the identifier
 * in a bordered pill inside the h1. Both are now the title lockup's trailing
 * text in the secondary colour, so nothing sits in the heading but the thing
 * the page is about. The facts strip becomes a definition list, which is what
 * the Extensions editor uses for exactly this.
 */
const {
	kind,
	kindLabel,
	name,
	id,
	description,
	crumbs = [],
	meta,
	facts,
}: {
	kind: Kind;
	/** The kind as a word, after the id; defaults to the kind itself. */
	kindLabel?: string;
	name: string;
	id: string;
	description?: string;
	crumbs?: [string, string][];
	/** Keywords that classify the page, on their own line under the title. */
	meta?: Snippet;
	facts?: Snippet;
} = $props();
</script>

<header class="page-head">
	{#if crumbs.length}
		<nav class="crumbs">
			{#each crumbs as [ref, label], i (ref)}{#if i}<span class="sep">›</span>{/if}<Ref {ref} {label} />{/each}
		</nav>
	{/if}
	<Heading level={1}><Lockup {kind} {name} {id} detail={kindLabel ?? kind} size="title" /></Heading>
	{#if meta}<p class="meta">{@render meta()}</p>{/if}
	<div class="description"><Markdown text={description} /></div>
	{#if facts}<DefinitionList>{@render facts()}</DefinitionList>{/if}
</header>

<style>
	.page-head {
		margin-bottom: 16px;
	}
	/* Reset: the v1 page stylesheet draws a bare `.crumbs` at 0.92em in the
	   secondary colour, and it stays loaded while the templates move over. */
	.crumbs {
		margin: 0;
		font-size: inherit;
		line-height: 22px;
		color: var(--vscode-foreground);
	}
	.sep {
		margin: 0 6px;
		color: var(--vscode-descriptionForeground);
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 8px;
		margin: 0;
		line-height: 22px;
	}
	/* Prose is capped at 80 characters wherever it appears. */
	.description :global(.md) {
		max-width: 80ch;
	}
	.description :global(.md p) {
		margin: 4px 0 8px;
	}
</style>
