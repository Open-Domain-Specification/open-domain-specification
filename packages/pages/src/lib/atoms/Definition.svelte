<script lang="ts">
import type { Snippet } from "svelte";

/** One term and its value inside a `<DefinitionList>`. */
const { term, children }: { term: string; children: Snippet } = $props();
</script>

<dt>{term}</dt>
<dd>{@render children()}</dd>

<style>
	dt {
		color: var(--vscode-descriptionForeground);
	}
	dd {
		margin: 0;
		min-width: 0;
	}
</style>
