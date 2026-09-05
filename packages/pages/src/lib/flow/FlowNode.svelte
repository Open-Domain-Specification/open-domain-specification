<script lang="ts">
import type { NodeProps } from "@xyflow/svelte";
import type { FlowNodeData } from "./flow-graph";
import NodeHandles from "./NodeHandles.svelte";
import NodeHead from "./NodeHead.svelte";

/**
 * One step of the reaction chain on the flow map, in the silhouette the
 * static renderer draws it in, so the same model read twice reads the same:
 * an event is a stadium (graphviz's ellipse at a density a name can live
 * in), an operation a plain box, a policy a note with its corner folded, a
 * process the folder that keeps several notes. Graphviz's pastel fills do
 * not come with them — the shape says the kind, and the kind's codicon says
 * it again in the Outline's own colour, which is all the colour the language
 * allows.
 *
 * The policy or process whose page this is takes a bolder border and a faint
 * wash: weight, not hue, because "the thing this page is about" is not a kind
 * and not a diagnostic. `floating` hides the fixed handles as on every other
 * map.
 */
let { data }: NodeProps & { data: FlowNodeData & { floating?: boolean } } =
	$props();
</script>

<div class={`flow-card flow-node ${data.step} ${data.focus ? "focus" : ""}`} title={data.description ?? data.id} data-step={data.step}>
	<NodeHandles floating={data.floating} />
	<NodeHead icon={data.icon} name={data.label} subtitle={data.groupPath} />
</div>

<style>
	.flow-node { position: relative; text-align: center; }
	.flow-node :global(.head) { justify-content: center; }
	/* An event: graphviz's ellipse, kept as a stadium so the name sits on a
	   straight run of the shape rather than being pushed out by the curve. */
	.flow-node.event { border-radius: 999px; padding: 8px 20px; }
	/* An operation: somebody does it, so it is the plain box the other UML
	   nodes on the consumable and relation maps already are. */
	.flow-node.command { border-radius: 2px; }
	/* A policy: a rule written down. The corner is cut away and the flap is
	   the shaded triangle behind the cut. */
	.flow-node.policy {
		border-radius: 2px;
		clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
	}
	.flow-node.policy::after {
		content: "";
		position: absolute;
		top: 0;
		right: 0;
		width: 12px;
		height: 12px;
		background: color-mix(in srgb, var(--fg) 22%, var(--card));
		clip-path: polygon(100% 0, 100% 100%, 0 100%);
	}
	/* A process: the folder that keeps several of those notes. The tab sits
	   over the card's own top edge, as graphviz's folder draws it, and the
	   card drops by the tab's height so the whole shape stays in the box the
	   layout gave it. */
	.flow-node.process { border-radius: 0 2px 2px 2px; margin-top: 9px; }
	.flow-node.process::before {
		content: "";
		position: absolute;
		left: -1px;
		top: -9px;
		width: 44px;
		height: 9px;
		border: 1px solid var(--border);
		border-bottom: none;
		border-radius: 2px 2px 0 0;
		background: var(--card);
	}
	/* The page's own reaction, marked by weight rather than by colour. */
	.flow-node.focus {
		border-width: 2px;
		border-color: var(--fg);
		background: color-mix(in srgb, var(--fg) 6%, var(--card));
	}
	.flow-node.focus.process::before {
		border-width: 2px;
		border-bottom: none;
		background: color-mix(in srgb, var(--fg) 6%, var(--card));
	}
</style>
