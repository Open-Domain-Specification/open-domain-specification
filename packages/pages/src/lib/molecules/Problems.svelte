<script lang="ts">
import type { Diagnostic } from "@open-domain-specification/core";
import Keyword from "../atoms/Keyword.svelte";
import Ref from "../atoms/Ref.svelte";

/**
 * The diagnostics about one section, drawn the way the Problems panel draws
 * them: the severity codicon in the error or warning colour, the rule id as a
 * `mono` keyword, the message, and a link to the element concerned. v1 boxed
 * the list behind a left rule; here the 22px rows and the severity colour are
 * the whole treatment, because that is all the panel itself uses.
 */
const { problems }: { problems: Diagnostic[] } = $props();
</script>

{#if problems.length}
	<ul class="problems">
		{#each problems as d (`${d.rule}:${d.ref}:${d.message}`)}
			<li>
				<i class={`codicon codicon-${d.severity} ${d.severity}`} aria-hidden="true"></i>
				<span><Keyword text={d.rule} mono /> <span class="message">{d.message}</span> <Ref ref={d.ref} label="go to" /></span>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.problems {
		list-style: none;
		margin: 0 0 8px;
		padding: 0;
	}
	li {
		display: grid;
		grid-template-columns: 16px minmax(0, 1fr);
		column-gap: 8px;
		line-height: 22px;
	}
	.codicon {
		font-size: 1em;
		line-height: inherit;
		text-align: center;
	}
	.error {
		color: var(--vscode-editorError-foreground);
	}
	.warning {
		color: var(--vscode-editorWarning-foreground);
	}
</style>
