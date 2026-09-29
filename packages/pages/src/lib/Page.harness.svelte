<script lang="ts">
import ModelProvider from "./ModelProvider.svelte";
import type { Model } from "./model";
import Page from "./Page.svelte";

let {
	model,
	ref,
	arrivals = 0,
}: { model: Model; ref: string; arrivals?: number } = $props();
</script>

<ModelProvider {model}><Page {ref} {arrivals} /></ModelProvider>
