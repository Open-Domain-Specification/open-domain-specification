<script lang="ts">
import type { Snippet } from "svelte";
import { type Model, provideModel } from "./model";

const { model, children }: { model: Model; children: Snippet } = $props();
// The provider is keyed on the model by its host, so the initial value is the value.
// svelte-ignore state_referenced_locally
provideModel(model);
</script>

{@render children()}
