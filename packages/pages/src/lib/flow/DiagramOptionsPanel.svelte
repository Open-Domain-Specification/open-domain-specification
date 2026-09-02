<script lang="ts">
import { Panel } from "@xyflow/svelte";
import {
	diagramOptions,
	type EdgeStyle,
	type HandleMode,
} from "./options.svelte";

/** Top-right controls: how edges attach and how they are drawn. */
let handles = $state<HandleMode>(diagramOptions.handles);
let edges = $state<EdgeStyle>(diagramOptions.edges);
const apply = () => diagramOptions.set({ handles, edges });
</script>

<Panel position="top-right" class="diagram-options">
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
</Panel>

<style>
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
</style>
