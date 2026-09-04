<script lang="ts">
import type { Attribute } from "@open-domain-specification/core";
import AttributeTable from "../molecules/AttributeTable.svelte";
import Section from "./Section.svelte";

/** "Attributes": the count badge is the number of rows, the table is the shared one. */
const { attributes, lead }: { attributes: Iterable<Attribute>; lead: string } =
	$props();

const rows = $derived([...attributes]);
</script>

<Section id="attributes" title="Attributes" {lead} count={rows.length}>
	<AttributeTable attributes={rows} />
</Section>
