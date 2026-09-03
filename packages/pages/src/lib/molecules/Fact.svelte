<script lang="ts">
import type { Snippet } from "svelte";

/** One row of the page header's fact list. */
let { label, children }: { label: string; children: Snippet } = $props();
</script>

<div><dt>{label}</dt><dd>{@render children()}</dd></div>
