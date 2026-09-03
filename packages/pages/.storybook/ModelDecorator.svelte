<script lang="ts">
import type { Snippet } from "svelte";
import { petstoreModel } from "../src/lib/fixtures";
import ModelProvider from "../src/lib/ModelProvider.svelte";

// Global decorator fallback: provides a model to any story that does not
// wrap itself in its own <ModelProvider> (autodocs, HMR previews, and
// Storybook's direct render of the meta `component`). A story that wraps
// itself in <ModelProvider {model}> still wins for its own descendants,
// since that provider is nested inside this one.
const { children }: { children: Snippet } = $props();
const model = petstoreModel();
</script>

<ModelProvider {model}>
	{@render children()}
</ModelProvider>
