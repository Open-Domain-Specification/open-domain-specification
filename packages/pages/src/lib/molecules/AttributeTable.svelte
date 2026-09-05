<script lang="ts">
import type { Attribute } from "@open-domain-specification/core";
import type { Column, Group } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Ref from "../atoms/Ref.svelte";

/**
 * The attributes of a schema, an entity or a value object. A 16px column
 * carries the key codicon for an identity attribute — the Outline's own mark
 * for what identifies a thing — and the name and the type are in the editor
 * font, because they are the words the code uses. The description is last so
 * it takes the width.
 *
 * The type links to whatever models it, the value object or the nested schema,
 * so a reader following a payload into its parts never leaves the table. An
 * attribute that holds another root's identity names that root beside the
 * type, as a ref: the id is the whole of the dependency it carries, usually
 * into another bounded context, and a reader has to be able to follow it.
 *
 * An attribute that is sometimes absent carries the `optional` keyword after
 * its type (decision 24), the design language's word for a classification
 * rather than a new mark: only the exception is written, so a column of types
 * with one word beside a few of them reads as the list of what may be missing.
 *
 * A kind's own attributes come first and what it inherits follows, under a
 * label row naming where each one comes from (decision 22). The kind has them
 * all — that is what being a kind of something means — but which ones it adds
 * is the thing a reader has come to the page for, and the origin is where
 * they go to change one.
 */
const {
	attributes,
	inherited = [],
	empty = "No attributes.",
}: {
	attributes: Iterable<Attribute>;
	/** What the owner has from whatever it is a kind of; empty for everything else. */
	inherited?: Iterable<Attribute>;
	empty?: string;
} = $props();

const rows = $derived([...attributes]);
/** One group per origin, in the order the chain of parents is walked. */
const groups = $derived.by(() => {
	const byOwner = new Map<string, Group<Attribute>>();
	for (const attribute of inherited) {
		const { owner } = attribute;
		const group = byOwner.get(owner.path) ?? {
			id: owner.path,
			label: `Inherited from ${owner.name}`,
			rows: [],
		};
		group.rows.push(attribute);
		byOwner.set(owner.path, group);
	}
	return byOwner.size
		? [{ id: "own", label: "", rows }, ...byOwner.values()]
		: undefined;
});
const columns: Column[] = [
	{ key: "identity", label: "", width: "16px" },
	{ key: "name", label: "Attribute" },
	{ key: "type", label: "Type" },
	{ key: "description", label: "Description" },
];
</script>

<DataTable {columns} {rows} {groups} rowId={(a) => a.ref} {empty}>
	{#snippet cell(a, col)}
		{#if col.key === "identity"}
			{#if a.identity}<i class="codicon codicon-key" title="identity"></i>{/if}
		{:else if col.key === "name"}
			<code>{a.name}</code>
		{:else if col.key === "type"}
			{#if a.valueobject}
				<code><Ref ref={a.valueobject.ref} label={a.type} /></code>
			{:else if a.schema}
				<code><Ref ref={a.schema.ref} label={a.type} /></code>
			{:else}
				<code>{a.type}</code>
			{/if}
			{#if a.optional}
				<Keyword text="optional" title="Sometimes absent; everything unmarked is always present." />
			{/if}
			{#if a.identifies}
				<Keyword text="identifies" />
				<code><Ref ref={a.identifies.ref} label={a.identifies.name} /></code>
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
