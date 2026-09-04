<script lang="ts">
import type { Entity, ValueObject } from "@open-domain-specification/core";
import Heading from "../atoms/Heading.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Lockup from "../atoms/Lockup.svelte";
import Ref from "../atoms/Ref.svelte";
import { ICONS } from "../model";
import AttributeTable from "./AttributeTable.svelte";
import { kindOf } from "./element-kind";

/**
 * One entity or value object inside its aggregate, as a level-3 subsection
 * rather than v1's card: the lockup as the heading, `aggregate root` as a word
 * after the name instead of a purple glow, then the description, the attribute
 * table and the relations as rows. Subsections are told apart by the space
 * above them, not by a frame.
 */
const { element: e }: { element: Entity | ValueObject } = $props();
const isRoot = $derived("root" in e && e.root);
</script>

<div class="subsection">
	<Heading level={3} id={e.ref}>
		<Lockup kind={kindOf(e)} name={e.name} ref={e.ref} />
		{#if isRoot}<Keyword
				text="aggregate root"
				title="Every change to the aggregate enters through the root, which enforces the invariants."
			/>{/if}
	</Heading>
	{#if e.description}<p class="description">{e.description}</p>{/if}
	<AttributeTable attributes={e.attributes.values()} />
	{#if e.relations.length}
		<ul class="relations">
			{#each e.relations as r, i (`${r.relation}-${r.target.ref}-${i}`)}
				<li>
					<Keyword text={r.relation} />
					<Ref ref={r.target.ref} label={r.target.name} icon={ICONS[kindOf(r.target)]} kind={kindOf(r.target)} />
					{#if r.cardinality}<Keyword text={r.cardinality} mono />{/if}
					{#if r.label}<Keyword text={r.label} />{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.subsection {
		margin-bottom: 16px;
	}
	.description {
		margin: 0 0 4px;
		padding: 0 8px;
		max-width: 80ch;
		line-height: 1.5;
	}
	.relations {
		list-style: none;
		margin: 4px 0 0;
		padding: 0;
	}
	.relations li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 8px;
		padding: 0 8px;
		line-height: 22px;
	}
</style>
