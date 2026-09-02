<script lang="ts">
import Empty from "../atoms/Empty.svelte";
import { useModel } from "../model";

/** A Graphviz figure; empty when the graph has no nodes. Clicking the SVG opens it in the lightbox. */
const {
	caption,
	dot,
	nodeCount,
	emptyText,
}: { caption: string; dot: string; nodeCount: number; emptyText: string } =
	$props();
const model = useModel();
let open = $state(false);
const onKey = (e: KeyboardEvent) => {
	if (e.key === "Enter" || e.key === " ") open = !open;
	if (e.key === "Escape") open = false;
};
</script>

{#if nodeCount === 0}
	<Empty text={emptyText} />
{:else}
	{#await model.svg(dot)}
		<p class="empty">Rendering diagram…</p>
	{:then svg}
		<figure class="diagram">
			<div class="canvas" role="button" tabindex="0" title="Open full size" onclick={() => (open = true)} onkeydown={onKey}>{@html svg}</div>
			<figcaption>{caption}</figcaption>
		</figure>
		{#if open}
			<div id="diagram-modal" class="modal">
				<div class="modal-backdrop" role="presentation" onclick={() => (open = false)}></div>
				<div class="modal-content">
					<button class="icon modal-close" title="Close" onclick={() => (open = false)}><i class="codicon codicon-close"></i></button>
					<div class="modal-body">{@html svg}</div>
				</div>
			</div>
		{/if}
	{:catch e}
		<p class="empty">Diagram could not be rendered: {e instanceof Error ? e.message : e}</p>
	{/await}
{/if}
