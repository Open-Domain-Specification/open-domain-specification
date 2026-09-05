<script lang="ts">
import type { Attribute } from "@open-domain-specification/core";
import { petstoreModel } from "../fixtures";
import AttributeTable from "./AttributeTable.svelte";

/**
 * The petstore's Pet, which is the one table that shows every mark at once: an
 * identity in the key column, types that link to their value objects, and the
 * three attributes the Swagger contract does not require marked `optional`.
 * The point of the design is the ratio — most rows say nothing, so the word
 * beside a few of them is the list of what may be missing.
 */
const pet = petstoreModel().workspace.getEntityByRefOrThrow(
	"#/boundedcontexts/catalog_bc/aggregates/pet/entities/pet",
);
const attributes: Attribute[] = [...pet.attributes.values()];
</script>

<AttributeTable {attributes} />
