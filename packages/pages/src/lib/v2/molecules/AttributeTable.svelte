<script lang="ts">
import type { Attribute } from "@open-domain-specification/core";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Ref from "../Ref.svelte";

/**
 * The attributes of a schema, an entity or a value object. A 16px column
 * carries the key codicon for an identity attribute — the Outline's own mark
 * for what identifies a thing — and the name and the type are in the editor
 * font, because they are the words the code uses. The description is last so
 * it takes the width.
 */
const {
	attributes,
	empty = "No attributes.",
}: { attributes: Iterable<Attribute>; empty?: string } = $props();

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
			{#if a.valueobject}
				<code><Ref ref={a.valueobject.ref} label={a.type} /></code>
			{:else}
				<code>{a.type}</code>
			{/if}
		{:else}
			{a.description}
		{/if}
	{/snippet}
</DataTable>

<style>
	code {
		font-family: var(--vscode-editor-font-family);
		font-size: 0.92em;
		background: none;
		padding: 0;
	}
	.codicon-key {
		font-size: 1em;
		color: var(--vscode-icon-foreground);
	}
</style>
