<script lang="ts">
import { Workspace } from "@open-domain-specification/core";
import { petstoreModel } from "../fixtures";
import ModelProvider from "../ModelProvider.svelte";
import type { Model } from "../model";
import LanguageSection from "./LanguageSection.svelte";

/**
 * The glossary terms that name an element. Petstore's Pet aggregate has one;
 * `variant="two"` builds a workspace where two contexts each keep a word for
 * the same aggregate, which is the case that shows the comma; `"none"` points
 * at an element nothing in the language names.
 */
const { variant = "one" }: { variant?: "one" | "two" | "none" } = $props();

/** Two contexts, one aggregate, a word for it in each glossary. */
function sharedWord(): { model: Model; ref: string } {
	const workspace = new Workspace("Two Glossaries", {
		id: "two_glossaries",
		description: "One aggregate that two contexts each have a word for.",
		version: "0.0.1",
	});
	const catalog = workspace.addBoundedContext("Catalog BC", {
		description: "Owns the pet.",
	});
	const sales = workspace.addBoundedContext("Sales BC", {
		description: "Buys the pet.",
	});
	const pet = catalog.addAggregate("Pet", { description: "One listed pet." });
	catalog.addTerm("Pet", {
		definition: "An animal listed in the store.",
		embodiedBy: pet,
	});
	sales.addTerm("Listing", {
		definition: "What a customer orders.",
		embodiedBy: pet,
	});
	return {
		model: {
			workspace,
			fileLabel: "two-glossaries.json",
			diagnostics: workspace.validate(),
		},
		ref: pet.ref,
	};
}

const petstore = petstoreModel();
const shared = sharedWord();
const model = $derived(variant === "two" ? shared.model : petstore);
const ref = $derived(
	{
		one: "#/boundedcontexts/catalog_bc/aggregates/pet",
		two: shared.ref,
		none: "#/boundedcontexts/identity_bc/aggregates/user/entities/user",
	}[variant],
);
</script>

{#key ref}
	<ModelProvider {model}><LanguageSection target={{ ref }} /></ModelProvider>
{/key}
