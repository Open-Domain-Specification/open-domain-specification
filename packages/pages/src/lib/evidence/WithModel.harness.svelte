<script lang="ts">
import type { Component } from "svelte";
import ModelProvider from "../ModelProvider.svelte";
import type { Model } from "../model";

/**
 * Renders one evidence component inside a model context, for the unit tests:
 * every surface here calls `useModel()` for the workspace it derives from.
 */
const {
	model,
	component: Surface,
	args,
}: {
	model: Model;
	// biome-ignore lint/suspicious/noExplicitAny: any component under test
	component: Component<any>;
	// biome-ignore lint/suspicious/noExplicitAny: its props, whatever they are
	args: Record<string, any>;
} = $props();
</script>

<ModelProvider {model}><Surface {...args} /></ModelProvider>
