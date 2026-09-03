<script lang="ts">
import ModelProvider from "../ModelProvider.svelte";
import type { Model } from "../model";
import Sidebar from "./Sidebar.svelte";

let { model, current }: { model: Model; current: string } = $props();
</script>

<ModelProvider {model}><Sidebar {current} /></ModelProvider>
