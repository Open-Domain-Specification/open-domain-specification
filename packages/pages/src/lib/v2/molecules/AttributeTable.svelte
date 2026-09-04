<script lang="ts">
import type { Attribute } from "@open-domain-specification/core";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Ref from "../Ref.svelte";

/**
 * The attributes of an entity, a value object or a schema, as rows. A narrow
 * first column carries the key codicon for the identity attribute, the way the
 * Outline marks one member of a symbol; name and type are in the editor font
 * because they are code; the description takes the remaining width and wraps.
 *
 * The same table serves the Attributes section, the structure subsections on
 * an aggregate page and the schema pages, so it is its own component rather
 * than markup inside the section.
 */
const {
	attributes,
	empty,
}: { attributes: Iterable<Attribute>; empty: string } = $props();

const rows = $derived([...attributes]);
const columns: Column[] = [
	{ key: "identity", label: "", width: "16px" },
	{ key: "name", label: "Attribute" },
	{ key: "type", label: "Type" },
	{ key: "description", label: "Description" },
];
</script>

<DataTable {columns} {rows} rowId={(a) => a.ref} {empty}>
	{#snippet cell(a, col)}
		{#if col.key === "identity"}
			{#if a.identity}<i class="codicon codicon-key" title="identity"></i>{/if}
		{:else if col.key === "name"}
			<code>{a.name}</code>
		{:else if col.key === "type"}
			<code>{#if a.valueobject}<Ref ref={a.valueobject.ref} label={a.type} />{:else}{a.type}{/if}</code>
		{:else}
			{a.description ?? ""}
		{/if}
	{/snippet}
</DataTable>

<style>
	/* `code` is styled by the v1 page stylesheet at 0.9em with its own family;
	   the design language sets 0.92em in the editor font. */
	code {
		font-family: var(--vscode-editor-font-family);
		font-size: 0.92em;
		background: none;
		padding: 0;
	}
	.codicon {
		font-size: 1em;
		color: var(--vscode-icon-foreground);
	}
</style>
