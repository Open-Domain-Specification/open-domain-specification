<script lang="ts">
import { type SvelteFlowStore, useStore } from "@xyflow/svelte";
import { untrack } from "svelte";

/** Hands the test Svelte Flow's store, so it can say what size the canvas measured. */
let { onstore }: { onstore: (store: SvelteFlowStore) => void } = $props();
const store = useStore();
untrack(() => onstore(store));
</script>
