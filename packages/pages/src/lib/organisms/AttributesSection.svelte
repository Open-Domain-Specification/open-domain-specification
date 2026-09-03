<script lang="ts">
import type { Attribute } from "@open-domain-specification/core";
import Empty from "../atoms/Empty.svelte";
import AttributeTable from "../molecules/AttributeTable.svelte";
import Section from "./Section.svelte";

let { attributes, lead }: { attributes: Iterable<Attribute>; lead: string } =
	$props();
const rows = $derived([...attributes]);
</script>

<Section id="attributes" title="Attributes" {lead}>
	{#if rows.length}<AttributeTable attributes={rows} />{:else}<Empty text="No attributes." />{/if}
</Section>
