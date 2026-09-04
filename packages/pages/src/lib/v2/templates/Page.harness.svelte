<script lang="ts">
import ModelProvider from "../../ModelProvider.svelte";
import type { Model } from "../../model";
import { resolvePage } from "../../resolve";
import PageLayout from "../PageLayout.svelte";
import Tactical, { tacticalSections } from "./Tactical.harness.svelte";

/**
 * Renders the v2 tactical page that owns `ref`, inside the v2 page layout.
 * The nine tactical templates only; a ref this card does not cover renders
 * nothing, so a story that names one fails loudly in the Storybook e2e run
 * rather than quietly drawing a strategic page.
 */
const { model, ref }: { model: Model; ref: string } = $props();
const target = $derived(resolvePage(model.workspace, ref).target);
</script>

<ModelProvider {model}>
	<PageLayout sections={tacticalSections(target)}><Tactical {target} /></PageLayout>
</ModelProvider>
