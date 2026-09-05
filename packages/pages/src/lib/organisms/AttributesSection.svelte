<script lang="ts">
import type { Attribute } from "@open-domain-specification/core";
import AttributeTable from "../molecules/AttributeTable.svelte";
import Section from "./Section.svelte";

/**
 * The attributes of an entity or value object, as a section of rows. A kind
 * counts what it inherits in the section's count, because it has those
 * attributes as much as its own; the table says where each of them comes from.
 */
const {
	attributes,
	inherited = [],
	lead,
}: {
	attributes: Iterable<Attribute>;
	inherited?: Iterable<Attribute>;
	lead: string;
} = $props();

const rows = $derived([...attributes]);
const inheritedRows = $derived([...inherited]);
</script>

<Section
	id="attributes"
	title="Attributes"
	{lead}
	count={rows.length + inheritedRows.length}
>
	<AttributeTable attributes={rows} inherited={inheritedRows} empty="No attributes." />
</Section>
