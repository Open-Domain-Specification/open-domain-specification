<script lang="ts">
import type {
	Attribute,
	BoundedContext,
} from "@open-domain-specification/core";
import { petstoreModel } from "../../fixtures";
import AttributesSection from "./AttributesSection.svelte";

/**
 * Pet's attributes, the shape every entity page shows: one identity
 * attribute, plain types and one type that is a value object and so a link.
 * `dense` adds Order's and Shipment's rows so the 22px rhythm can be judged
 * over a long table; `empty` shows what the section says with none.
 */
const { dense = false, empty = false }: { dense?: boolean; empty?: boolean } =
	$props();

const { workspace } = petstoreModel();
const entityIn = (bc: string, aggregate: string, entity: string) =>
	(workspace.boundedcontexts.get(bc) as BoundedContext).aggregates
		.get(aggregate)
		?.entities.get(entity);
const attributesOf = (bc: string, aggregate: string, entity: string) => [
	...(entityIn(bc, aggregate, entity)?.attributes.values() ?? []),
];
const attributes = $derived<Attribute[]>(
	dense
		? [
				...attributesOf("catalog_bc", "pet", "pet"),
				...attributesOf("sales_bc", "order", "order"),
				...attributesOf("fulfilment_bc", "shipment", "shipment"),
			]
		: attributesOf("catalog_bc", "pet", "pet"),
);
</script>

<AttributesSection
	attributes={empty ? [] : attributes}
	lead="An entity is known by its identity, not its attributes. Name the identity and keep the rest to what the model needs."
/>
