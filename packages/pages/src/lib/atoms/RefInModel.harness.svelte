<script lang="ts">
import ModelProvider from "../ModelProvider.svelte";
import type { Model } from "../model";
import Ref from "./Ref.svelte";

/** Two links inside one model's context: a ref written for the workspace on screen, and an element that may belong to another file. */
const {
	model,
	local,
	foreign,
}: { model: Model; local: string; foreign: { ref: string } } = $props();
</script>

<ModelProvider {model}>
	<Ref ref={local} label="Local" />
	<Ref ref={foreign} label="Foreign" />
</ModelProvider>
