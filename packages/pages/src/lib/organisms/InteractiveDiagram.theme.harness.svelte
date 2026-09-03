<script lang="ts">
import type { Graph } from "../flow/graph";
import InteractiveDiagram from "./InteractiveDiagram.svelte";

/**
 * Stands in for a VS Code webview: the host marks the active theme with a
 * class on `document.body`, which is what the diagram reads to pick its
 * colour mode. The class is removed again when the story unmounts so it does
 * not leak into the next one.
 */
let { graph, themeClass }: { graph: Graph; themeClass: string } = $props();
$effect(() => {
	document.body.classList.add(themeClass);
	return () => document.body.classList.remove(themeClass);
});
</script>

<InteractiveDiagram {graph} />
