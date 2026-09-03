<script lang="ts">
import type { Snippet } from "svelte";

const {
	children,
	title,
}: {
	children: Snippet;
	/** Why the text is dimmed, when that is not obvious — "generated", say. */
	title?: string;
} = $props();
</script>

<span class="dim" {title}>{@render children()}</span>
