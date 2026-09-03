<script lang="ts">
import { Handle, Position } from "@xyflow/svelte";

/**
 * The fixed handles of a node: a target on the left and a source on the
 * right. A handle with a `label` is a port the node itself characterises
 * (a consumable slot's pattern), drawn large with the label inside and the
 * full name as a tooltip; it stays visible when the handles float, because
 * edges still land on it. Plain handles hide when `floating`.
 */
export type Port = {
	id?: string;
	label?: string;
	title?: string;
	/** A UML interface: lollipop (provided) or socket (required); stays visible when floating. */
	shape?: "lollipop" | "socket";
};
let {
	floating = false,
	target = {},
	source = {},
}: {
	floating?: boolean;
	target?: Port | false;
	source?: Port | false;
} = $props();
const classOf = (port: Port) =>
	[
		port.label && "port-handle",
		port.shape,
		!port.label && !port.shape && floating && "handle-hidden",
	]
		.filter(Boolean)
		.join(" ");
</script>

{#snippet handle(type: "target" | "source", position: Position, port: Port)}
	<!-- The diagrams are read-only: a port only ever receives an edge Svelte Flow lays out, so it
	     must never start one. `isConnectable={false}` strips the connection-indicator class the
	     library would otherwise add, which is what puts the library's own `pointer-events: all`
	     and crosshair cursor on the handle and lets a drag begin. -->
	<Handle {type} id={port.id} {position} class={classOf(port)} title={port.title ?? port.label} isConnectable={false}>
		{#if port.label}<span class="port-label">{port.label}</span>{/if}
	</Handle>
{/snippet}

{#if target !== false}{@render handle("target", Position.Left, target)}{/if}
{#if source !== false}{@render handle("source", Position.Right, source)}{/if}
