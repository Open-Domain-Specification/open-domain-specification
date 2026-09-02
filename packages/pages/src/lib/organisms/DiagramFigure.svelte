<script lang="ts">
import Empty from "../atoms/Empty.svelte";
import type { Graph } from "../flow/graph";
import { useModel } from "../model";
import InteractiveDiagram from "./InteractiveDiagram.svelte";

/**
 * A Graphviz figure; empty when the graph has no nodes. Clicking the SVG opens
 * it in the lightbox. With a `graph`, an interactive Svelte Flow view can be
 * toggled in its place.
 */
const {
	caption,
	dot,
	nodeCount,
	emptyText,
	graph,
	direction = "LR",
}: {
	caption: string;
	dot: string;
	nodeCount: number;
	emptyText: string;
	graph?: Graph;
	direction?: "LR" | "TB";
} = $props();
const model = useModel();
let open = $state(false);
let interactive = $state(false);
const onKey = (e: KeyboardEvent) => {
	if (e.key === "Enter" || e.key === " ") open = !open;
	if (e.key === "Escape") open = false;
};
</script>

{#if nodeCount === 0}
	<Empty text={emptyText} />
{:else if interactive && graph}
	<figure class="diagram">
		<div class="canvas"><InteractiveDiagram {graph} {direction} /></div>
		<figcaption>{caption} <button class="mode" onclick={() => (interactive = false)}>static</button></figcaption>
	</figure>
{:else}
	{#await model.renderDot(dot)}
		<p class="empty">Rendering diagram…</p>
	{:then svg}
		<figure class="diagram">
			<div class="canvas" role="button" tabindex="0" title="Open full size" onclick={() => (open = true)} onkeydown={onKey}>{@html svg}</div>
			<figcaption>{caption} {#if graph}<button class="mode" onclick={() => (interactive = true)}>interactive</button>{/if}</figcaption>
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

<style>
	.mode {
		float: right;
		font: inherit;
		font-size: 0.9em;
		color: var(--accent);
		background: none;
		border: 0;
		cursor: pointer;
		padding: 0;
	}
	.mode:hover { text-decoration: underline; }
</style>
