<script lang="ts">
/**
 * A word that classifies the thing beside it: `event`, `internal`, `core`,
 * `OHS`. It replaces v1's chip. A keyword is text in the secondary colour with
 * no box around it, the way a tree row's description or the Problems panel's
 * rule id sits beside its label; the reader's eye stays on the name and the
 * keyword is there when needed. `mono` is for codes that come from a table
 * (pattern abbreviations, schema types), set in the editor font so they read
 * as tokens. A tone is allowed only when the word carries a diagnostic meaning
 * a VS Code surface would colour the same way.
 */
const {
	text,
	title,
	mono = false,
	tone = "",
}: {
	text: string;
	title?: string;
	mono?: boolean;
	tone?: "" | "warn" | "error";
} = $props();
</script>

<span class="keyword" class:mono class:warn={tone === "warn"} class:error={tone === "error"} {title}>{text}</span>

<style>
	.keyword {
		color: var(--vscode-descriptionForeground);
		white-space: nowrap;
	}
	.mono {
		font-family: var(--vscode-editor-font-family);
		font-size: 0.92em;
	}
	.warn {
		color: var(--vscode-editorWarning-foreground);
	}
	.error {
		color: var(--vscode-editorError-foreground);
	}
	/* A keyword with a meaning to reveal gives only the help cursor: the
	   editor marks nothing hoverable either, and a dotted underline under
	   every pattern code made a dense table busy. */
	.keyword[title] {
		cursor: help;
	}
</style>
