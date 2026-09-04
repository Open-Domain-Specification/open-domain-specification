<script lang="ts">
import { petstoreModel } from "../../fixtures";
import ModelProvider from "../../ModelProvider.svelte";
import type { Model } from "../../model";
import Sidebar from "./Sidebar.svelte";

/** The site navigation over a model, with one row selected. */
const {
	model = petstoreModel(),
	current = "#/boundedcontexts/catalog_bc/aggregates/pet",
}: { model?: Model; current?: string } = $props();
</script>

<ModelProvider {model}><Sidebar {current} /></ModelProvider>
