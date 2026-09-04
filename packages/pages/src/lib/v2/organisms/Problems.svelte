<script lang="ts">
import type { Diagnostic } from "@open-domain-specification/core";
import Keyword from "../Keyword.svelte";
import Ref from "../Ref.svelte";

/**
 * The diagnostics about one section, drawn the way the Problems panel draws
 * them: the severity codicon in the error or warning colour, the rule id as a
 * code keyword, the message, and a link to the element. v1 wrapped the list in
 * a framed box with a coloured left rule; the panel does neither, so v2 draws
 * plain 22px rows and lets the icon carry the severity.
 */
const { problems }: { problems: Diagnostic[] } = $props();
</script>

{#if problems.length}
	<ul class="problems">
		{#each problems as d (`${d.rule}:${d.ref}:${d.message}`)}
			<li>
				<i class={`codicon codicon-${d.severity} ${d.severity}`} aria-hidden="true"></i>
				<span class="message"><Keyword text={d.rule} mono /> <span>{d.message}</span> <Ref ref={d.ref} label="go to" /></span>
			</li>
		{/each}
	</ul>
{/if}

<style>
	/* The v1 page stylesheet styles `.problems` as a framed, left-ruled box. */
	.problems {
		list-style: none;
		margin: 0 0 8px;
		padding: 0;
		border: 0;
		background: none;
	}
	li {
		display: grid;
		grid-template-columns: 16px minmax(0, 1fr);
		column-gap: 8px;
		margin: 0;
		padding: 0;
		border: 0;
		background: none;
		line-height: 22px;
	}
	.codicon {
		font-size: 1em;
		line-height: 22px;
		text-align: center;
	}
	.error {
		color: var(--vscode-editorError-foreground);
	}
	.warning {
		color: var(--vscode-editorWarning-foreground);
	}
	.message {
		max-width: 80ch;
	}
</style>
