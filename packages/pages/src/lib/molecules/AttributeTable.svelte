<script lang="ts">
import type { Attribute } from "@open-domain-specification/core";
import type { Column, Group } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Ref from "../atoms/Ref.svelte";
import { typeAlternatives } from "../type-alternatives";

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

/*
 * The width the type may take, in pixels, measured from the table itself and
 * set as `--type-cap` on the wrapper. The columns before the type (the key and
 * the name) are `nowrap`, so they take the same width however wide the type
 * is; but a column's width in a laid-out table also carries whatever the
 * others left over, so it is read with the cap removed, where the type is at
 * its narrowest and nothing is left over, and the cap is set again at once
 * (no frame between, so nothing paints and the observer sees no change). The
 * frame is the width the table has; the description's floor is its own
 * computed `min-width` (24ch in the description's font, which `ch` in the
 * type's editor font would not be). What the type may take is the frame less
 * those, less the type cell's own padding. Unmeasured (server render, no
 * observer, no table), the type is left to its narrowest, which is safe: it
 * can only stack, never overflow.
 */
/** Only this table's own frame and header cells are measured, never a table nested in one of its cells. */
const FRAME = ":scope > .frame";
const HEADERS = ":scope > .frame > table > thead > tr > th";
let host = $state<HTMLElement>();
$effect(() => {
	void rows;
	void groups;
	if (typeof ResizeObserver === "undefined") return;
	// The effect runs after mount, when the wrapper is bound.
	const element = host as HTMLElement;
	const measure = () => {
		const frame = element.querySelector<HTMLElement>(FRAME);
		if (!frame) return;
		element.style.removeProperty("--type-cap");
		const [identity, name, type, description] = [
			...element.querySelectorAll<HTMLElement>(HEADERS),
		];
		const style = getComputedStyle(type);
		const room =
			frame.clientWidth -
			identity.getBoundingClientRect().width -
			name.getBoundingClientRect().width -
			Number.parseFloat(style.paddingLeft) -
			Number.parseFloat(style.paddingRight) -
			Number.parseFloat(getComputedStyle(description).minWidth);
		element.style.setProperty("--type-cap", `${Math.max(0, room)}px`);
	};
	// The observer only schedules a measure, never makes it: a callback that
	// changes the size of what it observes leaves notifications undelivered
	// ("ResizeObserver loop completed"), while the same change made in an
	// animation frame is seen by the next observation and settles there.
	let frame = 0;
	const schedule = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(measure);
	};
	const observer = new ResizeObserver(schedule);
	observer.observe(element);
	for (const th of element.querySelectorAll(HEADERS)) observer.observe(th);
	measure();
	return () => {
		cancelAnimationFrame(frame);
		observer.disconnect();
	};
});
const columns: Column[] = [
	{ key: "identity", label: "", ariaLabel: "Kind", width: "16px" },
	{ key: "name", label: "Attribute" },
	{ key: "type", label: "Type" },
	{ key: "description", label: "Description" },
];
</script>

<div class="attributes" bind:this={host}>
<DataTable {columns} {rows} {groups} rowId={(a) => a.ref} {empty}>
	{#snippet cell(a, col)}
		{#if col.key === "identity"}
			{#if a.identity}<i class="codicon codicon-key" title="identity"></i>{/if}
		{:else if col.key === "name"}
			<code class="name">{a.name}</code>
		{:else if col.key === "type"}
			<span class="typecell">
			{#if a.valueobject}
				<code class="type"><Ref ref={a.valueobject.ref} label={a.type} /></code>
			{:else if a.schema}
				<code class="type"><Ref ref={a.schema.ref} label={a.type} /></code>
			{:else}
				<code class="type">{#each typeAlternatives(a.type) as piece, i (i)}{#if i > 0}<wbr />{/if}<span class="alternative">{piece}</span>{/each}</code>
			{/if}
			{#if a.optional}
				<Keyword text="optional" title="Sometimes absent; everything unmarked is always present." />
			{/if}
			{#if a.identifies}
				<Keyword text="identifies" />
				<code><Ref ref={a.identifies.ref} label={a.identifies.name} /></code>
			{/if}
			</span>
		{:else}
			{a.description}
		{/if}
	{/snippet}
</DataTable>
</div>

<style>
	code {
		font-family: var(--vscode-editor-font-family);
		font-size: 0.92em;
		background: none;
		padding: 0;
	}
	/* An attribute name is a code and is read whole: `merchant-category-name`
	   never breaks at its hyphens. */
	.name {
		white-space: nowrap;
	}
	/* A type is read whole. Its alternatives never break inside (`date-time`,
	   `ISO 4217 code`); a union breaks only between them, at the `<wbr>`. The
	   table gives a growing column everything the others do not need, so left
	   alone the type would sit at its narrowest and the description would keep
	   the rest. The type cell instead asks for its whole width, capped at
	   what leaves the description its floor beside the columns before it
	   (`--type-cap`, measured above), so the description gives up width first
	   and the alternatives stack only when it is at its floor. `min-width`
	   keeps the cap from cutting into an alternative. The cell holds the type
	   and what follows it (`optional`, `identifies` and its ref), so those are
	   inside the cap too. Until the cap is measured the cell is as narrow as
	   it can be. */
	.typecell {
		display: inline-block;
		vertical-align: top;
		white-space: normal;
		width: max-content;
		min-width: min-content;
		max-width: var(--type-cap, min-content);
	}
	.alternative {
		white-space: nowrap;
	}
	.codicon-key {
		font-size: 1em;
		color: var(--vscode-icon-foreground);
	}
</style>
