<script lang="ts">
import { SvelteFlow } from "@xyflow/svelte";
import "@xyflow/svelte/dist/style.css";
import type { Disclosure } from "../flow/disclosure.svelte";
import ModelProvider from "../ModelProvider.svelte";
import type { Model } from "../model";
import DisclosureCard from "./DisclosureCard.svelte";

/**
 * The disclosure card in the two contexts it needs: a flow, because it draws
 * into the viewport portal, and a model, because the relationship detail
 * derives the crossing consumables from the workspace.
 */
const { disclosure, model }: { disclosure: Disclosure; model: Model } =
	$props();
let nodes = $state.raw([]);
let edges = $state.raw([]);
</script>

<ModelProvider {model}>
	<div style="height: 300px">
		<SvelteFlow bind:nodes bind:edges>
			<DisclosureCard {disclosure} />
		</SvelteFlow>
	</div>
</ModelProvider>
