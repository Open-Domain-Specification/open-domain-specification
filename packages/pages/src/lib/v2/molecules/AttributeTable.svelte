<script lang="ts">
import type { Attribute } from "@open-domain-specification/core";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Ref from "../Ref.svelte";
import Code from "./Code.svelte";

/**
 * The shape of one entity, value object or schema, as a native table: a
 * narrow gutter carrying the key codicon for an identity attribute, the
 * attribute name and its type in the editor font because both are
 * identifiers, and the description last so it takes the width and wraps.
 * The same table serves the attributes section, the structure subsections
 * on an aggregate page and the payload of a consumable.
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

<DataTable {columns} {rows} {empty} rowId={(a) => a.ref}>
	{#snippet cell(a, col)}
		{#if col.key === "identity"}
			{#if a.identity}<i class="codicon codicon-key" title="identity"></i>{/if}
		{:else if col.key === "name"}
			<Code text={a.name} />
		{:else if col.key === "type"}
			<Code>{#if a.valueobject}<Ref ref={a.valueobject.ref} label={a.type} />{:else}{a.type}{/if}</Code>
		{:else}
			{a.description}
		{/if}
	{/snippet}
</DataTable>

<style>
	.codicon {
		font-size: 1em;
		color: var(--vscode-icon-foreground);
		cursor: help;
	}
</style>
