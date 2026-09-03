<script lang="ts">
import ModelProvider from "../ModelProvider.svelte";
import type { Model } from "../model";
import WorkspacePage from "./WorkspacePage.svelte";

const { model }: { model: Model } = $props();
</script>

<ModelProvider {model}><WorkspacePage /></ModelProvider>
