<script lang="ts">
import ModelProvider from "./ModelProvider.svelte";
import type { Model } from "./model";
import Page from "./Page.svelte";

let { model, ref }: { model: Model; ref: string } = $props();
</script>

<ModelProvider {model}><Page {ref} /></ModelProvider>
