<script lang="ts">
import {
	Consumable,
	DataSchema,
	Entity,
	GlossaryTerm,
	Invariant,
	Policy,
	Service,
	ValueObject,
} from "@open-domain-specification/core";
import ConsumablePage from "../../templates/ConsumablePage.svelte";
import EntityPage from "../../templates/EntityPage.svelte";
import InvariantPage from "../../templates/InvariantPage.svelte";
import PolicyPage from "../../templates/PolicyPage.svelte";
import SchemaPage from "../../templates/SchemaPage.svelte";
import ServicePage from "../../templates/ServicePage.svelte";
import TermPage from "../../templates/TermPage.svelte";
import ValueObjectPage from "../../templates/ValueObjectPage.svelte";

/**
 * The tactical page as v1 ships it, for the left column of a comparison. It
 * takes the same resolved element the v2 column draws, so the two columns can
 * never be showing different things.
 *
 * The aggregate is not here: it ships v2 now and its v1 template is gone.
 */
const { target }: { target: unknown } = $props();
</script>

{#if target instanceof Service}
	<ServicePage service={target} />
{:else if target instanceof Entity}
	<EntityPage entity={target} />
{:else if target instanceof ValueObject}
	<ValueObjectPage valueobject={target} />
{:else if target instanceof Invariant}
	<InvariantPage invariant={target} />
{:else if target instanceof DataSchema}
	<SchemaPage schema={target} />
{:else if target instanceof Policy}
	<PolicyPage policy={target} />
{:else if target instanceof GlossaryTerm}
	<TermPage term={target} />
{:else if target instanceof Consumable}
	<ConsumablePage consumable={target} />
{/if}
