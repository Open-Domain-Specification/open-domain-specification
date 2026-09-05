<script lang="ts">
import type { Attribute } from "@open-domain-specification/core";
import { petstoreModel, streamlineModel } from "../fixtures";
import AttributeTable from "./AttributeTable.svelte";

/**
 * The petstore's Pet, which is the one table that shows every mark at once: an
 * identity in the key column, types that link to their value objects, and the
 * three attributes the Swagger contract does not require marked `optional`.
 * The point of the design is the ratio — most rows say nothing, so the word
 * beside a few of them is the list of what may be missing. Order's `pet_id`
 * is appended for the one mark Pet cannot show on its own: an attribute that
 * identifies another root, `Keyword` and `Ref` beside its type.
 *
 * `inherited` shows the other half of the design instead: StreamLine's Film,
 * a kind of Title, whose own one attribute leads and whose inherited ones
 * follow under a label row naming where they come from (decision 22, drawn by
 * card 59). What a kind adds is what a reader came for; the origin is where
 * they go to change the rest.
 */
const { inherited = false }: { inherited?: boolean } = $props();

const pet = () => {
	const workspace = petstoreModel().workspace;
	const petEntity = workspace.getEntityByRefOrThrow(
		"#/boundedcontexts/catalog_bc/aggregates/pet/entities/pet",
	);
	const petId = workspace
		.getEntityByRefOrThrow(
			"#/boundedcontexts/sales_bc/aggregates/order/entities/order",
		)
		.attributes.get("pet_id");
	return {
		attributes: [
			...petEntity.attributes.values(),
			...(petId ? [petId] : []),
		] as Attribute[],
		inherited: [] as Attribute[],
	};
};

const film = () => {
	const filmEntity = streamlineModel().workspace.getEntityByRefOrThrow(
		"#/boundedcontexts/catalogue/aggregates/title/entities/film",
	);
	return {
		attributes: [...filmEntity.attributes.values()],
		inherited: filmEntity.inheritedAttributes,
	};
};

const shown = $derived(inherited ? film() : pet());
</script>

<AttributeTable attributes={shown.attributes} inherited={shown.inherited} />
