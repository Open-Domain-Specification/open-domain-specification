<script lang="ts">
import type { Attribute } from "@open-domain-specification/core";
import AttributeTable from "../molecules/AttributeTable.svelte";
import Section from "./Section.svelte";

/** The attributes of an entity or value object, as a section of rows. */
const { attributes, lead }: { attributes: Iterable<Attribute>; lead: string } =
	$props();

const rows = $derived([...attributes]);
</script>

<Section id="attributes" title="Attributes" {lead} count={rows.length}>
	<AttributeTable attributes={rows} empty="No attributes." />
</Section>
