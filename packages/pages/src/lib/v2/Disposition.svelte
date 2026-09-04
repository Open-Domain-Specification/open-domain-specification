<script lang="ts">
import type { Disposition } from "@open-domain-specification/core";
import { DISPOSITION_LABELS, DISPOSITION_SUMMARIES } from "../evidence/labels";

/**
 * What the architecture thinks of one intent, drawn the way the Problems
 * panel draws a diagnostic: a severity codicon and a word. By design is the
 * default and says nothing a reader needs, so it draws nothing. Refactor is a
 * warning, in the warning colour with the warning icon. Tolerated is
 * information, the info icon in the secondary colour: it is a fact about the
 * model, not a problem with it. This is the only place a non-link colour
 * appears in a row, and it appears for the same reason it would in the
 * Problems panel.
 */
const { disposition }: { disposition?: Disposition } = $props();
</script>

{#if disposition && disposition !== "by-design"}
	<span class={`disposition ${disposition}`} title={DISPOSITION_SUMMARIES[disposition]}>
		<i class={disposition === "refactor" ? "codicon codicon-warning" : "codicon codicon-info"} aria-hidden="true"></i>
		{DISPOSITION_LABELS[disposition]}
	</span>
{/if}

<style>
	/* Inline, not flex: a flex box in a table cell breaks the 22px row. */
	.disposition {
		white-space: nowrap;
		cursor: help;
	}
	.disposition .codicon {
		vertical-align: -2px;
		margin-right: 4px;
	}
	.tolerated {
		color: var(--vscode-descriptionForeground);
	}
	.refactor {
		color: var(--vscode-editorWarning-foreground);
	}
	.codicon {
		font-size: 1em;
	}
</style>
