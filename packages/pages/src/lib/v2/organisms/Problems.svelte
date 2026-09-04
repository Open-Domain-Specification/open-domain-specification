<script lang="ts">
import type { Diagnostic } from "@open-domain-specification/core";
import Keyword from "../Keyword.svelte";
import Ref from "../Ref.svelte";

/**
 * The diagnostics for one section, drawn the way the Problems panel draws
 * them: the severity codicon in the error or warning colour, the rule id as a
 * code token, the message, and a link to the element it is about. v1 boxed
 * the list behind a left rule and a tinted frame; a diagnostic is not a card,
 * it is a row, and the colour of its glyph is the only signal it needs.
 */
const { problems }: { problems: Diagnostic[] } = $props();
</script>

{#if problems.length}
	<ul class="problems">
		{#each problems as d, i (`${i}:${d.rule}:${d.ref}`)}
			<li>
				<i class={`codicon codicon-${d.severity} ${d.severity}`} aria-hidden="true"></i>
				<span class="message">
					<Keyword text={d.rule} mono />
					<span class="text">{d.message}</span>
					<Ref ref={d.ref} label="go to" />
				</span>
			</li>
		{/each}
	</ul>
{/if}

<style>
	/* Resets: the v1 page stylesheet draws `.problems` as a framed, left-ruled
	   block and stays loaded while the templates move over one by one. */
	.problems {
		list-style: none;
		margin: 4px 0 8px;
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
		line-height: 22px;
	}
	.codicon {
		font-size: 1em;
		align-self: baseline;
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
