<script lang="ts">
import type { Attribute } from "@open-domain-specification/core";
import { petstoreModel } from "../fixtures";
import AttributeTable from "./AttributeTable.svelte";

/**
 * The petstore's Pet, which is the one table that shows every mark at once: an
 * identity in the key column, types that link to their value objects, and the
 * three attributes the Swagger contract does not require marked `optional`.
 * The point of the design is the ratio — most rows say nothing, so the word
 * beside a few of them is the list of what may be missing. Order's `pet_id`
 * is appended for the one mark Pet cannot show on its own: an attribute that
 * identifies another root, `Keyword` and `Ref` beside its type.
 */
const model = petstoreModel();
const pet = model.workspace.getEntityByRefOrThrow(
	"#/boundedcontexts/catalog_bc/aggregates/pet/entities/pet",
);
const petId = model.workspace
	.getEntityByRefOrThrow(
		"#/boundedcontexts/sales_bc/aggregates/order/entities/order",
	)
	.attributes.get("pet_id");
const attributes: Attribute[] = [
	...pet.attributes.values(),
	...(petId ? [petId] : []),
];
</script>

<AttributeTable {attributes} />
