<script lang="ts">
import type { Snippet } from "svelte";

let { wide = false, children }: { wide?: boolean; children: Snippet } =
	$props();
</script>

<div class="grid" class:wide>{@render children()}</div>
