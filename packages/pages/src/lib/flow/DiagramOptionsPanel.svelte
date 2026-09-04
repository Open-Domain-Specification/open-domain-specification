<script lang="ts">
import { Panel, useSvelteFlow } from "@xyflow/svelte";
import { untrack } from "svelte";
import Icon from "../atoms/Icon.svelte";
import type { Fullscreen } from "./fullscreen.svelte";
import { type DiagramKind, hasSketchStyle } from "./kind";
import {
	type DiagramStyle,
	diagramOptions,
	type EdgeStyle,
	type HandleMode,
} from "./options.svelte";
import { fitPastPanels, OPTIONS_PANEL_CLASS } from "./panel-fit";

/**
 * Top-right controls: how edges attach, how they are drawn, and the figure
 * style. The style select only shows for the context map: the consumable
 * and relation maps are always drawn in their UML form. The last control
 * blows the figure up to a full-viewport overlay.
 */
let {
	kind = "context",
	fullscreen,
	container,
}: {
	kind?: DiagramKind;
	fullscreen: Fullscreen;
	container?: HTMLElement;
} = $props();
// The panel sits inside Svelte Flow, so it is the piece that can refit the canvas.
const flow = useSvelteFlow();
let handles = $state<HandleMode>(
	untrack(() => diagramOptions.handlesFor(kind)),
);
let edges = $state<EdgeStyle>(diagramOptions.edges);
let style = $state<DiagramStyle>(diagramOptions.style);
const apply = () => diagramOptions.set({ handles, edges, style });
</script>

<Panel position="top-right" class={OPTIONS_PANEL_CLASS}>
	<label>
		<span>Handles</span>
		<select aria-label="Handle placement" bind:value={handles} onchange={apply}>
			<option value="fixed">Fixed handles</option>
			<option value="floating">Floating handles</option>
		</select>
	</label>
	<label>
		<span>Edges</span>
		<select aria-label="Edge style" bind:value={edges} onchange={apply}>
			<option value="bezier">Bezier</option>
			<option value="straight">Straight</option>
			<option value="step">Step</option>
			<option value="smoothstep">Smooth step</option>
		</select>
	</label>
	{#if hasSketchStyle(kind)}
		<label>
			<span>Style</span>
			<select aria-label="Diagram style" bind:value={style} onchange={apply}>
				<option value="cards">Cards</option>
				<option value="sketch">Sketch</option>
			</select>
		</label>
	{/if}
	<button
		type="button"
		class="fullscreen"
		title={fullscreen.active ? "Exit fullscreen" : "Enter fullscreen"}
		aria-label={fullscreen.active ? "Exit fullscreen" : "Enter fullscreen"}
		onclick={() => fullscreen.toggle(() => fitPastPanels(flow, container))}
	>
		<Icon name={fullscreen.active ? "screen-normal" : "screen-full"} />
	</button>
</Panel>

<style>
	/* The class is panel-fit.ts's OPTIONS_PANEL_CLASS; keep the two in step. */
	:global(.diagram-options) {
		display: flex;
		gap: 10px;
		align-items: center;
		padding: 4px 8px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-size: 11px;
		opacity: 0.85;
	}
	:global(.diagram-options:hover) {
		opacity: 1;
	}
	label {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--muted);
	}
	select {
		font: inherit;
		color: var(--fg);
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 3px;
		padding: 1px 3px;
	}
	button.fullscreen {
		display: flex;
		align-items: center;
		padding: 1px 3px;
		font: inherit;
		color: var(--fg);
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 3px;
		cursor: pointer;
	}
	button.fullscreen :global(.codicon) {
		font-size: 12px;
	}
</style>
